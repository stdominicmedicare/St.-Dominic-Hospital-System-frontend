import { test, expect } from '@playwright/test';
import { supabaseLogin, apiJson, API_URL } from './helpers/auth.js';

test.describe.configure({ mode: 'serial' });

let token;
let patientId;
let opdVisitId;
let invoiceId;
let pregnancyId;
let admissionId;
let labOrderId;
let labItemId;
let vaccineId;
let methodId;
let hivEnrollmentId;

test.beforeAll(async () => {
  const auth = await supabaseLogin();
  token = auth.accessToken;
});

test('API health root', async ({ request }) => {
  const res = await request.get(`${API_URL}/`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.status).toBe('ok');
});

test('Admin can load /api/auth/me', async ({ request }) => {
  const { status, body } = await apiJson(request, 'GET', '/api/auth/me', { token });
  expect(status).toBe(200);
  expect(body.role || body.profile?.role).toBeTruthy();
});

test('Find or use a patient for JIMs flows', async ({ request }) => {
  const { status, body } = await apiJson(request, 'GET', '/api/records/search?q=a', { token });
  expect(status).toBe(200);
  const list = Array.isArray(body) ? body : body.patients || body.results || [];
  if (list.length) {
    patientId = list[0].id;
  }
  if (!patientId) {
    // Fallback: create patient via register if allowed
    const reg = await apiJson(request, 'POST', '/api/records/register', {
      token,
      data: {
        email: `pw-jims-${Date.now()}@example.test`,
        full_name: 'Playwright JIMS Patient',
        phone: '03001234567',
        date_of_birth: '1990-01-15',
        data_consent: true,
        password: 'TestPatient@123!',
      },
    });
    if (reg.status === 201 || reg.status === 200) {
      patientId = reg.body.id || reg.body.patient?.id || reg.body.profile?.id;
    }
  }
  expect(patientId, 'Need a patient UUID for module tests').toBeTruthy();
});

test('OPD: create visit, list, triage, complete', async ({ request }) => {
  test.skip(!patientId, 'No patient');
  const create = await apiJson(request, 'POST', '/api/opd/visits', {
    token,
    data: {
      patient_id: patientId,
      chief_complaint: 'Playwright fever',
      triage_level: 'medium',
      vitals: { bp: '120/80', temp: '37.2' },
    },
  });
  expect(create.status, JSON.stringify(create.body)).toBe(201);
  opdVisitId = create.body.id;
  expect(create.body.token_no).toBeGreaterThan(0);

  const list = await apiJson(request, 'GET', '/api/opd/visits', { token });
  expect(list.status).toBe(200);
  expect(Array.isArray(list.body)).toBeTruthy();
  expect(list.body.some((v) => v.id === opdVisitId)).toBeTruthy();

  const triage = await apiJson(request, 'PATCH', `/api/opd/visits/${opdVisitId}`, {
    token,
    data: { status: 'triaged', triage_level: 'high' },
  });
  expect(triage.status).toBe(200);
  expect(triage.body.status).toBe('triaged');

  await apiJson(request, 'PATCH', `/api/opd/visits/${opdVisitId}`, {
    token,
    data: { status: 'in_consult' },
  });
  const done = await apiJson(request, 'PATCH', `/api/opd/visits/${opdVisitId}`, {
    token,
    data: { status: 'completed' },
  });
  expect(done.status).toBe(200);
  expect(done.body.status).toBe('completed');
});

test('Follow-ups: create and list overdue', async ({ request }) => {
  test.skip(!patientId, 'No patient');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const due = yesterday.toISOString().slice(0, 10);
  const create = await apiJson(request, 'POST', '/api/opd/follow-ups', {
    token,
    data: { patient_id: patientId, due_date: due, reason: 'Playwright FU' },
  });
  expect(create.status, JSON.stringify(create.body)).toBe(201);

  const list = await apiJson(request, 'GET', '/api/opd/follow-ups?overdue=true', { token });
  expect(list.status).toBe(200);
  expect(Array.isArray(list.body)).toBeTruthy();
});

