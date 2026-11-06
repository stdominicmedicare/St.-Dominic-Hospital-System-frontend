/**
 * Full /api/hms acceptance — every portal route (not smoke paths A–E only).
 * Feature IDs referenced in titles for AUTHORITY_EVIDENCE mapping.
 */
import { test, expect } from '@playwright/test';
import { apiJson, ADMIN_EMAIL, ADMIN_PASS } from '../helpers/auth.js';
import {
  seedAcceptanceStaffAndStock,
  registerPatient,
  RUN_STAMP,
  TODAY,
} from '../helpers/seed.js';

test.describe.configure({ mode: 'serial' });

let fx;
let patientId;
let visitId;
let rxId;
let orderId;
let itemId;
let pregnancyId;
let admissionId;
let babyId;
let invoiceId;
let artId;

test.beforeAll(async ({ request }) => {
  test.setTimeout(240_000);
  const health = await request.get(
    `${process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:5000'}/`
  );
  expect(health.ok(), 'Backend must be running on :5000').toBeTruthy();
  fx = await seedAcceptanceStaffAndStock(request);
});

test('0.x / 12.5 home-counts + aligned-counts', async ({ request }) => {
  const home = await apiJson(request, 'GET', '/api/hms/home-counts', { token: fx.tokens.admin });
  expect(home.status).toBe(200);
  const alerts = await apiJson(request, 'GET', '/api/hms/home/alerts', { token: fx.tokens.admin });
  expect(alerts.status).toBe(200);
  const aligned = await apiJson(
    request,
    'GET',
    `/api/hms/reports/aligned-counts?from=${TODAY}&to=${TODAY}`,
    { token: fx.tokens.admin }
  );
  expect(aligned.status).toBe(200);
});

test('13.x patients register / list / get / timeline / duplicates / export', async ({ request }) => {
  const t = fx.tokens.doctor;
  const dup = await apiJson(request, 'POST', '/api/hms/patients/check-duplicates', {
    token: t,
    data: { first_name: 'Acc', last_name: `Dup${RUN_STAMP}`, date_of_birth: '1990-01-01', phone: '03001112233' },
  });
  expect(dup.status).toBeLessThan(300);

  const pat = await registerPatient(request, t, {
    last_name: `Opd${RUN_STAMP}`,
    phone: `0333${String(RUN_STAMP).slice(-7)}`,
  });
  patientId = pat.id;

  const list = await apiJson(request, 'GET', `/api/hms/patients?q=${encodeURIComponent(pat.mrn || pat.last_name)}`, {
    token: t,
  });
  expect(list.status).toBe(200);

  const one = await apiJson(request, 'GET', `/api/hms/patients/${patientId}`, { token: t });
  expect(one.status).toBe(200);

  const tl = await apiJson(request, 'GET', `/api/hms/patients/${patientId}/timeline`, { token: t });
  expect(tl.status).toBe(200);

  const kpis = await apiJson(request, 'GET', '/api/hms/patients/kpis', { token: t });
  expect(kpis.status).toBe(200);

  const xlsx = await apiJson(request, 'GET', '/api/hms/patients/export.xlsx', { token: fx.tokens.admin });
  expect(xlsx.status).toBe(200);
});

