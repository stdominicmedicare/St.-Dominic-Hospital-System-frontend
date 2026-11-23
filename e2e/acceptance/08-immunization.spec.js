/**
 * Screen 08 — Immunization (8.1–8.7)
 */
import { test, expect } from '@playwright/test';
import { seedAcceptanceStaffAndStock, STAFF } from '../helpers/seed.js';
import { loginAs, logout, gotoHms } from '../helpers/loginUi.js';
import { shot, resetShotCounters } from '../helpers/screenshot.js';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await seedAcceptanceStaffAndStock(request);
});

test('8.1–8.7 immunization register, overdue, schedule, dose', async ({ page }) => {
  test.setTimeout(120_000);
  resetShotCounters();
  await loginAs(page, STAFF.midwife.email, STAFF.midwife.password);
  await gotoHms(page, '/hms/immunization');
  await expect(page.getByText(/Immunization|Vaccine|Due/i).first()).toBeVisible({
    timeout: 30_000,
  });
  await shot(page, '08-immunization', '8.7', 'kpis');

  for (const [name, id] of [
    [/Register child/i, '8.1'],
    [/Overdue/i, '8.2'],
    [/schedule|Schedule settings/i, '8.3'],
  ]) {
    const b = page.getByRole('button', { name });
    if (await b.first().isVisible().catch(() => false)) {
      await b.first().click();
      await page.waitForTimeout(400);
      await shot(page, '08-immunization', id, String(name));
      await page.keyboard.press('Escape').catch(() => {});
    }
  }

  const row = page.locator('tbody tr').first();
  if (await row.isVisible().catch(() => false)) {
    await row.click();
    await shot(page, '08-immunization', '8.4', 'vaccine-card');
    const save = page.getByRole('button', { name: /Save|Record dose/i });
    if (await save.first().isVisible().catch(() => false)) {
      await save.first().click();
      await page.waitForTimeout(800);
      await shot(page, '08-immunization', '8.5', 'dose-saved');
    }
  }

  await logout(page);
});
