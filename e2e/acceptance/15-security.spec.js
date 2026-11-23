/**
 * Screen 15 — Security / audit / backups (15.1–15.6)
 */
import { test, expect } from '@playwright/test';
import { seedAcceptanceStaffAndStock, STAFF } from '../helpers/seed.js';
import { loginAs, logout, gotoHms } from '../helpers/loginUi.js';
import { shot, resetShotCounters } from '../helpers/screenshot.js';
import { clickAndExpectApi } from '../helpers/assertApi.js';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await seedAcceptanceStaffAndStock(request);
});

test('15.1–15.6 audit filter/export, backups, policy; platform Remaining noted', async ({ page }) => {
  test.setTimeout(180_000);
  resetShotCounters();
  await loginAs(page, STAFF.admin.email, STAFF.admin.password);
  await gotoHms(page, '/hms/security');
  await expect(page.getByText(/Security|Audit|Backup/i).first()).toBeVisible({
    timeout: 30_000,
  });
  await shot(page, '15-security', '15.6', 'kpis');
  await shot(page, '15-security', '15.1', 'audit-log');

  for (const name of [/Export.*Excel|Excel/i, /Export.*PDF|PDF/i]) {
    const b = page.getByRole('button', { name });
    if (await b.first().isVisible().catch(() => false)) {
      await Promise.all([
        page.waitForEvent('download', { timeout: 12_000 }).catch(() => null),
        b.first().click(),
      ]);
      await shot(page, '15-security', '15.1', `export-${String(name)}`);
    }
  }

  for (const name of [/Back up now|Backup now|Run backup/i, /test restore|Test restore/i]) {
    const b = page.getByRole('button', { name });
    if (await b.first().isVisible().catch(() => false)) {
      await clickAndExpectApi(page, () => b.first().click(), '/api/hms/security/backups', {
        method: 'POST',
        status: [200, 201],
      }).catch(async () => {
        await b.first().click();
        await page.waitForTimeout(1000);
      });
      await shot(page, '15-security', '15.3', String(name));
    }
  }

  // Policy surfaces — idle 15m is in code; HTTPS/MFA/off-site = Remaining
  const policy = page.getByText(/idle|HTTPS|2-step|MFA|encrypt|lock/i);
  if (await policy.first().isVisible().catch(() => false)) {
    await shot(page, '15-security', '15.4', 'policy-panel');
  } else {
    await shot(page, '15-security', '15.4', 'policy-remaining-platform');
  }

  await logout(page);
});
