/**
 * Phase 7 high-value HMS smoke (API) — mirrors backend/scripts/phase7-smoke.js paths.
 * Run: npx playwright test e2e/phase7-hms-smoke.spec.js
 */
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import {
  supabaseLogin,
  apiJson,
  API_URL,
  ADMIN_EMAIL,
  ADMIN_PASS,
  SUPABASE_URL,
  SUPABASE_ANON,
} from './helpers/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function loadEnv(p) {
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
loadEnv(path.resolve(__dirname, '../../backend/.env'));

const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stamp = Date.now();
const today = new Date().toISOString().slice(0, 10);

test.describe.configure({ mode: 'serial' });

async function ensureStaff({ email, password, fullName, role, flags = {} }) {
  const admin = createClient(SUPABASE_URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let user = (list.data?.users || []).find((u) => u.email === email);
  if (!user) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });
    expect(created.error, created.error?.message).toBeFalsy();
    user = created.data.user;
  }
  await admin.from('profiles').upsert({
    id: user.id,
    email,
    full_name: fullName,
    role,
    is_active: true,
    can_access_hiv: Boolean(flags.can_access_hiv),
    can_verify_lab: Boolean(flags.can_verify_lab),
    can_give_discounts: Boolean(flags.can_give_discounts),
    can_export_reports: Boolean(flags.can_export_reports),
    password_changed_at: new Date().toISOString(),
  });
  return { email, password };
}

let doctor;
let midwife;
let labUser;
let pharm;
let accounts;
let doctorTok;
let midwifeTok;
let labTok;
let pharmTok;
let accountsTok;
let adminTok;
let medicineId;
let patientId;
let visitId;
let rxId;
let babyId;

test.beforeAll(async () => {
  test.setTimeout(180_000);
  expect(SERVICE, 'SUPABASE_SERVICE_ROLE_KEY').toBeTruthy();
  doctor = await ensureStaff({
    email: 'pw-doctor@memon1.local',
    password: 'TestDoctor@123!',
    fullName: 'QA Doctor',
    role: 'Doctor',
  });
  midwife = await ensureStaff({
    email: 'pw-midwife@memon1.local',
    password: 'TestMidwife@123!',
    fullName: 'QA Midwife',
    role: 'Midwife',
  });
  labUser = await ensureStaff({
    email: 'pw-lab@memon1.local',
    password: 'TestLab@123!',
    fullName: 'QA Lab',
    role: 'Laboratory',
    flags: { can_verify_lab: true },
  });
  pharm = await ensureStaff({
    email: 'pw-pharm@memon1.local',
    password: 'TestPharm@123!',
    fullName: 'QA Pharm',
    role: 'Pharmacy',
  });
  accounts = await ensureStaff({
    email: 'pw-accounts@memon1.local',
    password: 'TestAccounts@123!',
    fullName: 'QA Accounts',
    role: 'Accounts',
  });
  await ensureStaff({
    email: 'pw-clinical-nohiv@memon1.local',
    password: 'TestClinical@123!',
    fullName: 'QA NoHIV',
    role: 'Doctor',
  });
  await ensureStaff({
    email: 'pw-hiv-doctor@memon1.local',
    password: 'TestHivDoc@123!',
    fullName: 'QA HIV',
    role: 'Doctor',
    flags: { can_access_hiv: true },
  });

  adminTok = (await supabaseLogin(ADMIN_EMAIL, ADMIN_PASS)).accessToken;
  doctorTok = (await supabaseLogin(doctor.email, doctor.password)).accessToken;
  midwifeTok = (await supabaseLogin(midwife.email, midwife.password)).accessToken;
  labTok = (await supabaseLogin(labUser.email, labUser.password)).accessToken;
  pharmTok = (await supabaseLogin(pharm.email, pharm.password)).accessToken;
  accountsTok = (await supabaseLogin(accounts.email, accounts.password)).accessToken;
});

test('API health', async ({ request }) => {
  const res = await request.get(`${API_URL}/`);
  expect(res.ok()).toBeTruthy();
});

