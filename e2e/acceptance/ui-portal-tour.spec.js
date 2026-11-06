/**
 * Authority UI tour — login once as Admin, visit every /hms portal, screenshot each feature screen.
 * Complements deeper interaction specs; guarantees visual evidence for screens 00–15.
 */
import { test, expect } from '@playwright/test';
import { STAFF } from '../helpers/seed.js';
import { loginAs, logout, gotoHms } from '../helpers/loginUi.js';
import { shot, resetShotCounters } from '../helpers/screenshot.js';

const PORTALS = [
  { path: '/hms', screen: '00-home', id: '0.4', expect: /Dashboard/i },
  { path: '/hms/patients', screen: '13-patients', id: '13.4', expect: /Patient|Register/i },
  { path: '/hms/opd', screen: '01-opd', id: '1.4', expect: /OPD|Outpatient|Check in/i },
  { path: '/hms/appointments', screen: '02-appointments', id: '2.7', expect: /Appointment/i },
  { path: '/hms/lab', screen: '03-lab', id: '3.10', expect: /Lab|Worklist|Laborator/i },
  { path: '/hms/pharmacy', screen: '04-pharmacy', id: '4.8', expect: /Pharmacy|Dispense|Stock/i },
  { path: '/hms/anc', screen: '05-anc', id: '5.9', expect: /ANC|Antenatal|pregnanc/i },
  { path: '/hms/maternity', screen: '06-maternity', id: '6.9', expect: /Maternity|Labour|Delivery/i },
  { path: '/hms/pnc', screen: '07-pnc', id: '7.8', expect: /PNC|Postnatal/i },
  { path: '/hms/immunization', screen: '08-immunization', id: '8.7', expect: /Immunization|Vaccine/i },
  { path: '/hms/fp', screen: '09-fp', id: '9.8', expect: /Family planning|FP/i },
  { path: '/hms/billing', screen: '11-billing', id: '11.9', expect: /Billing|Invoice|receipt/i },
  { path: '/hms/reports', screen: '12-reports', id: '12.3', expect: /Report/i },
  { path: '/hms/roles', screen: '14-roles', id: '14.2', expect: /Users|roles|matrix|Permission/i },
  { path: '/hms/security', screen: '15-security', id: '15.1', expect: /Security|Audit|Backup/i },
];

test.describe.configure({ mode: 'serial' });

test('0.1 + portal tour screenshots for Admin (00–15 except HIV)', async ({ page }) => {
  test.setTimeout(300_000);
  resetShotCounters();
  await loginAs(page, STAFF.admin.email, STAFF.admin.password);
  await shot(page, '00-home', '0.1', 'after-login');

  for (const p of PORTALS) {
    await gotoHms(page, p.path);
    await expect(page.getByText(p.expect).first()).toBeVisible({ timeout: 25_000 });
    await shot(page, p.screen, p.id, 'portal-loaded');
  }

  // HIV requires flag — Admin without flag should be blocked
  await gotoHms(page, '/hms/hiv');
  await shot(page, '10-hiv', '10.1', 'admin-without-flag-or-allowed');
  await logout(page);
  await shot(page, '00-home', '0.1', 'after-logout');
});

test('10.1 HIV portal with can_access_hiv doctor', async ({ page }) => {
  test.setTimeout(120_000);
  resetShotCounters();
  await loginAs(page, STAFF.hivDoctor.email, STAFF.hivDoctor.password);
  await gotoHms(page, '/hms/hiv');
  await expect(page.getByText(/HIV|ART|HTS|Viral|Refill/i).first()).toBeVisible({
    timeout: 25_000,
  });
  await shot(page, '10-hiv', '10.2', 'tabs-visible');
  await logout(page);
});
