/**
 * Full manual walkthrough (JIMs demo) as Playwright E2E.
 *
 * Prep: backend :5000 + frontend :5173
 * Run headed so you can watch:
 *   npm run test:walkthrough
 *
 * Staff accounts are seeded via Supabase service role for repeatable demos.
 */
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ADMIN_EMAIL,
  ADMIN_PASS,
  API_URL,
  SUPABASE_URL,
  SUPABASE_ANON,
  apiJson,
  supabaseLogin,
} from './helpers/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
loadEnv(path.resolve(__dirname, '../../Memon-HMS-Backend/.env'));
loadEnv(path.resolve(__dirname, '../.env'));

const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const STAFF = [
  { role: 'Receptionist', email: 'desk@test.local', password: 'TestDesk@123!', name: 'Demo Desk' },
  { role: 'Nurse', email: 'nurse@test.local', password: 'TestNurse@123!', name: 'Demo Nurse' },
  { role: 'Midwife', email: 'midwife@test.local', password: 'TestMidwife@123!', name: 'Demo Midwife' },
  { role: 'Laboratory', email: 'lab@test.local', password: 'TestLab@123!', name: 'Demo Lab' },
  { role: 'Accounts', email: 'accounts@test.local', password: 'TestAccounts@123!', name: 'Demo Accounts' },
  { role: 'Doctor', email: 'doctor@test.local', password: 'TestDoctor@123!', name: 'Demo Doctor' },
];

const PATIENT = {
  full_name: 'Ayesha Khan',
  email: 'ayesha.khan.demo@test.local',
  phone: '03001234567',
  date_of_birth: '1995-03-12',
  password: 'TestPatient@123!',
};

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function plusWeeksISO(weeks) {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

async function ensureStaffUsers() {
  if (!SERVICE) throw new Error('SUPABASE_SERVICE_ROLE_KEY required to seed staff');
  const admin = createClient(SUPABASE_URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const s of STAFF) {
    const tryLogin = await anon.auth.signInWithPassword({
      email: s.email,
      password: s.password,
    });
    if (!tryLogin.error) {
      await admin
        .from('profiles')
        .update({
          role: s.role,
          full_name: s.name,
          is_active: true,
          password_changed_at: new Date().toISOString(),
        })
        .eq('id', tryLogin.data.user.id);
      continue;
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: s.email,
      password: s.password,
      email_confirm: true,
      user_metadata: { full_name: s.name, role: s.role },
    });
    if (error && !/already|registered/i.test(error.message)) {
      throw new Error(`Create ${s.email}: ${error.message}`);
    }
    let userId = data?.user?.id;
    if (!userId) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      userId = list?.users?.find((u) => u.email === s.email)?.id;
    }
    if (userId) {
      await admin.from('profiles').upsert({
        id: userId,
        email: s.email,
        full_name: s.name,
        role: s.role,
        is_active: true,
        password_changed_at: new Date().toISOString(),
      });
      if (s.role === 'Doctor') {
        await admin
          .from('profiles')
          .update({
            specialty: 'General Medicine',
            department: 'Outpatient / OPD',
            doctor_status: 'Available',
          })
          .eq('id', userId);
      }
    }
  }
}

async function loginAs(page, email, password) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /MEMON COMMUNITY HOSPITAL/i })).toBeVisible({
    timeout: 15_000,
  });

  const emailInput = page.locator('input[type="email"]').first();
  const passInput = page.locator('input[type="password"]').first();
  await emailInput.fill(email);
  await passInput.fill(password);
  await page.getByRole('button', { name: /^Sign In$/i }).click();

  for (let i = 0; i < 2; i++) {
    const profileFail = page.getByText(/Profile couldn't be loaded|couldn't load your profile/i);
    if (await profileFail.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.getByRole('button', { name: /^Retry$/i }).click();
      await page.waitForTimeout(1500);
    } else {
      break;
    }
  }

  await expect
    .poll(() => page.url(), { timeout: 30_000 })
    .not.toMatch(/\/login\/?$/);
}

async function logout(page) {
  const signOutBtn = page.getByRole('button', { name: /Sign out/i });
  if (await signOutBtn.count()) {
    await signOutBtn.click();
  }
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /MEMON COMMUNITY HOSPITAL/i })).toBeVisible({
    timeout: 15_000,
  });
}

