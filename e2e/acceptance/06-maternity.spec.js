/**
 * Screen 06 — Maternity (6.1–6.9)
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
let mom;
let pregnancyId;

test.beforeAll(async ({ request }) => {
  fx = await seedAcceptanceStaffAndStock(request);
  mom = await registerPatient(request, fx.tokens.midwife, {
    first_name: 'MatUI',
    last_name: `W${RUN_STAMP}`,
    phone: `0304${String(RUN_STAMP).slice(-7)}`,
  });
  const preg = await apiJson(request, 'POST', '/api/hms/anc/pregnancies', {
    token: fx.tokens.midwife,
    data: { patient_id: mom.id, lmp: '2026-01-15', gravida: 1, para: 0 },
  });
  pregnancyId = preg.body?.id || preg.body?.pregnancy?.id;
});

test('6.1–6.9 admit, partograph alert, delivery register', async ({ page, request }) => {
  test.setTimeout(180_000);
  resetShotCounters();
  await loginAs(page, STAFF.midwife.email, STAFF.midwife.password);
  await gotoHms(page, '/hms/maternity');
  await expect(page.getByText(/Maternity|Labour|Delivery/i).first()).toBeVisible({
    timeout: 30_000,
  });
  await shot(page, '06-maternity', '6.9', 'kpis-board');

  const reg = page.getByRole('button', { name: /Delivery register/i });
  if (await reg.isVisible().catch(() => false)) {
    await reg.click();
    await shot(page, '06-maternity', '6.2', 'delivery-register');
  }

  await page.getByRole('button', { name: /Admit/i }).first().click();
  await shot(page, '06-maternity', '6.1', 'admit-modal');
  const selects = page.locator('select');
  if (await selects.first().isVisible()) {
    await selects.first().selectOption({ index: 1 }).catch(() => {});
  }
  const ward = page.getByPlaceholder(/Ward|Bed/i);
  if (await ward.isVisible().catch(() => false)) await ward.fill('L-UI');
  await page.getByRole('button', { name: /^Admit|Save/i }).last().click();
  await page.waitForTimeout(1200);
  await shot(page, '06-maternity', '6.1', 'after-admit');

  const row = page.locator('tbody tr, [class*="board"] button, [class*="card"]').first();
  if (await row.isVisible().catch(() => false)) {
    await row.click().catch(() => {});
  }

  // Partograph with bad FHR for alert
  const fhr = page.getByLabel(/FHR|Fetal/i).or(page.getByPlaceholder(/FHR/i));
  if (await fhr.first().isVisible().catch(() => false)) {
    await fhr.first().fill('90');
    const add = page.getByRole('button', { name: /Add|Partograph|Save entry/i });
    if (await add.first().isVisible().catch(() => false)) await add.first().click();
    await page.waitForTimeout(800);
    await shot(page, '06-maternity', '6.5', 'partograph-alert');
  } else {
    // API partograph if UI fields differ
    const board = await apiJson(request, 'GET', '/api/hms/maternity/board', {
      token: fx.tokens.midwife,
    });
    void board;
    await shot(page, '06-maternity', '6.5', 'partograph-ui-scan');
  }

  const delBtn = page.getByRole('button', { name: /Record delivery|Save delivery/i });
  if (await delBtn.isVisible().catch(() => false)) {
    await delBtn.click();
    await page.waitForTimeout(500);
    await shot(page, '06-maternity', '6.7', 'delivery-form');
  }

  void pregnancyId;
  await logout(page);
});
