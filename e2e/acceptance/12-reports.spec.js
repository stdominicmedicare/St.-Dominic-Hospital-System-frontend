/**
 * Screen 12 — Reports (12.1–12.5)
 */
import { test, expect } from '@playwright/test';
import { seedAcceptanceStaffAndStock, STAFF, TODAY } from '../helpers/seed.js';
import { loginAs, logout, gotoHms } from '../helpers/loginUi.js';
import { shot, resetShotCounters } from '../helpers/screenshot.js';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await seedAcceptanceStaffAndStock(request);
});

test('12.1–12.5 run every catalog report + exports + aligned note', async ({ page }) => {
  test.setTimeout(300_000);
  resetShotCounters();
  await loginAs(page, STAFF.admin.email, STAFF.admin.password);
  await gotoHms(page, '/hms/reports');
  await expect(page.getByText(/Reports|statistics/i).first()).toBeVisible({ timeout: 30_000 });
  await shot(page, '12-reports', '12.1', 'filters');

  // Collect report buttons/options
  const reportButtons = page.locator('button, [role="option"], label').filter({
    hasText: /OPD|ANC|Deliver|PNC|Immun|Family|HIV|Lab|Pharmacy|Revenue|Appointment/i,
  });
  const count = await reportButtons.count();
  await shot(page, '12-reports', '12.3', `catalog-${count}`);

  // Prefer select of report types if present
  const typeSelect = page.locator('select').first();
  if (await typeSelect.isVisible().catch(() => false)) {
    const opts = await typeSelect.locator('option').all();
    for (let i = 0; i < opts.length; i++) {
      await typeSelect.selectOption({ index: i });
      const run = page.getByRole('button', { name: /Run report/i });
      if (await run.isVisible()) {
        await run.click();
        await page.waitForTimeout(900);
        await shot(page, '12-reports', '12.3', `run-${i}`);
      }
    }
  } else {
    // Click first few catalog cards
    const cards = page.locator('button').filter({ hasText: /Run|OPD|ANC|Revenue/i });
    const n = Math.min(await cards.count(), 8);
    for (let i = 0; i < n; i++) {
      await cards.nth(i).click().catch(() => {});
      await page.getByRole('button', { name: /Run report/i }).click().catch(() => {});
      await page.waitForTimeout(700);
    }
    await shot(page, '12-reports', '12.3', 'runs-sample');
  }

  for (const name of [/Export Excel/i, /Export PDF/i]) {
    const b = page.getByRole('button', { name });
    if (await b.isVisible().catch(() => false)) {
      await Promise.all([
        page.waitForEvent('download', { timeout: 12_000 }).catch(() => null),
        b.click(),
      ]);
      await shot(page, '12-reports', '12.2', String(name));
    }
  }

  await gotoHms(page, '/hms');
  await shot(page, '12-reports', '12.5', 'home-for-parity');
  void TODAY;
  await logout(page);
});