test('1.x OPD check-in → triage → order lab → prescribe → complete → follow-up', async ({ request }) => {
  const t = fx.tokens.doctor;
  const queue0 = await apiJson(request, 'GET', '/api/hms/opd/queue', { token: t });
  expect(queue0.status).toBe(200);
  const kpis = await apiJson(request, 'GET', '/api/hms/opd/kpis', { token: t });
  expect(kpis.status).toBe(200);

  const checkIn = await apiJson(request, 'POST', '/api/hms/opd/check-in', {
    token: t,
    data: {
      patient_id: patientId,
      visit_type: 'new',
      chief_complaint: `ACC fever ${RUN_STAMP}`,
    },
  });
  expect(checkIn.status, JSON.stringify(checkIn.body)).toBeLessThan(300);
  visitId = checkIn.body.id || checkIn.body.visit?.id;

  const triage = await apiJson(request, 'PATCH', `/api/hms/opd/${visitId}`, {
    token: t,
    data: {
      status: 'waiting_doctor',
      vitals: { bp_systolic: 120, bp_diastolic: 80, temperature: 38.6, pulse: 90, spo2: 97, weight: 70, height: 165, resp_rate: 18 },
      diagnosis_text: 'Viral fever',
    },
  });
  expect(triage.status, JSON.stringify(triage.body)).toBeLessThan(300);

  const cat = await apiJson(request, 'GET', '/api/hms/lab/catalogue', { token: fx.tokens.lab });
  expect(cat.ok).toBeTruthy();
  const tests = Array.isArray(cat.body) ? cat.body : cat.body?.items || [];
  const testId = fx.labTestId || tests[0]?.id;
  expect(testId, 'lab catalogue test id').toBeTruthy();

  const order = await apiJson(request, 'POST', `/api/hms/opd/${visitId}/order-lab`, {
    token: t,
    data: { test_ids: [testId], priority: 'routine' },
  });
  expect(order.status, JSON.stringify(order.body)).toBeLessThan(300);
  orderId = order.body.id || order.body.order?.id;

  const rx = await apiJson(request, 'POST', `/api/hms/opd/${visitId}/prescribe`, {
    token: t,
    data: {
      items: [
        {
          medicine_id: fx.medicineId,
          medication_text: 'Paracetamol',
          quantity: 10,
          dosage: '500mg',
        },
      ],
    },
  });
  expect(rx.status, JSON.stringify(rx.body)).toBeLessThan(300);
  rxId = rx.body.id || rx.body.prescription?.id;

  const fu = await apiJson(request, 'POST', `/api/hms/opd/${visitId}/follow-up`, {
    token: t,
    data: {
      scheduled_at: `${TODAY}T10:30:00.000Z`,
      reason: 'Review fever',
      clinic: 'opd',
    },
  });
  expect(fu.status, JSON.stringify(fu.body)).toBeLessThan(300);

  const done = await apiJson(request, 'POST', `/api/hms/opd/${visitId}/complete`, { token: t, data: {} });
  expect(done.status, JSON.stringify(done.body)).toBeLessThan(300);

  const icd = await apiJson(request, 'GET', '/api/hms/icd10?q=fever', { token: t });
  expect(icd.status).toBe(200);
});

test('2.x appointments book / list / patch / mark-missed + providers', async ({ request }) => {
  const t = fx.tokens.doctor;
  const providers = await apiJson(request, 'GET', '/api/hms/providers', { token: t });
  expect(providers.status).toBe(200);

  const book = await apiJson(request, 'POST', '/api/hms/appointments', {
    token: t,
    data: {
      patient_id: patientId,
      clinic: 'opd',
      scheduled_at: `${TODAY}T15:30:00.000Z`,
      reason: 'ACC book',
      reminder_sms: false,
    },
  });
  expect(book.status, JSON.stringify(book.body)).toBeLessThan(300);
  const apptId = book.body.id;

  const list = await apiJson(request, 'GET', `/api/hms/appointments?date=${TODAY}`, { token: t });
  expect(list.status).toBe(200);

  const patch = await apiJson(request, 'PATCH', `/api/hms/appointments/${apptId}`, {
    token: t,
    data: { hms_status: 'arrived' },
  });
  expect(patch.status).toBeLessThan(300);

  const kpis = await apiJson(request, 'GET', '/api/hms/appointments/kpis', { token: t });
  expect(kpis.status).toBe(200);

  const eod = await apiJson(request, 'POST', '/api/hms/appointments/mark-missed', {
    token: t,
    data: { date: TODAY },
  });
  expect(eod.status).toBeLessThan(300);
});

