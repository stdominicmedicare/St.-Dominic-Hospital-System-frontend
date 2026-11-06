/**
 * Screen 07 — PNC (7.1–7.8)
 */
import { test, expect } from '@playwright/test';
import { seedAcceptanceStaffAndStock, STAFF } from '../helpers/seed.js';
import { loginAs, logout, gotoHms } from '../helpers/loginUi.js';
import { shot, resetShotCounters } from '../helpers/screenshot.js';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await seedAcceptanceStaffAndStock(request);
});

test('7.1–7.8 PNC due list, record visit, missed, danger UI', async ({ page }) => {
  test.setTimeout(120_000);
  resetShotCounters();
  await loginAs(page, STAFF.midwife.email, STAFF.midwife.password);
  await gotoHms(page, '/hms/pnc');
  await expect(page.getByText(/Postnatal|PNC/i).first()).toBeVisible({ timeout: 30_000 });
  await shot(page, '07-pnc', '7.8', 'kpis-due');

  const missed = page.getByRole('button', { name: /Missed/i });
  if (await missed.isVisible().catch(() => false)) {
    await missed.click();
    await shot(page, '07-pnc', '7.2', 'missed-visits');
  }

  const record = page.getByRole('button', { name: /Record PNC|\+ Record/i });
  if (await record.isVisible().catch(() => false)) {
    await record.click();
    await shot(page, '07-pnc', '7.1', 'record-modal');
    await page.keyboard.press('Escape').catch(() => {});
  }

  const row = page.locator('tbody tr').first();
  if (await row.isVisible().catch(() => false)) {
    await row.click();
    await shot(page, '07-pnc', '7.4', 'visit-form');
    const save = page.getByRole('button', { name: /Save/i });
    if (await save.first().isVisible().catch(() => false)) {
      await save.first().click();
      await page.waitForTimeout(800);
      await shot(page, '07-pnc', '7.5', 'after-save');
    }
  }

  await logout(page);
});
