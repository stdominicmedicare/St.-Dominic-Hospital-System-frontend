/**
 * Screen 09 — Family planning (9.1–9.8)
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
  await registerPatient(request, fx.tokens.midwife, {
    first_name: 'FpUI',
    last_name: `F${RUN_STAMP}`,
    phone: `0305${String(RUN_STAMP).slice(-7)}`,
  });
});

test('9.1–9.8 FP clients, methods, re-supply, encounter', async ({ page }) => {
  test.setTimeout(120_000);
  resetShotCounters();
  await loginAs(page, STAFF.midwife.email, STAFF.midwife.password);
  await gotoHms(page, '/hms/fp');
  await expect(page.getByText(/Family planning|FP/i).first()).toBeVisible({ timeout: 30_000 });
  await shot(page, '09-fp', '9.8', 'kpis');

  for (const name of [/New FP|\+ New/i, /Re-supply/i]) {
    const b = page.getByRole('button', { name });
    if (await b.first().isVisible().catch(() => false)) {
      await b.first().click();
      await page.waitForTimeout(400);
      await shot(page, '09-fp', '9.1', String(name));
      await page.keyboard.press('Escape').catch(() => {});
    }
  }

  const row = page.locator('tbody tr').first();
  if (await row.isVisible().catch(() => false)) {
    await row.click();
    await shot(page, '09-fp', '9.5', 'visit-form');
  }

  const save = page.getByRole('button', { name: /Save/i });
  if (await save.first().isVisible().catch(() => false)) {
    await save.first().click();
    await page.waitForTimeout(800);
    await shot(page, '09-fp', '9.5', 'after-save');
  }

  await logout(page);
});