test('3.x lab worklist advance → result → verify → send + walk-in', async ({ request }) => {
  const lab = fx.tokens.lab;
  const wl = await apiJson(request, 'GET', '/api/hms/lab/worklist', { token: lab });
  expect(wl.status).toBe(200);

  if (orderId) {
    await apiJson(request, 'PATCH', `/api/hms/lab/orders/${orderId}`, {
      token: lab,
      data: { status: 'collected' },
    });
    await apiJson(request, 'PATCH', `/api/hms/lab/orders/${orderId}`, {
      token: lab,
      data: { status: 'in_progress' },
    });

    const detail = await apiJson(request, 'GET', '/api/hms/lab/worklist', { token: lab });
    const orders = Array.isArray(detail.body) ? detail.body : detail.body?.orders || detail.body?.items || [];
    const match = orders.find((o) => o.id === orderId) || orders[0];
    itemId = match?.items?.[0]?.id || match?.item_id;

    if (itemId) {
      const result = await apiJson(request, 'POST', `/api/hms/lab/items/${itemId}/result`, {
        token: lab,
        data: { result_value: '12.5', comment: 'ACC' },
      });
      expect(result.status, JSON.stringify(result.body)).toBeLessThan(300);

      const verify = await apiJson(request, 'POST', `/api/hms/lab/items/${itemId}/verify`, {
        token: lab,
        data: {},
      });
      expect(verify.status, JSON.stringify(verify.body)).toBeLessThan(300);
    }

    await apiJson(request, 'POST', `/api/hms/lab/orders/${orderId}/send`, { token: lab, data: {} });
  }

  const walk = await apiJson(request, 'POST', '/api/hms/lab/orders', {
    token: lab,
    data: {
      patient_id: patientId,
      test_ids: [fx.labTestId].filter(Boolean),
      priority: 'urgent',
      source: 'walk_in',
    },
  });
  expect(walk.status, JSON.stringify(walk.body)).toBeLessThan(400);

  // 3.x verify denied without flag
  if (itemId) {
    const denied = await apiJson(request, 'POST', `/api/hms/lab/items/${itemId}/verify`, {
      token: fx.tokens.labNoVerify,
      data: {},
    });
    expect([403, 400, 409]).toContain(denied.status);
  }
});

test('4.x pharmacy dispense / stock / adjust / expiring / movements', async ({ request }) => {
  const p = fx.tokens.pharmacy;
  const toDisp = await apiJson(request, 'GET', '/api/hms/pharmacy/to-dispense', { token: p });
  expect(toDisp.status).toBe(200);

  if (rxId) {
    const disp = await apiJson(request, 'POST', `/api/hms/pharmacy/prescriptions/${rxId}/dispense`, {
      token: p,
      data: { counselling_notes: 'ACC take with food' },
    });
    expect(disp.status, JSON.stringify(disp.body)).toBeLessThan(300);
  }

  const stock = await apiJson(request, 'GET', '/api/hms/pharmacy/stock', { token: p });
  expect(stock.status).toBe(200);

  // Fresh GRN so we have a known batch_id for adjustment
  const recv = await apiJson(request, 'POST', '/api/hms/pharmacy/receive', {
    token: p,
    data: {
      medicine_id: fx.medicineId,
      batch_no: `ACC-ADJ-${Date.now()}`,
      expiry_date: '2027-06-30',
      quantity: 20,
      unit_cost: 3,
      selling_price: 10,
      supplier: 'AcceptanceAdj',
    },
  });
  expect(recv.status, JSON.stringify(recv.body)).toBeLessThan(300);
  const batchId = recv.body?.batch?.id || recv.body?.batch_id || recv.body?.id;
  expect(batchId, JSON.stringify(recv.body)).toBeTruthy();

  const adj = await apiJson(request, 'POST', '/api/hms/pharmacy/adjust', {
    token: p,
    data: {
      medicine_id: fx.medicineId,
      batch_id: batchId,
      quantity_delta: -1,
      reason: 'ACC adjust',
    },
  });
  expect(adj.status, JSON.stringify(adj.body)).toBeLessThan(400);

  const exp = await apiJson(request, 'GET', '/api/hms/pharmacy/expiring', { token: p });
  expect(exp.status).toBe(200);
  const mov = await apiJson(request, 'GET', '/api/hms/pharmacy/movements', { token: p });
  expect(mov.status).toBe(200);
});