test('Billing: charge items, invoice, payment, revenue', async ({ request }) => {
  test.skip(!patientId, 'No patient');
  const items = await apiJson(request, 'GET', '/api/billing/charge-items', { token });
  expect(items.status, JSON.stringify(items.body)).toBe(200);
  expect(items.body.length).toBeGreaterThan(0);
  const item = items.body[0];

  const inv = await apiJson(request, 'POST', '/api/billing/invoices', {
    token,
    data: {
      patient_id: patientId,
      opd_visit_id: opdVisitId || null,
      lines: [
        {
          charge_item_id: item.id,
          description: item.name,
          quantity: 1,
          unit_price: item.unit_price,
        },
      ],
    },
  });
  expect(inv.status, JSON.stringify(inv.body)).toBe(201);
  invoiceId = inv.body.id;
  expect(inv.body.invoice_no).toMatch(/^INV-/);

  const pay = await apiJson(request, 'POST', `/api/billing/invoices/${invoiceId}/payments`, {
    token,
    data: { amount: inv.body.total || item.unit_price, method: 'cash' },
  });
  expect(pay.status, JSON.stringify(pay.body)).toBe(201);
  expect(pay.body.payment.receipt_no).toMatch(/^RCP-/);

  const rev = await apiJson(request, 'GET', '/api/billing/revenue', { token });
  expect(rev.status).toBe(200);
  expect(rev.body.summary.payment_count).toBeGreaterThan(0);
});

test('MCH: pregnancy, ANC visit, admission, delivery, PNC', async ({ request }) => {
  test.skip(!patientId, 'No patient');
  const preg = await apiJson(request, 'POST', '/api/mch/pregnancies', {
    token,
    data: {
      patient_id: patientId,
      lmp: '2026-01-01',
      edd: '2026-10-08',
      gravida: 1,
      para: 0,
    },
  });
  expect(preg.status, JSON.stringify(preg.body)).toBe(201);
  pregnancyId = preg.body.id;

  const anc = await apiJson(request, 'POST', '/api/mch/anc-visits', {
    token,
    data: {
      pregnancy_id: pregnancyId,
      visit_no: 1,
      weight_kg: 62,
      bp_systolic: 110,
      bp_diastolic: 70,
      next_visit_date: '2026-04-01',
    },
  });
  expect(anc.status, JSON.stringify(anc.body)).toBe(201);

  const adm = await apiJson(request, 'POST', '/api/mch/admissions', {
    token,
    data: { patient_id: patientId, pregnancy_id: pregnancyId, ward: 'Labour-1' },
  });
  expect(adm.status, JSON.stringify(adm.body)).toBe(201);
  admissionId = adm.body.id;

  const del = await apiJson(request, 'POST', '/api/mch/deliveries', {
    token,
    data: {
      admission_id: admissionId,
      mode: 'svd',
      outcome: 'live_birth',
      newborn: { sex: 'female', birth_weight_g: 3200, apgar_1: 8, apgar_5: 9 },
    },
  });
  expect(del.status, JSON.stringify(del.body)).toBe(201);
  expect(del.body.delivery).toBeTruthy();

  const pnc = await apiJson(request, 'POST', '/api/mch/pnc-visits', {
    token,
    data: {
      mother_id: patientId,
      mother_status: 'stable',
      baby_status: 'feeding well',
      visit_no: 1,
    },
  });
  expect(pnc.status, JSON.stringify(pnc.body)).toBe(201);

  const due = await apiJson(request, 'GET', '/api/mch/due', { token });
  expect(due.status).toBe(200);
  expect(due.body).toHaveProperty('anc_due');
  expect(due.body).toHaveProperty('in_labour');
});

test('Lab: tests, order, collect, result', async ({ request }) => {
  test.skip(!patientId, 'No patient');
  const tests = await apiJson(request, 'GET', '/api/lab/tests', { token });
  expect(tests.status, JSON.stringify(tests.body)).toBe(200);
  expect(tests.body.length).toBeGreaterThan(0);
  const testIds = tests.body.slice(0, 2).map((t) => t.id);

  const order = await apiJson(request, 'POST', '/api/lab/orders', {
    token,
    data: { patient_id: patientId, test_ids: testIds, priority: 'routine' },
  });
  expect(order.status, JSON.stringify(order.body)).toBe(201);
  labOrderId = order.body.id;

  const work = await apiJson(request, 'GET', '/api/lab/worklist', { token });
  expect(work.status).toBe(200);

  await apiJson(request, 'PATCH', `/api/lab/orders/${labOrderId}`, {
    token,
    data: { status: 'collected' },
  });

  const detail = await apiJson(request, 'GET', `/api/lab/orders/${labOrderId}`, { token });
  expect(detail.status).toBe(200);
  expect(detail.body.items?.length).toBeGreaterThan(0);
  labItemId = detail.body.items[0].id;

  const result = await apiJson(request, 'POST', `/api/lab/items/${labItemId}/result`, {
    token,
    data: { value: '12.5', unit: 'g/dL', verify: true },
  });
  expect(result.status, JSON.stringify(result.body)).toBe(200);
});

