/**
 * Clinical role split — Clerk / Nurse / Doctor OPD action gates + portal matrix.
 */
import { test, expect } from '@playwright/test';
import {
  seedAcceptanceStaffAndStock,
  registerPatient,
  RUN_STAMP,
  STAFF,
} from '../helpers/seed.js';
import { loginAs, logout, gotoHms } from '../helpers/loginUi.js';
import { shot, resetShotCounters } from '../helpers/screenshot.js';
import { apiJson } from '../helpers/auth.js';

test.describe.configure({ mode: 'serial' });

let fx;
let patientId;
let visitId;

test.beforeAll(async ({ request }) => {
  test.setTimeout(180_000);
  fx = await seedAcceptanceStaffAndStock(request, { force: true });
  expect(fx.tokens.clerk, 'clerk token').toBeTruthy();
  expect(fx.tokens.nurse, 'nurse token').toBeTruthy();
  expect(fx.tokens.doctor, 'doctor token').toBeTruthy();

  const patient = await registerPatient(request, fx.tokens.doctor, {
    first_name: 'ClinRole',
    last_name: `V${RUN_STAMP}`,
    phone: `0311${String(RUN_STAMP).slice(-7)}`,
  });
  patientId = patient.id || patient.patient?.id;
  expect(patientId).toBeTruthy();
});

test('API: Clerk check-in allowed; prescribe denied', async ({ request }) => {
  const checkIn = await apiJson(request, 'POST', '/api/hms/opd/check-in', {
    token: fx.tokens.clerk,
    data: {
      patient_id: patientId,
      visit_type: 'new',
      chief_complaint: `Clerk gate ${RUN_STAMP}`,
    },
  });
  expect(checkIn.status, JSON.stringify(checkIn.body)).toBeLessThan(300);
  visitId = checkIn.body.id || checkIn.body.visit?.id;
  expect(visitId).toBeTruthy();

  const rx = await apiJson(request, 'POST', `/api/hms/opd/${visitId}/prescribe`, {
    token: fx.tokens.clerk,
    data: {
      items: [{ medication_text: 'Paracetamol', quantity: 1, dosage: '500mg' }],
    },
  });
  expect(rx.status, JSON.stringify(rx.body)).toBe(403);
});

test('API: Nurse triage PATCH allowed; prescribe denied', async ({ request }) => {
  const triage = await apiJson(request, 'PATCH', `/api/hms/opd/${visitId}`, {
    token: fx.tokens.nurse,
    data: {
      status: 'waiting_doctor',
      vitals: {
        bp_systolic: 118,
        bp_diastolic: 76,
        temperature: 37.2,
        pulse: 82,
        spo2: 98,
        weight: 68,
        height: 162,
        resp_rate: 16,
      },
    },
  });
  expect(triage.status, JSON.stringify(triage.body)).toBeLessThan(300);

  const rx = await apiJson(request, 'POST', `/api/hms/opd/${visitId}/prescribe`, {
    token: fx.tokens.nurse,
    data: {
      items: [{ medication_text: 'Ibuprofen', quantity: 1, dosage: '200mg' }],
    },
  });
  expect(rx.status, JSON.stringify(rx.body)).toBe(403);
});

