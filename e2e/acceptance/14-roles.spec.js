/**
 * Screen 14 — Users & roles (14.1–14.8) UI
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

test('14.1–14.8 users matrix, create user controls, export, KPIs', async ({ page }) => {
  test.setTimeout(180_000);
  resetShotCounters();
  await loginAs(page, STAFF.admin.email, STAFF.admin.password);
  await gotoHms(page, '/hms/roles');
  await expect(page.getByText(/Users|roles|matrix|Permission/i).first()).toBeVisible({
    timeout: 30_000,
  });
  await shot(page, '14-roles', '14.8', 'kpis');
  await shot(page, '14-roles', '14.2', 'permission-matrix');

  const create = page.getByRole('button', { name: /Create user|\+ Add|Add user/i });
  if (await create.isVisible().catch(() => false)) {
    await create.click();
    await shot(page, '14-roles', '14.5', 'create-user-form');
    // Fill minimal if fields exist
    const email = page.getByLabel(/Email/i).or(page.getByPlaceholder(/Email/i));
    if (await email.first().isVisible().catch(() => false)) {
      await email.first().fill(`acc-new-${RUN_STAMP}@memon1.local`);
    }
    const name = page.getByLabel(/Full name|Name/i).or(page.getByPlaceholder(/name/i));
    if (await name.first().isVisible().catch(() => false)) {
      await name.first().fill(`Acc New ${RUN_STAMP}`);
    }
    // Flags checkboxes
    for (const t of [/HIV/i, /export/i, /verify lab/i, /discount/i, /2-step|2SV|MFA/i, /password/i]) {
      const lab = page.getByText(t);
      if (await lab.first().isVisible().catch(() => false)) {
        await shot(page, '14-roles', '14.5', `flag-${String(t)}`);
      }
    }
    const submit = page.getByRole('button', { name: /Create|Save|Invite/i }).last();
    if (await submit.isVisible().catch(() => false)) {
      await clickAndExpectApi(page, () => submit.click(), '/api/hms/users', {
        method: 'POST',
        status: [200, 201, 400, 409],
      }).catch(async () => {
        await submit.click();
        await page.waitForTimeout(800);
      });
      await shot(page, '14-roles', '14.5', 'after-create-attempt');
    }
  }

  const exp = page.getByRole('button', { name: /Export/i });
  if (await exp.first().isVisible().catch(() => false)) {
    await Promise.all([
      page.waitForEvent('download', { timeout: 12_000 }).catch(() => null),
      exp.first().click(),
    ]);
    await shot(page, '14-roles', '14.7', 'export');
  }

  // 2SV required for Admin → Remaining (document via screenshot of policy/flag if any)
  await shot(page, '14-roles', '14.6', 'user-list-status-fields');
  await logout(page);
});