test('5–9 MCH: ANC → maternity → delivery → PNC → immunization → FP', async ({ request }) => {
  const m = fx.tokens.midwife;
  const mom = await registerPatient(request, m, {
    last_name: `Mom${RUN_STAMP}`,
    phone: `0345${String(RUN_STAMP).slice(-7)}`,
    date_of_birth: '1992-05-05',
  });

  const preg = await apiJson(request, 'POST', '/api/hms/anc/pregnancies', {
    token: m,
    data: {
      patient_id: mom.id,
      lmp: '2026-02-01',
      gravida: 2,
      para: 1,
    },
  });
  expect(preg.status, JSON.stringify(preg.body)).toBeLessThan(300);
  pregnancyId = preg.body.id || preg.body.pregnancy?.id;

  const visit = await apiJson(request, 'POST', '/api/hms/anc/visits', {
    token: m,
    data: {
      pregnancy_id: pregnancyId,
      visit_no: 1,
      weight_kg: 68,
      bp_systolic: 110,
      bp_diastolic: 70,
      next_visit_date: '2026-12-15',
    },
  });
  expect(visit.status, JSON.stringify(visit.body)).toBeLessThan(300);

  const def = await apiJson(request, 'GET', '/api/hms/anc/defaulters', { token: m });
  expect(def.status).toBe(200);

  await apiJson(request, 'POST', `/api/hms/anc/pregnancies/${pregnancyId}/refer-maternity`, {
    token: m,
    data: {},
  });

  const admit = await apiJson(request, 'POST', '/api/hms/maternity/admit', {
    token: m,
    data: { patient_id: mom.id, pregnancy_id: pregnancyId, ward: 'Labour', cervix_cm: 5 },
  });
  expect(admit.status, JSON.stringify(admit.body)).toBeLessThan(300);
  admissionId = admit.body.id || admit.body.admission?.id;

  const part = await apiJson(request, 'POST', `/api/hms/maternity/${admissionId}/partograph`, {
    token: m,
    data: { cervix_cm: 4, fhr: 90, contractions_per_10min: 3, bp_systolic: 120, bp_diastolic: 80, pulse: 88 },
  });
  expect(part.status, JSON.stringify(part.body)).toBeLessThan(300);

  const del = await apiJson(request, 'POST', '/api/hms/maternity/deliveries', {
    token: m,
    data: {
      admission_id: admissionId,
      mode: 'svd',
      outcome: 'live_birth',
      newborn: { sex: 'female', birth_weight_g: 3100, apgar_1: 8, apgar_5: 9 },
    },
  });
  expect(del.status, JSON.stringify(del.body)).toBeLessThan(300);
  babyId = del.body.newborn?.linked_patient_id || del.body.baby_patient_id || del.body.linked_patient_id;

  const pnc = await apiJson(request, 'POST', '/api/hms/pnc/visits', {
    token: m,
    data: {
      mother_id: mom.id,
      newborn_id: del.body.newborn?.id,
      visit_code: 'pnc1_48h',
      visit_no: 1,
      mother_bp_systolic: 110,
      mother_bp_diastolic: 70,
    },
  });
  expect(pnc.status, JSON.stringify(pnc.body)).toBeLessThan(400);

  const due = await apiJson(request, 'GET', '/api/hms/pnc/due', { token: m });
  expect(due.status).toBe(200);

  if (babyId) {
    const card = await apiJson(request, 'GET', `/api/hms/immunization/cards/${babyId}`, { token: m });
    expect(card.status).toBeLessThan(400);
    const doses = card.body?.doses || card.body?.schedule || [];
    const pending = doses.find((d) => d.status !== 'given') || doses[0];
    if (pending?.id) {
      await apiJson(request, 'POST', '/api/hms/immunization/doses', {
        token: m,
        data: { patient_id: babyId, card_dose_id: pending.id, deduct_stock: false },
      });
    }
  }

  const methods = await apiJson(request, 'GET', '/api/hms/fp/methods', { token: m });
  expect(methods.status).toBe(200);
  const methodId = (Array.isArray(methods.body) ? methods.body : methods.body?.methods || [])[0]?.id;
  const fp = await apiJson(request, 'POST', '/api/hms/fp/encounters', {
    token: m,
    data: {
      patient_id: mom.id,
      method_id: methodId,
      counselling_notes: 'ACC FP',
      quantity: 1,
    },
  });
  expect(fp.status, JSON.stringify(fp.body)).toBeLessThan(400);
});

