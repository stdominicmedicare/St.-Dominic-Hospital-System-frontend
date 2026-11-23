/**
 * Screen 03 — Laboratory (3.1–3.11)
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
    first_name: 'LabUI',
    last_name: `L${RUN_STAMP}`,
    phone: `0302${String(RUN_STAMP).slice(-7)}`,
  });
  // seed an order via OPD path
  const visit = await apiJson(request, 'POST', '/api/hms/opd/check-in', {
    token: fx.tokens.doctor,
    data: { patient_id: patient.id, visit_type: 'new', chief_complaint: 'lab path' },
  });
  const cat = await apiJson(request, 'GET', '/api/hms/lab/catalogue', { token: fx.tokens.lab });
  const tests = Array.isArray(cat.body) ? cat.body : cat.body?.items || [];
  const testId = fx.labTestId || tests[0]?.id;
  if (visit.body?.id && testId) {
    await apiJson(request, 'POST', `/api/hms/opd/${visit.body.id}/order-lab`, {
      token: fx.tokens.doctor,
      data: { test_ids: [testId], priority: 'urgent' },
    });
  }
});

test('3.1–3.11 lab UI worklist, catalogue, walk-in, verify path', async ({ page }) => {
  test.setTimeout(180_000);
  resetShotCounters();
  await loginAs(page, STAFF.lab.email, STAFF.lab.password);
  await gotoHms(page, '/hms/lab');
  await expect(page.getByText(/Laborator|Worklist|Lab/i).first()).toBeVisible({ timeout: 30_000 });
  await shot(page, '03-lab', '3.10', 'kpis-worklist');

  const catBtn = page.getByRole('button', { name: /catalogue|prices/i });
  if (await catBtn.isVisible().catch(() => false)) {
    await catBtn.click();
    await shot(page, '03-lab', '3.2', 'catalogue');
  }

  const walk = page.getByRole('button', { name: /Walk-in/i });
  if (await walk.isVisible().catch(() => false)) {
    await walk.click();
    await shot(page, '03-lab', '3.1', 'walk-in-modal');
    await page.keyboard.press('Escape').catch(() => {});
  }

  // Filters
  for (const f of [/pending/i, /sample/i, /verif/i, /All/i]) {
    const b = page.getByRole('button', { name: f }).or(page.getByRole('tab', { name: f }));
    if (await b.first().isVisible().catch(() => false)) {
      await b.first().click().catch(() => {});
    }
  }
  await shot(page, '03-lab', '3.4', 'filters');

  const row = page.locator('tbody tr').first();
  if (await row.isVisible().catch(() => false)) {
    await row.click();
    await shot(page, '03-lab', '3.5', 'result-panel');

    for (const name of [/Collect/i, /In progress|Progress/i, /Save draft|Enter|Result/i, /Verify/i, /Send/i]) {
      const b = page.getByRole('button', { name });
      if (await b.first().isVisible().catch(() => false)) {
        await b.first().click();
        await page.waitForTimeout(700);
        await shot(page, '03-lab', '3.3', `action-${String(name)}`);
      }
    }

    const resultInp = page.getByLabel(/Result/i).or(page.getByPlaceholder(/Result/i));
    if (await resultInp.first().isVisible().catch(() => false)) {
      await resultInp.first().fill('12.5');
      await shot(page, '03-lab', '3.5', 'result-entered');
    }
  }

  await logout(page);

  // Verify denied without flag — API already; UI login as labNoVerify
  await loginAs(page, STAFF.labNoVerify.email, STAFF.labNoVerify.password);
  await gotoHms(page, '/hms/lab');
  await shot(page, '03-lab', '3.8', 'lab-without-verify-flag');
  await logout(page);
});
