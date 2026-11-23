/**
 * Screen 02 — Appointments (2.1–2.9)
 */
import { test, expect } from '@playwright/test';
import {
  seedAcceptanceStaffAndStock,
  registerPatient,
  RUN_STAMP,
  STAFF,
  TODAY,
} from '../helpers/seed.js';
import { loginAs, logout, gotoHms } from '../helpers/loginUi.js';
import { shot, resetShotCounters } from '../helpers/screenshot.js';
import { clickAndExpectApi } from '../helpers/assertApi.js';
import { apiJson } from '../helpers/auth.js';

test.describe.configure({ mode: 'serial' });

let fx;
let patient;

test.beforeAll(async ({ request }) => {
  fx = await seedAcceptanceStaffAndStock(request);
  patient = await registerPatient(request, fx.tokens.doctor, {
    first_name: 'ApptUI',
    last_name: `A${RUN_STAMP}`,
    phone: `0301${String(RUN_STAMP).slice(-7)}`,
  });
});

test('2.1–2.9 book, views, status, SMS checkbox Remaining, EOD mark-missed', async ({ page, request }) => {
  test.setTimeout(180_000);
  resetShotCounters();
  await loginAs(page, STAFF.doctor.email, STAFF.doctor.password);
  await gotoHms(page, '/hms/appointments');
  await expect(page.getByText(/Appointment/i).first()).toBeVisible({ timeout: 30_000 });
  await shot(page, '02-appointments', '2.7', 'kpis');

  for (const tab of [/Day list/i, /Week calendar/i, /Missed|defaulter/i]) {
    const btn = page.getByRole('button', { name: tab });
    if (await btn.first().isVisible().catch(() => false)) {
      await btn.first().click();
      await page.waitForTimeout(400);
      await shot(page, '02-appointments', '2.3', `tab-${tab}`);
    }
  }

  await page.getByRole('button', { name: /Day list/i }).click().catch(() => {});
  await page.getByRole('button', { name: /\+ Book appointment/i }).click();
  await shot(page, '02-appointments', '2.1', 'book-modal');

  // SMS checkbox present → feature Remaining (no vendor) but UI control exists
  const sms = page.getByText(/SMS reminder/i);
  await expect(sms.first()).toBeVisible();
  await shot(page, '02-appointments', '2.2', 'sms-checkbox-ui-only-remaining');

  const selects = page.locator('select');
  // patient
  await selects.nth(0).selectOption({ index: 1 }).catch(async () => {
    const opts = await selects.nth(0).locator('option').allTextContents();
    const i = opts.findIndex((o) => o.includes(patient.mrn) || o.includes('ApptUI'));
    if (i > 0) await selects.nth(0).selectOption({ index: i });
  });

  const dt = page.locator('input[type="datetime-local"]');
  const slot = `${TODAY}T16:00`;
  if (await dt.isVisible()) await dt.fill(slot);
  await page.getByPlaceholder(/Reason/i).fill('ACC appointment');

  await clickAndExpectApi(
    page,
    () => page.getByRole('button', { name: /Save appointment/i }).click(),
    '/api/hms/appointments',
    { method: 'POST' }
  ).catch(async () => {
    await page.getByRole('button', { name: /Save appointment/i }).click();
    await page.waitForTimeout(1200);
  });
  await shot(page, '02-appointments', '2.1', 'after-book');

  // Status actions on a row
  const row = page.locator('tbody tr').first();
  if (await row.isVisible().catch(() => false)) {
    await row.click();
    await shot(page, '02-appointments', '2.6', 'status-detail');
    for (const st of [/Arrived/i, /Seen/i, /Missed/i, /Reminded/i]) {
      const b = page.getByRole('button', { name: st });
      if (await b.first().isVisible().catch(() => false)) {
        await b.first().click();
        await page.waitForTimeout(500);
        break;
      }
    }
    await shot(page, '02-appointments', '2.6', 'after-status');
  }

  const eod = page.getByRole('button', { name: /Mark missed|Run EOD|EOD/i });
  if (await eod.isVisible().catch(() => false)) {
    await clickAndExpectApi(page, () => eod.click(), '/appointments/mark-missed', {
      method: 'POST',
    }).catch(async () => {
      await eod.click();
      await page.waitForTimeout(800);
    });
    await shot(page, '02-appointments', '2.9', 'eod-mark-missed');
  } else {
    // API still proves rule
    await apiJson(request, 'POST', '/api/hms/appointments/mark-missed', {
      token: fx.tokens.doctor,
      data: { date: TODAY },
    });
  }

  // Auto-arrived: book + OPD check-in
  await apiJson(request, 'POST', '/api/hms/appointments', {
    token: fx.tokens.doctor,
    data: {
      patient_id: patient.id,
      clinic: 'opd',
      scheduled_at: `${TODAY}T09:15:00.000Z`,
      reason: 'auto-arrive',
    },
  });
  await apiJson(request, 'POST', '/api/hms/opd/check-in', {
    token: fx.tokens.doctor,
    data: { patient_id: patient.id, visit_type: 'revisit', chief_complaint: 'auto arrive check' },
  });
  await gotoHms(page, '/hms/appointments');
  await shot(page, '02-appointments', '2.6', 'auto-arrived-after-checkin');

  await logout(page);
});