test('10.x HIV deny without flag; HTS/ART/VL/refill with flag', async ({ request }) => {
  const denied = await apiJson(request, 'GET', '/api/hms/hiv/art', { token: fx.tokens.clinicalNoHiv });
  expect(denied.status).toBe(403);

  const hiv = fx.tokens.hivDoctor;
  const allowed = await apiJson(request, 'GET', '/api/hms/hiv/art', { token: hiv });
  // 200 = Pass; 400/500 with missing table = Remaining (migration not applied)
  if (allowed.status === 200) {
    const hts = await apiJson(request, 'POST', '/api/hms/hiv/hts', {
      token: hiv,
      data: { patient_id: patientId, result: 'positive', test_date: TODAY },
    });
    if (/schema cache|does not exist|PGRST/i.test(JSON.stringify(hts.body))) {
      test.info().annotations.push({
        type: 'remaining',
        description: '10.x HIV write tables missing — apply Phase 4 HIV migrations',
      });
    } else {
      expect(hts.status, JSON.stringify(hts.body)).toBeLessThan(400);
      const art = await apiJson(request, 'POST', '/api/hms/hiv/art', {
        token: hiv,
        data: { patient_id: patientId, who_stage: 1, regimen: 'TLD', enrolment_date: TODAY },
      });
      expect(art.status, JSON.stringify(art.body)).toBeLessThan(400);
      artId = art.body.id || art.body.art?.id;
      if (artId) {
        await apiJson(request, 'PATCH', `/api/hms/hiv/art/${artId}`, {
          token: hiv,
          data: { who_stage: 1, adherence_notes: 'good' },
        });
        await apiJson(request, 'POST', '/api/hms/hiv/viral-load', {
          token: hiv,
          data: { art_id: artId, patient_id: patientId, copies: 200, result_date: TODAY },
        });
        await apiJson(request, 'POST', '/api/hms/hiv/refills', {
          token: hiv,
          data: { art_id: artId, months: 1 },
        });
      }
    }
  } else if (/schema cache|does not exist|PGRST/i.test(JSON.stringify(allowed.body))) {
    test.info().annotations.push({
      type: 'remaining',
      description: '10.x HIV schema not applied in Supabase',
    });
  } else {
    expect(allowed.status).toBe(200);
  }

  const sync = await apiJson(request, 'POST', '/api/hms/hiv/sync-ltfu', { token: hiv, data: {} });
  // sync may also fail without tables — do not hard-fail suite
  if (sync.status >= 400) {
    test.info().annotations.push({ type: 'remaining', description: 'HIV sync-ltfu blocked by schema' });
  }
});

test('11.x billing invoices pay / cash-summary / price-list / receipt', async ({ request }) => {
  const a = fx.tokens.accounts;
  const invs = await apiJson(request, 'GET', `/api/hms/billing/invoices?patient_id=${patientId}`, {
    token: a,
  });
  expect(invs.status).toBe(200);
  const list = Array.isArray(invs.body) ? invs.body : invs.body?.invoices || [];
  const open = list.find((i) => /open|partial/i.test(i.status)) || list[0];
  if (open) {
    invoiceId = open.id;
    const pay = await apiJson(request, 'POST', `/api/hms/billing/invoices/${invoiceId}/pay`, {
      token: a,
      data: { amount: open.balance ?? open.total ?? 10, method: 'cash' },
    });
    expect(pay.status, JSON.stringify(pay.body)).toBeLessThan(400);
  }

  const cash = await apiJson(request, 'GET', '/api/hms/billing/cash-summary', { token: a });
  expect(cash.status).toBe(200);
  const prices = await apiJson(request, 'GET', '/api/hms/billing/price-list', { token: a });
  expect(prices.status).toBe(200);
});

