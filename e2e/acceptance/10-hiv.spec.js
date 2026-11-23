/**
 * Screen 10 — HIV (10.1–10.8)
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

test.describe.configure({ mode: 'serial' });

let fx;

test.beforeAll(async ({ request }) => {
  fx = await seedAcceptanceStaffAndStock(request);
  await registerPatient(request, fx.tokens.hivDoctor, {
    first_name: 'HivUI',
    last_name: `H${RUN_STAMP}`,
    phone: `0306${String(RUN_STAMP).slice(-7)}`,
  });
});

test('10.1–10.8 HIV tabs HTS ART VL refills with access flag', async ({ page }) => {
  test.setTimeout(180_000);
  resetShotCounters();

  await loginAs(page, STAFF.clinicalNoHiv.email, STAFF.clinicalNoHiv.password);
  await gotoHms(page, '/hms/hiv');
  await shot(page, '10-hiv', '10.1', 'blocked-without-flag');
  await logout(page);

  await loginAs(page, STAFF.hivDoctor.email, STAFF.hivDoctor.password);
  await gotoHms(page, '/hms/hiv');
  await expect(page.getByText(/HIV|ART|HTS|Viral/i).first()).toBeVisible({ timeout: 30_000 });
  await shot(page, '10-hiv', '10.8', 'kpis');

  for (const tab of [/Testing|HTS/i, /ART/i, /Viral load|VL/i, /Refill/i]) {
    const b = page.getByRole('button', { name: tab }).or(page.getByRole('tab', { name: tab }));
    if (await b.first().isVisible().catch(() => false)) {
      await b.first().click();
      await page.waitForTimeout(500);
      await shot(page, '10-hiv', '10.2', `tab-${String(tab)}`);
    }
  }

  for (const name of [/Record HIV test|\+ Record/i, /Enrol|Enroll/i, /Show name/i]) {
    const b = page.getByRole('button', { name });
    if (await b.first().isVisible().catch(() => false)) {
      await b.first().click();
      await page.waitForTimeout(400);
      await shot(page, '10-hiv', '10.3', String(name));
      await page.keyboard.press('Escape').catch(() => {});
    }
  }

  await logout(page);
});
