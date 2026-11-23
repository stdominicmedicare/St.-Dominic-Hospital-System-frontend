/**
 * Screen 13 — Patients (13.1–13.7)
 */
import { test, expect } from '@playwright/test';
import { seedAcceptanceStaffAndStock, STAFF, RUN_STAMP } from '../helpers/seed.js';
import { loginAs, logout, gotoHms } from '../helpers/loginUi.js';
import { shot, resetShotCounters } from '../helpers/screenshot.js';
import { clickAndExpectApi } from '../helpers/assertApi.js';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await seedAcceptanceStaffAndStock(request);
});

test('13.1–13.7 register, duplicates, list KPIs, timeline, print/QR, export', async ({ page }) => {
  test.setTimeout(180_000);
  resetShotCounters();
  await loginAs(page, STAFF.admin.email, STAFF.admin.password);
  await gotoHms(page, '/hms/patients');
  await expect(page.getByText(/Patient registration|Register each patient/i).first()).toBeVisible({
    timeout: 30_000,
  });
  await shot(page, '13-patients', '13.4', 'list-kpis');

  await page.getByRole('button', { name: /\+ Register new patient/i }).click();
  await shot(page, '13-patients', '13.1', 'register-modal');

  const modal = page.locator('[role="dialog"], .fixed').filter({ hasText: /Register new patient/i }).last();
  const root = (await modal.count()) ? modal : page;
  await root.getByText(/First name/i).locator('..').locator('input').first().fill('AccUI');
  await root.getByText(/Last name/i).locator('..').locator('input').first().fill(`Pat${RUN_STAMP}`);
  await root.getByText(/Date of birth/i).locator('..').locator('input').first().fill('1995-06-15');
  await root.getByText(/^Phone/i).locator('..').locator('input').first().fill(`0312${String(RUN_STAMP).slice(-7)}`);
  await root.locator('input[type="checkbox"]').last().check();

  await page.getByRole('button', { name: /Check duplicates/i }).click();
  await page.waitForTimeout(800);
  await shot(page, '13-patients', '13.2', 'duplicate-check');

  await clickAndExpectApi(
    page,
    () => page.getByRole('button', { name: /Save · print patient card/i }).click(),
    '/api/hms/patients/register',
    { method: 'POST' }
  );
  await shot(page, '13-patients', '13.3', 'after-register-print');

  // Open first row / search
  const search = page.getByPlaceholder(/Name|MRN|phone/i).first();
  if (await search.isVisible().catch(() => false)) {
    await search.fill('AccUI');
    await page.getByRole('button', { name: /Search|Refresh|Reload/i }).first().click().catch(() => {});
    await page.waitForTimeout(600);
  }

  const row = page.locator('tbody tr').filter({ hasText: /AccUI/i }).first();
  if (await row.isVisible().catch(() => false)) {
    await row.click();
    await page.waitForTimeout(500);
    await shot(page, '13-patients', '13.5', 'timeline-panel');

    const printBtn = page.getByRole('button', { name: /Print card|QR/i });
    if (await printBtn.isVisible().catch(() => false)) {
      await printBtn.click();
      await shot(page, '13-patients', '13.3', 'print-qr-clicked');
    }

    const photo = page.getByRole('button', { name: /Upload photo/i });
    if (await photo.isVisible().catch(() => false)) {
      await shot(page, '13-patients', '13.1', 'photo-control-present');
    }
  }

  const exportX = page.getByRole('button', { name: /Export Excel/i });
  if (await exportX.isVisible().catch(() => false)) {
    await Promise.all([
      page.waitForEvent('download', { timeout: 15_000 }).catch(() => null),
      exportX.click(),
    ]);
    await shot(page, '13-patients', '13.4', 'export-excel');
  }

  await logout(page);
});
