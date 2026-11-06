/**
 * Screen 04 — Pharmacy (4.1–4.8)
 */
import { test, expect } from '@playwright/test';
import { seedAcceptanceStaffAndStock, STAFF } from '../helpers/seed.js';
import { loginAs, logout, gotoHms } from '../helpers/loginUi.js';
import { shot, resetShotCounters } from '../helpers/screenshot.js';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await seedAcceptanceStaffAndStock(request);
});

test('4.1–4.8 pharmacy tabs: dispense, stock, GRN, adjust, expiry', async ({ page }) => {
  test.setTimeout(120_000);
  resetShotCounters();
  await loginAs(page, STAFF.pharmacy.email, STAFF.pharmacy.password);
  await gotoHms(page, '/hms/pharmacy');
  await expect(page.getByText(/Pharmacy|Dispense|Stock/i).first()).toBeVisible({ timeout: 30_000 });
  await shot(page, '04-pharmacy', '4.8', 'kpis');

  const tabs = [
    [/dispense|To dispense/i, '4.3'],
    [/Stock/i, '4.5'],
    [/Receive|GRN/i, '4.2'],
    [/Adjust/i, '4.2'],
    [/Expir/i, '4.5'],
  ];

  for (const [name, id] of tabs) {
    const btn = page.getByRole('button', { name }).or(page.getByRole('tab', { name }));
    if (await btn.first().isVisible().catch(() => false)) {
      await btn.first().click();
      await page.waitForTimeout(500);
      await shot(page, '04-pharmacy', id, `tab-${String(name)}`);
    }
  }

  const row = page.locator('tbody tr').first();
  if (await row.isVisible().catch(() => false)) {
    await row.click();
    await shot(page, '04-pharmacy', '4.4', 'dispense-panel');
    for (const n of [/Dispense/i, /Partial/i]) {
      const b = page.getByRole('button', { name: n });
      if (await b.first().isVisible().catch(() => false)) {
        await b.first().click();
        await page.waitForTimeout(800);
        await shot(page, '04-pharmacy', '4.4', `action-${String(n)}`);
        break;
      }
    }
  }

  const recv = page.getByRole('button', { name: /Receive stock|\+ Receive/i });
  if (await recv.isVisible().catch(() => false)) {
    await recv.click();
    await shot(page, '04-pharmacy', '4.2', 'receive-modal');
    await page.keyboard.press('Escape').catch(() => {});
  }

  await logout(page);
});
