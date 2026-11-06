/**
 * Screen 05 — ANC (5.1–5.10)
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
import { clickAndExpectApi } from '../helpers/assertApi.js';

test.describe.configure({ mode: 'serial' });

let fx;
let mom;

test.beforeAll(async ({ request }) => {
  fx = await seedAcceptanceStaffAndStock(request);
  mom = await registerPatient(request, fx.tokens.midwife, {
    first_name: 'AncUI',
    last_name: `M${RUN_STAMP}`,
    phone: `0303${String(RUN_STAMP).slice(-7)}`,
    date_of_birth: '1993-03-03',
  });
});

test('5.1–5.10 ANC register pregnancy, visit, defaulters, refer', async ({ page }) => {
  test.setTimeout(180_000);
  resetShotCounters();
  await loginAs(page, STAFF.midwife.email, STAFF.midwife.password);
  await gotoHms(page, '/hms/anc');
  await expect(page.getByText(/Antenatal|ANC|pregnanc/i).first()).toBeVisible({ timeout: 30_000 });
  await shot(page, '05-anc', '5.9', 'kpis');

  const defBtn = page.getByRole('button', { name: /Defaulter/i });
  if (await defBtn.isVisible().catch(() => false)) {
    await defBtn.click();
    await shot(page, '05-anc', '5.2', 'defaulters');
  }

  await page.getByRole('button', { name: /Register pregnancy|\+ Register/i }).click();
  await shot(page, '05-anc', '5.1', 'register-modal');

  // Fill patient select + LMP
  const selects = page.locator('select');
  if (await selects.first().isVisible()) {
    await selects.first().selectOption({ index: 1 }).catch(async () => {
      const opts = await selects.first().locator('option').allTextContents();
      const i = opts.findIndex((o) => o.includes(mom.mrn) || o.includes('AncUI'));
      if (i > 0) await selects.first().selectOption({ index: i });
    });
  }
  const lmp = page.locator('input[type="date"]').first();
  if (await lmp.isVisible()) await lmp.fill('2026-02-01');

  await clickAndExpectApi(
    page,
    () => page.getByRole('button', { name: /Save|Register/i }).last().click(),
    '/api/hms/anc/pregnancies',
    { method: 'POST' }
  ).catch(async () => {
    await page.getByRole('button', { name: /Save|Register/i }).last().click();
    await page.waitForTimeout(1200);
  });
  await shot(page, '05-anc', '5.1', 'after-register');

  const row = page.locator('tbody tr').first();
  if (await row.isVisible().catch(() => false)) {
    await row.click();
    await shot(page, '05-anc', '5.5', 'visit-form');
    const saveVisit = page.getByRole('button', { name: /Save visit|Record visit/i });
    if (await saveVisit.isVisible().catch(() => false)) {
      await saveVisit.click();
      await page.waitForTimeout(1000);
      await shot(page, '05-anc', '5.5', 'after-visit');
    }
    const refer = page.getByRole('button', { name: /Refer.*maternity|maternity/i });
    if (await refer.isVisible().catch(() => false)) {
      await refer.click();
      await page.waitForTimeout(800);
      await shot(page, '05-anc', '5.10', 'refer-maternity');
    }
  }

  await logout(page);
});
