/**
 * Screen 11 — Billing (11.1–11.9)
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
import { apiJson } from '../helpers/auth.js';

test.describe.configure({ mode: 'serial' });

let fx;
let patient;

test.beforeAll(async ({ request }) => {
  fx = await seedAcceptanceStaffAndStock(request);
  patient = await registerPatient(request, fx.tokens.doctor, {
    first_name: 'BillUI',
    last_name: `B${RUN_STAMP}`,
    phone: `0307${String(RUN_STAMP).slice(-7)}`,
  });
  const visit = await apiJson(request, 'POST', '/api/hms/opd/check-in', {
    token: fx.tokens.doctor,
    data: { patient_id: patient.id, visit_type: 'new', chief_complaint: 'billing' },
  });
  if (visit.body?.id) {
    await apiJson(request, 'POST', `/api/hms/opd/${visit.body.id}/complete`, {
      token: fx.tokens.doctor,
      data: {},
    });
  }
  await apiJson(request, 'POST', '/api/hms/billing/ensure-open', {
    token: fx.tokens.accounts,
    data: { patient_id: patient.id },
  }).catch(() => {});
});

test('11.1–11.9 billing list, pay, cash summary, price list, manual charge', async ({ page }) => {
  test.setTimeout(180_000);
  resetShotCounters();
  await loginAs(page, STAFF.accounts.email, STAFF.accounts.password);
  await gotoHms(page, '/hms/billing');
  await expect(page.getByText(/Billing|Invoice|receipt/i).first()).toBeVisible({
    timeout: 30_000,
  });
  await shot(page, '11-billing', '11.9', 'kpis');

  for (const name of [/cash summary/i, /Price list/i]) {
    const b = page.getByRole('button', { name });
    if (await b.first().isVisible().catch(() => false)) {
      await b.first().click();
      await page.waitForTimeout(500);
      await shot(page, '11-billing', '11.3', String(name));
    }
  }

  await shot(page, '11-billing', '11.2', 'manual-charge-section');

  const row = page.locator('tbody tr').first();
  if (await row.isVisible().catch(() => false)) {
    await row.click();
    await shot(page, '11-billing', '11.6', 'payment-panel');
    const pay = page.getByRole('button', { name: /Take payment/i });
    if (await pay.isVisible().catch(() => false)) {
      const amount = page.getByLabel(/Amount|received/i).or(page.getByPlaceholder(/Amount/i));
      if (await amount.first().isVisible().catch(() => false)) await amount.first().fill('10');
      await pay.click();
      await page.waitForTimeout(1000);
      await shot(page, '11-billing', '11.6', 'after-pay');
    }
    for (const n of [/Waive/i, /Insurance/i, /Credit note/i]) {
      const b = page.getByRole('button', { name: n });
      if (await b.first().isVisible().catch(() => false)) {
        await shot(page, '11-billing', '11.4', `control-${String(n)}`);
      }
    }
  }

  await logout(page);
});