test('Path A: register → OPD → lab → pharmacy → pay', async ({ request }) => {
  test.setTimeout(120_000);
  const admin = createClient(SUPABASE_URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let { data: meds } = await admin.from('medicines').select('id,name').limit(1);
  if (!meds?.length) {
    const ins = await admin
      .from('medicines')
      .insert({
        name: 'Paracetamol 500mg',
        category: 'Analgesic',
        unit: 'Tablets',
        stock_quantity: 0,
        price_per_unit: 5,
        selling_price: 10,
        low_stock_threshold: 20,
        reorder_level: 20,
      })
      .select('id,name')
      .single();
    meds = [ins.data];
  }
  medicineId = meds[0].id;

  const recv = await apiJson(request, 'POST', '/api/hms/pharmacy/receive', {
    token: pharmTok,
    data: {
      medicine_id: medicineId,
      batch_no: `PW7-${stamp}`,
      expiry_date: '2027-12-31',
      quantity: 100,
      unit_cost: 3,
      selling_price: 10,
      supplier: 'PW7',
    },
  });
  expect(recv.status, JSON.stringify(recv.body)).toBeLessThan(300);

  const reg = await apiJson(request, 'POST', '/api/hms/patients/register', {
    token: doctorTok,
    data: {
      first_name: 'PW7',
      last_name: `Pat${stamp}`,
      sex: 'female',
      date_of_birth: '1994-01-01',
      phone: `0321${String(stamp).slice(-7)}`,
      data_consent: true,
    },
  });
  expect(reg.status, JSON.stringify(reg.body)).toBe(201);
  patientId = reg.body.id;

  const checkIn = await apiJson(request, 'POST', '/api/hms/opd/check-in', {
    token: doctorTok,
    data: { patient_id: patientId, visit_type: 'new', chief_complaint: 'PW7 fever' },
  });
  expect(checkIn.status, JSON.stringify(checkIn.body)).toBe(201);
  visitId = checkIn.body.id;

  const cat = await apiJson(request, 'GET', '/api/hms/lab/catalogue', { token: labTok });
  const testId = cat.body?.[0]?.id;
  expect(testId).toBeTruthy();

  const order = await apiJson(request, 'POST', `/api/hms/opd/${visitId}/order-lab`, {
    token: doctorTok,
    data: { test_ids: [testId], priority: 'routine' },
  });
  expect(order.status, JSON.stringify(order.body)).toBe(201);
  const itemId = order.body.items?.[0]?.id;
  expect(itemId).toBeTruthy();

  await apiJson(request, 'PATCH', `/api/hms/lab/orders/${order.body.id}`, {
    token: labTok,
    data: { status: 'sample_collected' },
  });
  await apiJson(request, 'PATCH', `/api/hms/lab/orders/${order.body.id}`, {
    token: labTok,
    data: { status: 'in_progress' },
  });
  const result = await apiJson(request, 'POST', `/api/hms/lab/items/${itemId}/result`, {
    token: labTok,
    data: { value: '90', unit: 'mg/dL' },
  });
  expect(result.ok, JSON.stringify(result.body)).toBeTruthy();
  const verify = await apiJson(request, 'POST', `/api/hms/lab/items/${itemId}/verify`, {
    token: labTok,
    data: {},
  });
  expect(verify.ok, JSON.stringify(verify.body)).toBeTruthy();

  const rx = await apiJson(request, 'POST', `/api/hms/opd/${visitId}/prescribe`, {
    token: doctorTok,
    data: {
      items: [{ medicine_id: medicineId, medication_text: 'Paracetamol', quantity: 5, dosage: '500mg' }],
    },
  });
  expect(rx.status, JSON.stringify(rx.body)).toBe(201);
  rxId = rx.body.id;

  const done = await apiJson(request, 'POST', `/api/hms/opd/${visitId}/complete`, {
    token: doctorTok,
    data: {},
  });
  expect(done.ok, JSON.stringify(done.body)).toBeTruthy();

  const disp = await apiJson(request, 'POST', `/api/hms/pharmacy/prescriptions/${rxId}/dispense`, {
    token: pharmTok,
    data: {},
  });
  expect(disp.ok, JSON.stringify(disp.body)).toBeTruthy();

  const invoices = await apiJson(request, 'GET', `/api/hms/billing/invoices?patient_id=${patientId}`, {
    token: accountsTok,
  });
  const list = Array.isArray(invoices.body) ? invoices.body : invoices.body?.invoices || [];
  const inv = list[0];
  expect(inv?.id, JSON.stringify(invoices.body)).toBeTruthy();
  const bal =
    inv.balance_due != null
      ? Number(inv.balance_due)
      : Number(inv.total || 0) - Number(inv.amount_paid || 0);
  const pay = await apiJson(request, 'POST', `/api/hms/billing/invoices/${inv.id}/pay`, {
    token: accountsTok,
    data: { amount: bal > 0 ? bal : Number(inv.total) || 50, method: 'cash' },
  });
  expect([200, 201]).toContain(pay.status);
});

test('Path B: ANC → delivery → PNC → immunization', async ({ request }) => {
  test.setTimeout(120_000);
  const mom = await apiJson(request, 'POST', '/api/hms/patients/register', {
    token: midwifeTok,
    data: {
      first_name: 'PW7Mom',
      last_name: `M${stamp}`,
      sex: 'female',
      date_of_birth: '1997-05-05',
      phone: `0333${String(stamp).slice(-7)}`,
      data_consent: true,
    },
  });
  expect(mom.status, JSON.stringify(mom.body)).toBe(201);

  const preg = await apiJson(request, 'POST', '/api/hms/anc/pregnancies', {
    token: midwifeTok,
    data: { patient_id: mom.body.id, lmp: '2026-02-01', gravida: 1, para: 0 },
  });
  expect(preg.status, JSON.stringify(preg.body)).toBe(201);

  await apiJson(request, 'POST', '/api/hms/anc/visits', {
    token: midwifeTok,
    data: {
      pregnancy_id: preg.body.id,
      visit_no: 1,
      bp_systolic: 120,
      bp_diastolic: 80,
      next_visit_date: '2026-12-15',
    },
  });

  const admit = await apiJson(request, 'POST', '/api/hms/maternity/admit', {
    token: midwifeTok,
    data: { patient_id: mom.body.id, pregnancy_id: preg.body.id, ward: 'Labour', cervix_cm: 5 },
  });
  expect(admit.status, JSON.stringify(admit.body)).toBe(201);

  const del = await apiJson(request, 'POST', '/api/hms/maternity/deliveries', {
    token: midwifeTok,
    data: {
      admission_id: admit.body.id,
      mode: 'svd',
      outcome: 'live_birth',
      newborn: { sex: 'male', birth_weight_g: 3000, apgar_1: 8, apgar_5: 9 },
    },
  });
  expect(del.status, JSON.stringify(del.body)).toBe(201);
  babyId = del.body.newborn?.linked_patient_id;
  expect(babyId).toBeTruthy();

  const pnc = await apiJson(request, 'POST', '/api/hms/pnc/visits', {
    token: midwifeTok,
    data: {
      mother_id: mom.body.id,
      newborn_id: del.body.newborn?.id,
      visit_code: 'pnc1_48h',
      visit_no: 1,
      mother_bp_systolic: 110,
      mother_bp_diastolic: 70,
    },
  });
  expect([200, 201]).toContain(pnc.status);

  const card = await apiJson(request, 'GET', `/api/hms/immunization/cards/${babyId}`, {
    token: midwifeTok,
  });
  expect(card.ok).toBeTruthy();
  const doses = card.body?.doses || card.body?.card || (Array.isArray(card.body) ? card.body : []);
  const due = doses?.[0];
  if (due?.id) {
    const dose = await apiJson(request, 'POST', '/api/hms/immunization/doses', {
      token: midwifeTok,
      data: { patient_id: babyId, card_dose_id: due.id, deduct_stock: false },
    });
    expect([200, 201]).toContain(dose.status);
  }
});

test('Path C: HIV denied without flag; allowed with flag', async ({ request }) => {
  const noHiv = await supabaseLogin('pw-clinical-nohiv@memon1.local', 'TestClinical@123!');
  const withHiv = await supabaseLogin('pw-hiv-doctor@memon1.local', 'TestHivDoc@123!');
  const denied = await apiJson(request, 'GET', '/api/hms/hiv/art', { token: noHiv.accessToken });
  expect(denied.status).toBe(403);
  const allowed = await apiJson(request, 'GET', '/api/hms/hiv/art', { token: withHiv.accessToken });
  expect(allowed.ok).toBeTruthy();
});

test('Path D: admin users + audit export', async ({ request }) => {
  const users = await apiJson(request, 'GET', '/api/hms/users', { token: adminTok });
  expect(users.ok).toBeTruthy();
  const audit = await apiJson(request, 'GET', '/api/hms/security/audit/export.xlsx', {
    token: adminTok,
  });
  expect(audit.status).toBe(200);
  const mutate = await apiJson(
    request,
    'PATCH',
    '/api/hms/security/audit/00000000-0000-0000-0000-000000000001',
    { token: adminTok, data: { action: 'x' } }
  );
  expect([405, 403]).toContain(mutate.status);
});

test('Path E: home OPD count matches aligned report', async ({ request }) => {
  const home = await apiJson(request, 'GET', '/api/hms/home-counts', { token: adminTok });
  const aligned = await apiJson(
    request,
    'GET',
    `/api/hms/reports/aligned-counts?from=${today}&to=${today}`,
    { token: adminTok }
  );
  expect(home.ok && aligned.ok).toBeTruthy();
  expect(Number(home.body.opd_visits_today || 0)).toBe(Number(aligned.body.opd_visits || 0));
});

// UI browser smoke intentionally omitted here: Chromium binary may be unavailable
// on this host. Portal routes are covered by PortalGuard + phase7 API smoke.
// Manual: login as Admin → /hms, /hms/roles, /hms/security.