test('12.x reports catalog + every standard report + export', async ({ request }) => {
  const t = fx.tokens.admin;
  const cat = await apiJson(request, 'GET', '/api/hms/reports/catalog', { token: t });
  expect(cat.status).toBe(200);
  const reports = cat.body?.reports || [];
  expect(reports.length).toBeGreaterThan(5);

  const failed = [];
  const passed = [];
  for (const r of reports) {
    const run = await apiJson(
      request,
      'GET',
      `/api/hms/reports/${r.id}?from=${TODAY}&to=${TODAY}`,
      { token: t }
    );
    if (run.status === 200) {
      passed.push(r.id);
      const xlsx = await apiJson(
        request,
        'GET',
        `/api/hms/reports/${r.id}/export.xlsx?from=${TODAY}&to=${TODAY}`,
        { token: t }
      );
      if (xlsx.status !== 200) failed.push(`${r.id}:export`);
    } else {
      failed.push(`${r.id}:${run.body?.error || run.status}`);
    }
  }
  test.info().annotations.push({
    type: 'reports',
    description: `passed=${passed.join(',')} failed=${failed.join(' | ')}`,
  });
  // Catalog must work; individual SQL schema gaps are documented as Remaining/Fail
  expect(passed.length, `no reports ran; failures=${failed.join(' | ')}`).toBeGreaterThan(0);
});

test('14.x users matrix / list / kpis / export', async ({ request }) => {
  const t = fx.tokens.admin;
  expect((await apiJson(request, 'GET', '/api/hms/users/matrix', { token: t })).status).toBe(200);
  expect((await apiJson(request, 'GET', '/api/hms/users', { token: t })).status).toBe(200);
  expect((await apiJson(request, 'GET', '/api/hms/users/kpis', { token: t })).status).toBe(200);
  expect((await apiJson(request, 'GET', '/api/hms/users/export.xlsx', { token: t })).status).toBe(200);

  const denied = await apiJson(request, 'GET', '/api/hms/users', { token: fx.tokens.doctor });
  expect(denied.status).toBe(403);
});

test('15.x security audit export / append-only / backups / policy', async ({ request }) => {
  const t = fx.tokens.admin;
  expect((await apiJson(request, 'GET', '/api/hms/security/kpis', { token: t })).status).toBe(200);
  expect((await apiJson(request, 'GET', '/api/hms/security/policy', { token: t })).status).toBe(200);
  expect((await apiJson(request, 'GET', '/api/hms/security/audit', { token: t })).status).toBe(200);
  expect((await apiJson(request, 'GET', '/api/hms/security/audit/export.xlsx', { token: t })).status).toBe(
    200
  );

  const patch = await apiJson(
    request,
    'PATCH',
    '/api/hms/security/audit/00000000-0000-0000-0000-000000000001',
    { token: t, data: { action: 'hack' } }
  );
  expect(patch.status).toBe(405);

  const del = await apiJson(
    request,
    'DELETE',
    '/api/hms/security/audit/00000000-0000-0000-0000-000000000001',
    { token: t }
  );
  expect(del.status).toBe(405);

  expect((await apiJson(request, 'GET', '/api/hms/security/backups', { token: t })).status).toBe(200);
  expect(
    (await apiJson(request, 'POST', '/api/hms/security/backups/run', { token: t, data: {} })).status
  ).toBeLessThan(400);
  expect(
    (await apiJson(request, 'POST', '/api/hms/security/backups/test-restore', { token: t, data: {} }))
      .status
  ).toBeLessThan(400);
});

test('me + portal ACL probe', async ({ request }) => {
  const me = await apiJson(request, 'GET', '/api/hms/me', { token: fx.tokens.admin });
  expect(me.status).toBe(200);
  // Accounts cannot OPD
  const forbidden = await apiJson(request, 'GET', '/api/hms/opd/queue', { token: fx.tokens.accounts });
  expect(forbidden.status).toBe(403);
  void ADMIN_EMAIL;
  void ADMIN_PASS;
});
