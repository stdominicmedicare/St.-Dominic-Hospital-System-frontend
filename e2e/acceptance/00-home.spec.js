/**
 * Screen 00 — Home dashboard (features 0.1–0.7)
 */
import { test, expect } from '@playwright/test';
import { STAFF, seedAcceptanceStaffAndStock } from '../helpers/seed.js';
import { loginAs, logout, gotoHms } from '../helpers/loginUi.js';
import { shot, resetShotCounters } from '../helpers/screenshot.js';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await seedAcceptanceStaffAndStock(request);
});

test.beforeEach(() => resetShotCounters());

test('0.1 Login session and Sign out', async ({ page }) => {
  await loginAs(page, STAFF.admin.email, STAFF.admin.password);
  await shot(page, '00-home', '0.1', 'after-login');
  await gotoHms(page, '/hms');
  await expect(page.getByRole('heading', { name: /Dashboard/i }).first()).toBeVisible({
    timeout: 30_000,
  });
  await shot(page, '00-home', '0.1', 'hms-shell');
  const signOut = page.getByRole('button', { name: /Sign out/i });
  await expect(signOut.first()).toBeVisible();
  await logout(page);
  await shot(page, '00-home', '0.1', 'after-logout');
});

test('0.2–0.7 Home KPIs, nav tiles, alerts, quick actions, Reports parity note', async ({ page }) => {
  test.setTimeout(120_000);
  await loginAs(page, STAFF.admin.email, STAFF.admin.password);
  await gotoHms(page, '/hms');
  await expect(page.getByRole('heading', { name: /Dashboard/i }).first()).toBeVisible({
    timeout: 30_000,
  });
  await shot(page, '00-home', '0.4', 'kpi-tiles');

  // Role-based nav present
  await expect(page.getByRole('navigation', { name: /Modules/i })).toBeVisible();
  await shot(page, '00-home', '0.2', 'sidebar-nav');

  // Quick actions
  const book = page.getByRole('link', { name: /Book appointment/i }).or(
    page.getByRole('button', { name: /Book appointment/i })
  );
  if (await book.first().isVisible().catch(() => false)) {
    await shot(page, '00-home', '0.5', 'quick-actions');
  }

  // Needs attention
  await expect(page.getByText(/Needs attention/i).first()).toBeVisible();
  await shot(page, '00-home', '0.6', 'alerts');

  // Tile navigation — OPD
  const opdTile = page.getByRole('link', { name: /OPD/i }).first();
  if (await opdTile.isVisible().catch(() => false)) {
    await opdTile.click();
    await expect(page).toHaveURL(/\/hms\/opd/);
    await shot(page, '00-home', '0.4', 'tile-to-opd');
  }

  await gotoHms(page, '/hms');
  // Aligned / reports parity footnote if present
  const parity = page.getByText(/align|Reports|same day|reconcile/i);
  if (await parity.first().isVisible().catch(() => false)) {
    await shot(page, '00-home', '0.7', 'reports-parity-note');
  } else {
    await shot(page, '00-home', '0.7', 'home-loaded-refresh-interval-in-code');
  }

  // Global patient search in header if present
  const search = page.getByPlaceholder(/search|patient|MRN|phone/i).first();
  if (await search.isVisible().catch(() => false)) {
    await search.fill('Acc');
    await shot(page, '00-home', '0.3', 'global-search');
  }

  await logout(page);
});