test('API: Doctor prescribe + complete allowed', async ({ request }) => {
  const rx = await apiJson(request, 'POST', `/api/hms/opd/${visitId}/prescribe`, {
    token: fx.tokens.doctor,
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

  const done = await apiJson(request, 'POST', `/api/hms/opd/${visitId}/complete`, {
    token: fx.tokens.doctor,
    data: {},
  });
  expect(done.status, JSON.stringify(done.body)).toBeLessThan(300);
});

test('API: Clerk denied ANC/maternity; Nurse allowed PNC/imm; Doctor OPD queue', async ({
  request,
}) => {
  const clerkAnc = await apiJson(request, 'GET', '/api/hms/anc/kpis', { token: fx.tokens.clerk });
  expect(clerkAnc.status).toBe(403);
  const clerkMat = await apiJson(request, 'GET', '/api/hms/maternity/kpis', {
    token: fx.tokens.clerk,
  });
  expect(clerkMat.status).toBe(403);

  const nursePnc = await apiJson(request, 'GET', '/api/hms/pnc/kpis', { token: fx.tokens.nurse });
  expect(nursePnc.status).toBe(200);
  const nurseImm = await apiJson(request, 'GET', '/api/hms/immunization/kpis', {
    token: fx.tokens.nurse,
  });
  expect(nurseImm.status).toBe(200);

  const docQueue = await apiJson(request, 'GET', '/api/hms/opd/queue', {
    token: fx.tokens.doctor,
  });
  expect(docQueue.status).toBe(200);
});

test('UI: OPD buttons by Clerk / Nurse / Doctor + Roles matrix columns', async ({
  page,
  request,
}) => {
  test.setTimeout(240_000);
  resetShotCounters();

  // Fresh open visit so Nurse/Doctor action strips render
  const uiPatient = await registerPatient(request, fx.tokens.doctor, {
    first_name: 'ClinUI',
    last_name: `V${RUN_STAMP}`,
    phone: `0312${String(RUN_STAMP).slice(-7)}`,
  });
  const uiPid = uiPatient.id || uiPatient.patient?.id;
  const uiCheckIn = await apiJson(request, 'POST', '/api/hms/opd/check-in', {
    token: fx.tokens.clerk,
    data: {
      patient_id: uiPid,
      visit_type: 'new',
      chief_complaint: `UI buttons ${RUN_STAMP}`,
    },
  });
  expect(uiCheckIn.status, JSON.stringify(uiCheckIn.body)).toBeLessThan(300);

  // Clerk — check-in only
  await loginAs(page, STAFF.clerk.email, STAFF.clerk.password);
  await gotoHms(page, '/hms/opd');
  await expect(page.getByText(/OPD|Outpatient/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: /\+ Check in patient/i })).toBeVisible();
  const clerkRow = page.locator('tbody tr').filter({ hasText: /UI buttons/i }).first();
  if (await clerkRow.isVisible().catch(() => false)) await clerkRow.click();
  await expect(page.getByRole('button', { name: /Save vitals/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Prescribe$/i })).toHaveCount(0);
  await shot(page, '14-roles', '14.9', 'clerk-opd-buttons');
  await logout(page);

  // Nurse — triage, no prescribe
  await loginAs(page, STAFF.nurse.email, STAFF.nurse.password);
  await gotoHms(page, '/hms/opd');
  await expect(page.getByText(/OPD|Outpatient/i).first()).toBeVisible({ timeout: 30_000 });
  const nurseRow = page.locator('tbody tr').filter({ hasText: /UI buttons/i }).first();
  await expect(nurseRow).toBeVisible({ timeout: 20_000 });
  await nurseRow.click();
  await expect(page.getByRole('button', { name: /Save vitals/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /^Prescribe$/i })).toHaveCount(0);
  await shot(page, '14-roles', '14.9', 'nurse-opd-buttons');
  await logout(page);

  // Doctor — consult actions when visit selected
  await loginAs(page, STAFF.doctor.email, STAFF.doctor.password);
  await gotoHms(page, '/hms/opd');
  await expect(page.getByText(/OPD|Outpatient/i).first()).toBeVisible({ timeout: 30_000 });
  const docRow = page.locator('tbody tr').filter({ hasText: /UI buttons/i }).first();
  await expect(docRow).toBeVisible({ timeout: 20_000 });
  await docRow.click();
  await expect(page.getByRole('button', { name: /Prescribe|Order lab|Complete visit/i }).first()).toBeVisible({
    timeout: 15_000,
  });
  await shot(page, '14-roles', '14.9', 'doctor-opd-buttons');
  await logout(page);

  // Roles matrix shows Clerk / Nurse / Doctor columns
  await loginAs(page, STAFF.admin.email, STAFF.admin.password);
  await gotoHms(page, '/hms/roles');
  await expect(page.getByText(/Permission matrix|Eight roles|Users/i).first()).toBeVisible({
    timeout: 25_000,
  });
  await expect(page.getByText('Clerk', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Nurse', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Doctor', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Clinical staff/i)).toHaveCount(0);
  await shot(page, '14-roles', '14.9', 'roles-matrix-clerk-nurse-doctor');
  await logout(page);
});