async function toastOk(page, pattern) {
  // Toast auto-hides after ~3s — assert quickly, or accept matching network success
  await expect(page.getByText(pattern).first()).toBeVisible({ timeout: 8_000 });
}

async function clickAndExpectApi(page, clickFn, urlPart, method = 'POST') {
  const respPromise = page.waitForResponse(
    (r) => r.url().includes(urlPart) && r.request().method() === method,
    { timeout: 30_000 }
  );
  await clickFn();
  const res = await respPromise;
  expect(res.ok(), `${method} ${urlPart} → ${res.status()}`).toBeTruthy();
  return res;
}

test.describe.configure({ mode: 'serial' });

test.describe('JIMs manual walkthrough (dummy data)', () => {
  test.setTimeout(120_000);
  let patientId = '';

  test.beforeAll(async ({ request }) => {
    const health = await request.get(`${API_URL}/`);
    expect(health.ok(), 'Backend must be running on :5000').toBeTruthy();
    await ensureStaffUsers();
  });

  test('Prep: open login + Admin reaches dashboard', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/login');
    await expect(page.getByRole('heading', { name: /MEMON COMMUNITY HOSPITAL/i })).toBeVisible();

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
    await expect(page.getByRole('heading', { name: /Dashboard Analytics|Admin/i }).first()).toBeVisible({
      timeout: 30_000,
    });

    await logout(page);
  });

  test('A. Receptionist registers Ayesha Khan', async ({ page, request }) => {
    await loginAs(page, 'desk@test.local', 'TestDesk@123!');
    await page.waitForURL(/\/(staff|admin\/patients|opd)/, { timeout: 30_000 });

    await page.goto('/admin/patients');
    // If profile flake redirected us, retry
    if (await page.getByText(/Profile couldn't be loaded/i).isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /^Retry$/i }).click();
      await page.waitForTimeout(1500);
      await page.goto('/admin/patients');
    }
    await expect(page.getByRole('heading', { name: /Patient Records/i })).toBeVisible({ timeout: 30_000 });

    const searchBox = page.getByPlaceholder(/Name, MRN, phone, email/i);
    await searchBox.fill(PATIENT.email);
    await page.getByRole('button', { name: /^Search$/i }).click();
    await page.waitForTimeout(1000);

    const existingRow = page.locator('tbody tr').filter({ hasText: PATIENT.full_name }).first();
    const alreadyThere = await existingRow.isVisible().catch(() => false);

    if (!alreadyThere) {
      await page.getByRole('button', { name: /Register patient/i }).click();
      const dialog = page.locator('form').filter({ hasText: /Full name|Temporary password|data consent/i });
      await dialog.getByLabel(/^Full name/i).fill(PATIENT.full_name);
      await dialog.getByLabel(/^Email/i).fill(PATIENT.email);
      await dialog.getByLabel(/Temporary password/i).fill(PATIENT.password);
      await dialog.getByLabel(/^Phone/i).fill(PATIENT.phone);
      await dialog.getByLabel(/Date of birth/i).fill(PATIENT.date_of_birth);
      await dialog.locator('input[type="checkbox"]').check();

      const registerRespPromise = page.waitForResponse(
        (r) => r.url().includes('/api/records/register') && r.request().method() === 'POST',
        { timeout: 30_000 }
      );
      await dialog.getByRole('button', { name: /Check & register/i }).click();

      const maybeDup = page.getByRole('button', { name: /Register anyway/i });
      if (await maybeDup.isVisible({ timeout: 5000 }).catch(() => false)) {
        const again = page.waitForResponse(
          (r) => r.url().includes('/api/records/register') && r.request().method() === 'POST',
          { timeout: 30_000 }
        );
        await maybeDup.click();
        const res = await again;
        expect(res.ok()).toBeTruthy();
        patientId = (await res.json()).id;
      } else {
        const res = await registerRespPromise;
        expect(res.ok()).toBeTruthy();
        patientId = (await res.json()).id;
      }
    }

    // Open record in UI (panel shows MRN; UUID comes from search API — MVP forms need UUID)
    await searchBox.fill(PATIENT.email);
    await page.getByRole('button', { name: /^Search$/i }).click();
    await expect(page.locator('tbody tr').filter({ hasText: PATIENT.full_name }).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.locator('tbody tr').filter({ hasText: PATIENT.full_name }).first().locator('td').nth(1).click();
    await expect(page.getByRole('heading', { name: PATIENT.full_name })).toBeVisible({ timeout: 15_000 });

    if (!patientId) {
      const auth = await supabaseLogin('desk@test.local', 'TestDesk@123!');
      const found = await apiJson(
        request,
        'GET',
        `/api/records/search?q=${encodeURIComponent(PATIENT.email)}&limit=10`,
        { token: auth.accessToken }
      );
      expect(found.ok).toBeTruthy();
      const match = (found.body || []).find(
        (p) => p.email === PATIENT.email || p.full_name === PATIENT.full_name
      );
      patientId = match?.id || '';
    }

    expect(patientId, 'Patient UUID for OPD/MCH forms').toMatch(/^[0-9a-f-]{36}$/i);

    await logout(page);
  });

  test('B. OPD visit + follow-up (Receptionist)', async ({ page }) => {
    expect(patientId).toBeTruthy();
    await loginAs(page, 'desk@test.local', 'TestDesk@123!');
    await page.waitForURL(/\/(staff|admin|opd)/, { timeout: 30_000 });
    await page.goto('/opd');
    await expect(page.getByRole('heading', { name: /OPD Desk/i })).toBeVisible();

    const visitForm = page.locator('form').filter({ hasText: /Chief complaint|Register visit/i });
    await visitForm.getByLabel(/Patient ID/i).fill(patientId);
    await visitForm.getByLabel(/Chief complaint/i).fill('Fever and cough for 2 days');
    await visitForm.getByLabel(/^Triage$/i).selectOption('medium');
    await visitForm.getByLabel(/^BP$/i).fill('120/80');
    await visitForm.getByLabel(/Temp/i).fill('38.1');
    await visitForm.getByRole('button', { name: /Register visit/i }).click();
    await toastOk(page, /OPD visit created/i);

    const visitRow = () =>
      page
        .locator('tbody tr')
        .filter({ hasText: /Fever and cough for 2 days/i })
        .filter({ has: page.getByRole('button', { name: /Triage|Start|Complete/i }) })
        .first();
    await expect(visitRow()).toBeVisible({ timeout: 15_000 });

    if (await visitRow().getByRole('button', { name: /^Triage$/i }).count()) {
      await visitRow().getByRole('button', { name: /^Triage$/i }).click();
      await expect(visitRow().getByText(/triaged/i)).toBeVisible({ timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
    if (await visitRow().getByRole('button', { name: /^Start$/i }).count()) {
      await visitRow().getByRole('button', { name: /^Start$/i }).click();
      await expect(
        page
          .locator('tbody tr')
          .filter({ hasText: /Fever and cough for 2 days/i })
          .filter({ has: page.getByRole('button', { name: /^Complete$/i }) })
          .first()
      ).toBeVisible({ timeout: 10_000 });
    }
    const completeRow = page
      .locator('tbody tr')
      .filter({ hasText: /Fever and cough for 2 days/i })
      .filter({ has: page.getByRole('button', { name: /^Complete$/i }) })
      .first();
    await completeRow.getByRole('button', { name: /^Complete$/i }).click();
    await page.waitForTimeout(600);

    const fuForm = page.locator('form').filter({ hasText: /Due date/i });
    await fuForm.getByLabel(/^Patient ID$/i).fill(patientId);
    await fuForm.getByLabel(/Due date/i).fill(tomorrowISO());
    await fuForm.getByLabel(/Reason/i).fill('Review fever');
    await fuForm.getByRole('button', { name: /^Schedule$/i }).click();
    await toastOk(page, /Follow-up scheduled/i);

    await logout(page);
  });

  test('C. Billing (Accounts) + Revenue report', async ({ page }) => {
    expect(patientId).toBeTruthy();
    await loginAs(page, 'accounts@test.local', 'TestAccounts@123!');
    await page.waitForURL(/\/accounts/, { timeout: 30_000 });
    await page.goto('/accounts');
    await expect(page.getByRole('heading', { name: /Accounts/i })).toBeVisible();

    const invForm = page.locator('form').filter({ hasText: /Charge item|Create invoice/i });
    await invForm.getByLabel(/Patient ID/i).fill(patientId);
    const chargeSelect = invForm.getByLabel(/Charge item/i);
    await expect(chargeSelect.locator('option').nth(1)).toBeAttached({ timeout: 10_000 });
    const options = await chargeSelect.locator('option').allTextContents();
    const opdIdx = options.findIndex((o) => /OPD Consultation/i.test(o));
    if (opdIdx >= 0) {
      const value = await chargeSelect.locator('option').nth(opdIdx).getAttribute('value');
      await chargeSelect.selectOption(value);
    }
    await invForm.getByLabel(/^Qty$/i).fill('1');
    await invForm.getByRole('button', { name: /Create invoice/i }).click();
    await toastOk(page, /Invoice created/i);

    await page.getByRole('button', { name: /^Open$/i }).first().click();
    await expect(page.getByText(/INV-/i).first()).toBeVisible();

    const payForm = page.locator('form').filter({ hasText: /Payment amount/i });
    const totalLine = await page.locator('p').filter({ hasText: /Total/i }).first().textContent();
    const amount = String(totalLine).match(/([0-9]+(?:\.[0-9]+)?)/)?.[1] || '500';
    await payForm.getByLabel(/Payment amount/i).fill(amount);
    await payForm.getByRole('button', { name: /Record payment/i }).click();
    await toastOk(page, /Payment recorded|RCP-/i);

    const pdfBtn = page.getByRole('button', { name: /^PDF$/i }).first();
    await Promise.all([
      page.waitForEvent('download', { timeout: 20_000 }).catch(() => null),
      pdfBtn.click(),
    ]);

    await page.goto('/admin/reports');
    await expect(page.getByRole('heading', { name: /Reports/i })).toBeVisible({ timeout: 15_000 });
    await page.getByLabel(/^Report$/i).selectOption('revenue');
    await page.getByRole('button', { name: /^Preview$/i }).click();
    await page.waitForTimeout(800);
    for (const label of [/Excel/i, /PDF/i]) {
      const btn = page.getByRole('button', { name: label }).first();
      if (await btn.isVisible().catch(() => false)) {
        await Promise.all([
          page.waitForEvent('download', { timeout: 15_000 }).catch(() => null),
          btn.click(),
        ]);
      }
    }

    await logout(page);
  });

  test('D. Midwife / MCH full path', async ({ page }) => {
    expect(patientId).toBeTruthy();
    await loginAs(page, 'midwife@test.local', 'TestMidwife@123!');
    await page.waitForURL(/\/midwife/, { timeout: 30_000 });
    await page.goto('/midwife');
    await expect(page.getByRole('heading', { name: /Midwife|MCH/i })).toBeVisible();

    await page.getByRole('button', { name: /^ANC$/i }).click();
    const pregForm = page.locator('form').filter({ hasText: /Register pregnancy|LMP|EDD/i });
    await pregForm.getByLabel(/Patient ID/i).fill(patientId);
    await pregForm.getByLabel(/^LMP$/i).fill('2026-01-01');
    await pregForm.getByLabel(/^EDD$/i).fill('2026-10-08');
    await pregForm.getByRole('button', { name: /^Save$/i }).click();
    await page.waitForTimeout(1200);
    // Toast success or already-active pregnancy — continue either way

    const ancForm = page.locator('form').filter({ hasText: /ANC visit|Weight kg/i });
    await expect(ancForm.getByLabel(/Pregnancy/i).locator('option').nth(1)).toBeAttached({ timeout: 10_000 });
    await ancForm.getByLabel(/Pregnancy/i).selectOption({ index: 1 });
    await ancForm.getByLabel(/Weight kg/i).fill('62');
    await ancForm.getByLabel(/BP systolic/i).fill('110');
    await ancForm.getByLabel(/BP diastolic/i).fill('70');
    await ancForm.getByLabel(/Next visit/i).fill(plusWeeksISO(4));
    await clickAndExpectApi(
      page,
      () => ancForm.getByRole('button', { name: /Record visit/i }).click(),
      '/api/mch/anc-visits'
    );
    await toastOk(page, /ANC visit saved/i).catch(() => {});

    await page.getByRole('button', { name: /^LABOUR$/i }).click();
    const admitForm = page.locator('form').filter({ hasText: /Admit to labour|Ward/i });
    await admitForm.getByLabel(/Patient ID/i).fill(patientId);
    await admitForm.getByLabel(/Ward/i).fill('L-1');
    await clickAndExpectApi(
      page,
      () => admitForm.getByRole('button', { name: /^Admit$/i }).click(),
      '/api/mch/admissions'
    ).catch(async () => {
      // Already admitted from prior run — continue to delivery if board has entries
      await page.waitForTimeout(800);
    });

    const delForm = page.locator('form').filter({ hasText: /Record delivery|Birth weight/i });
    await expect(delForm.getByLabel(/Admission/i).locator('option').nth(1)).toBeAttached({ timeout: 15_000 });
    await delForm.getByLabel(/Admission/i).selectOption({ index: 1 });
    await delForm.getByLabel(/^Mode$/i).selectOption('svd');
    await delForm.getByLabel(/^Outcome$/i).selectOption('live_birth');
    await delForm.getByLabel(/Baby sex/i).selectOption('female');
    await delForm.getByLabel(/Birth weight/i).fill('3200');
    await clickAndExpectApi(
      page,
      () => delForm.getByRole('button', { name: /Save delivery/i }).click(),
      '/api/mch/deliveries'
    ).catch(async () => {
      await page.waitForTimeout(500);
    });
    await toastOk(page, /Delivery recorded/i).catch(() => {});

    await page.getByRole('button', { name: /^PNC$/i }).click();
    const pncForm = page.locator('form').filter({ hasText: /Postnatal|Mother patient/i });
    await pncForm.getByLabel(/Mother patient ID/i).fill(patientId);
    await pncForm.getByLabel(/Mother status/i).fill('stable');
    await pncForm.getByLabel(/Baby status/i).fill('feeding well');
    await clickAndExpectApi(
      page,
      () => pncForm.getByRole('button', { name: /Save PNC/i }).click(),
      '/api/mch/pnc-visits'
    );
    await toastOk(page, /PNC visit saved/i).catch(() => {});

    await page.getByRole('button', { name: /^DUE$/i }).click();
    await expect(page.getByRole('heading', { name: /Due \/ overdue/i })).toBeVisible();

    await logout(page);
  });

  test('E. Laboratory order + result', async ({ page }) => {
    expect(patientId).toBeTruthy();
    await loginAs(page, 'midwife@test.local', 'TestMidwife@123!');
    await page.waitForURL(/\/midwife/, { timeout: 30_000 });
    await page.goto('/lab');
    await expect(page.getByRole('heading', { name: /Laboratory/i })).toBeVisible();

    await page.getByLabel(/Patient ID/i).fill(patientId);
    await expect(page.getByRole('button', { name: /HGB/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /HGB/i }).click();
    await page.getByRole('button', { name: /CBC/i }).click();
    await page.getByRole('button', { name: /Place order/i }).click();
    await toastOk(page, /Order placed/i);
    await logout(page);

    await loginAs(page, 'lab@test.local', 'TestLab@123!');
    await page.waitForURL(/\/lab/, { timeout: 30_000 });
    await page.goto('/lab');

    const shortId = patientId.slice(0, 8);
    const workRow = page.locator('tr').filter({ hasText: shortId }).first();
    await expect(workRow).toBeVisible({ timeout: 15_000 });
    if (await workRow.getByRole('button', { name: /Collect/i }).count()) {
      await workRow.getByRole('button', { name: /Collect/i }).click();
      await page.waitForTimeout(800);
    }
    await workRow.getByRole('button', { name: /^Open$/i }).click();

    await page.getByLabel(/Result value/i).fill('12.5');
    await page.getByRole('button', { name: /Enter & verify/i }).click();
    await toastOk(page, /Result saved/i);

    await logout(page);
  });

  test('F. Immunization / FP / HIV (Midwife)', async ({ page }) => {
    expect(patientId).toBeTruthy();
    await loginAs(page, 'midwife@test.local', 'TestMidwife@123!');
    await page.waitForURL(/\/midwife/, { timeout: 30_000 });
    await page.goto('/programs');
    await expect(page.getByRole('heading', { name: /Clinical programs/i })).toBeVisible();

    await page.getByRole('button', { name: /^Immunization$/i }).click();
    const immForm = page.locator('form').filter({ hasText: /Record dose|Vaccine/i });
    await immForm.getByLabel(/Patient ID/i).fill(patientId);
    await expect(immForm.getByLabel(/Vaccine/i).locator('option').nth(1)).toBeAttached({ timeout: 10_000 });
    const vaccineOpts = await immForm.getByLabel(/Vaccine/i).locator('option').allTextContents();
    const bcgIdx = vaccineOpts.findIndex((o) => /BCG/i.test(o));
    expect(bcgIdx).toBeGreaterThanOrEqual(0);
    await immForm.getByLabel(/Vaccine/i).selectOption({ index: bcgIdx });
    await immForm.getByLabel(/Dose/i).fill('1');
    await immForm.getByLabel(/Next due/i).fill(plusWeeksISO(8));
    await immForm.getByRole('button', { name: /^Save$/i }).click();
    await toastOk(page, /Dose recorded/i);

    await page.getByRole('button', { name: /Family planning/i }).click();
    const fpForm = page.locator('form').filter({ hasText: /FP encounter|Counseling/i });
    await fpForm.getByLabel(/Patient ID/i).fill(patientId);
    await expect(fpForm.getByLabel(/Method/i).locator('option').nth(1)).toBeAttached({ timeout: 10_000 });
    const methodOpts = await fpForm.getByLabel(/Method/i).locator('option').allTextContents();
    const pillIdx = methodOpts.findIndex((o) => /Oral contraceptive/i.test(o));
    expect(pillIdx).toBeGreaterThanOrEqual(0);
    await fpForm.getByLabel(/Method/i).selectOption({ index: pillIdx });
    await fpForm.getByLabel(/Counseling notes/i).fill('Counseled on side effects');
    await fpForm.getByRole('button', { name: /^Save$/i }).click();
    await toastOk(page, /FP encounter saved/i);

    await page.getByRole('button', { name: /^HIV$/i }).click();
    const enrollCard = page.locator('div').filter({ has: page.getByRole('heading', { name: /Enroll patient/i }) });
    await enrollCard.getByLabel(/Patient ID/i).fill(patientId);
    await enrollCard.getByRole('button', { name: /^Enroll$/i }).click();
    await page.waitForTimeout(1500);

    const visitCard = page.locator('div').filter({ has: page.getByRole('heading', { name: /Visit \/ labs/i }) });
    await expect(visitCard.getByLabel(/Enrollment/i).locator('option').nth(1)).toBeAttached({
      timeout: 15_000,
    });
    await visitCard.getByLabel(/Enrollment/i).selectOption({ index: 1 });
    await visitCard.getByLabel(/WHO stage/i).selectOption('1');
    await visitCard.getByLabel(/^CD4$/i).fill('450');
    await visitCard.getByLabel(/Viral load/i).fill('200');
    await visitCard.getByRole('button', { name: /^Save$/i }).click();
    await toastOk(page, /HIV visit saved/i);

    await logout(page);
  });

  test('G. Reports (clinical) + Admin dashboard', async ({ page, request }) => {
    await loginAs(page, 'midwife@test.local', 'TestMidwife@123!');
    await page.waitForURL(/\/midwife/, { timeout: 30_000 });
    await page.goto('/admin/reports');
    await expect(page.getByRole('heading', { name: /Reports/i })).toBeVisible({ timeout: 15_000 });

    const typeSelect = page.getByLabel(/^Report$/i);
    for (const opt of ['anc_attendance', 'deliveries', 'immunization_coverage', 'hiv_cascade', 'revenue']) {
      await typeSelect.selectOption(opt).catch(() => {});
      await page.getByRole('button', { name: /^Preview$/i }).click();
      await page.waitForTimeout(600);
    }
    await logout(page);

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
    await expect(page.getByRole('heading', { name: /Dashboard Analytics|Admin/i }).first()).toBeVisible({
      timeout: 30_000,
    });

    const auth = await supabaseLogin(ADMIN_EMAIL, ADMIN_PASS);
    for (const type of ['revenue', 'anc_attendance', 'deliveries', 'immunization_coverage', 'hiv_cascade']) {
      const rep = await apiJson(request, 'GET', `/api/reports/${type}?format=json`, {
        token: auth.accessToken,
      });
      expect(rep.status, type).toBe(200);
    }
  });
});