test('Programs: immunization + FP + HIV', async ({ request }) => {
  test.skip(!patientId, 'No patient');
  const vaccines = await apiJson(request, 'GET', '/api/programs/vaccines', { token });
  expect(vaccines.status, JSON.stringify(vaccines.body)).toBe(200);
  vaccineId = vaccines.body[0]?.id;
  expect(vaccineId).toBeTruthy();

  const imm = await apiJson(request, 'POST', '/api/programs/immunizations', {
    token,
    data: {
      patient_id: patientId,
      vaccine_id: vaccineId,
      dose_no: 1,
      next_due: '2026-12-01',
    },
  });
  expect(imm.status, JSON.stringify(imm.body)).toBe(201);

  const methods = await apiJson(request, 'GET', '/api/programs/fp/methods', { token });
  expect(methods.status).toBe(200);
  methodId = methods.body[0]?.id;

  const fp = await apiJson(request, 'POST', '/api/programs/fp/encounters', {
    token,
    data: {
      patient_id: patientId,
      method_id: methodId,
      counseling_notes: 'Playwright FP counseling',
    },
  });
  expect(fp.status, JSON.stringify(fp.body)).toBe(201);

  const enr = await apiJson(request, 'POST', '/api/programs/hiv/enrollments', {
    token,
    data: { patient_id: patientId, art_started: false },
  });
  // Unique patient_id — may already be enrolled
  expect([201, 500]).toContain(enr.status);
  if (enr.status === 201) {
    hivEnrollmentId = enr.body.id;
  } else {
    const list = await apiJson(request, 'GET', '/api/programs/hiv/enrollments', { token });
    expect(list.status).toBe(200);
    const existing = (list.body || []).find((e) => e.patient_id === patientId);
    hivEnrollmentId = existing?.id;
  }
  expect(hivEnrollmentId).toBeTruthy();

  const visit = await apiJson(request, 'POST', '/api/programs/hiv/visits', {
    token,
    data: { enrollment_id: hivEnrollmentId, who_stage: 1, weight_kg: 60 },
  });
  expect(visit.status, JSON.stringify(visit.body)).toBe(201);

  const lab = await apiJson(request, 'POST', '/api/programs/hiv/labs', {
    token,
    data: { enrollment_id: hivEnrollmentId, cd4: 450, viral_load: 200 },
  });
  expect(lab.status, JSON.stringify(lab.body)).toBe(201);
});

test('Reports catalog includes JIMs types', async ({ request }) => {
  const catalog = await apiJson(request, 'GET', '/api/reports', { token });
  expect(catalog.status, JSON.stringify(catalog.body)).toBe(200);
  const ids = (catalog.body.reports || []).map((r) => r.id);
  for (const id of [
    'patient_census',
    'visit_logs',
    'revenue',
    'anc_attendance',
    'deliveries',
    'immunization_coverage',
    'hiv_cascade',
  ]) {
    expect(ids, `missing report ${id}`).toContain(id);
  }

  for (const type of ['revenue', 'anc_attendance', 'deliveries', 'immunization_coverage', 'hiv_cascade']) {
    const rep = await apiJson(request, 'GET', `/api/reports/${type}?format=json`, { token });
    expect(rep.status, `${type}: ${JSON.stringify(rep.body)}`).toBe(200);
  }
});

test('Admin dashboard KPIs include JIMs fields', async ({ request }) => {
  const { status, body } = await apiJson(request, 'GET', '/api/admin/dashboard', { token });
  expect(status).toBe(200);
  expect(body).toHaveProperty('opdToday');
  expect(body).toHaveProperty('openInvoices');
  expect(body).toHaveProperty('pendingLabOrders');
  expect(body).toHaveProperty('inLabour');
  expect(body).toHaveProperty('deliveriesThisMonth');
});
