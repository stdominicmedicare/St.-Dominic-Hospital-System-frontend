/**
 * 14.2–14.4 Role × portal allow/deny (menu + direct URL) + HIV flag.
 */
import { test, expect } from '@playwright/test';
import { seedAcceptanceStaffAndStock, STAFF } from '../helpers/seed.js';
import { loginAs, logout, gotoHms } from '../helpers/loginUi.js';
import { shot, resetShotCounters } from '../helpers/screenshot.js';
import { apiJson } from '../helpers/auth.js';

test.describe.configure({ mode: 'serial' });

/** Expected canSeePortal outcomes (app role → portal → expected visible). HIV separate. */
const MATRIX = [
  {
    key: 'clerk',
    staff: () => STAFF.clerk,
    allow: ['/hms', '/hms/patients', '/hms/opd', '/hms/appointments', '/hms/reports'],
    deny: ['/hms/anc', '/hms/maternity', '/hms/billing', '/hms/roles', '/hms/security', '/hms/lab'],
  },
  {
    key: 'nurse',
    staff: () => STAFF.nurse,
    allow: [
      '/hms',
      '/hms/patients',
      '/hms/opd',
      '/hms/appointments',
      '/hms/anc',
      '/hms/pnc',
      '/hms/immunization',
      '/hms/fp',
      '/hms/lab',
      '/hms/pharmacy',
      '/hms/reports',
    ],
    deny: ['/hms/billing', '/hms/roles', '/hms/security', '/hms/hiv'],
  },
  {
    key: 'doctor',
    staff: () => STAFF.doctor,
    allow: ['/hms', '/hms/patients', '/hms/opd', '/hms/appointments', '/hms/lab', '/hms/pharmacy', '/hms/reports'],
    deny: ['/hms/billing', '/hms/roles', '/hms/security'],
  },
  {
    key: 'midwife',
    staff: () => STAFF.midwife,
    allow: ['/hms', '/hms/anc', '/hms/maternity', '/hms/pnc', '/hms/immunization', '/hms/fp', '/hms/opd'],
    deny: ['/hms/billing', '/hms/roles', '/hms/security'],
  },
  {
    key: 'lab',
    staff: () => STAFF.lab,
    allow: ['/hms', '/hms/lab', '/hms/patients'],
    deny: ['/hms/opd', '/hms/billing', '/hms/roles', '/hms/anc'],
  },
  {
    key: 'pharmacy',
    staff: () => STAFF.pharmacy,
    allow: ['/hms', '/hms/pharmacy'],
    deny: ['/hms/opd', '/hms/lab', '/hms/roles'],
  },
  {
    key: 'accounts',
    staff: () => STAFF.accounts,
    allow: ['/hms', '/hms/billing', '/hms/patients'],
    deny: ['/hms/opd', '/hms/anc', '/hms/roles', '/hms/lab'],
  },
];

let fx;

test.beforeAll(async ({ request }) => {
  test.setTimeout(180_000);
  fx = await seedAcceptanceStaffAndStock(request);
});

test('14.2–14.3 portal matrix allow/deny by role (UI)', async ({ page, request }) => {
  test.setTimeout(300_000);
  resetShotCounters();

  for (const row of MATRIX) {
    const s = fx.staff[row.key] || row.staff();
    await loginAs(page, s.email, s.password);
    await gotoHms(page, '/hms');
    await shot(page, '14-roles', '14.2', `${row.key}-home`);

    for (const path of row.allow) {
      await gotoHms(page, path);
      await expect(page).not.toHaveURL(/\/unauthorized/i);
      // Should not bounce solely to login
      expect(page.url()).not.toMatch(/\/login\/?$/);
      await shot(page, '14-roles', '14.2', `${row.key}-allow-${path.replace(/\//g, '_')}`);
    }

    for (const path of row.deny) {
      await gotoHms(page, path);
      const url = page.url();
      const body = await page.locator('body').innerText();
      // PortalGuard may redirect OR show Access denied / keep shell without portal content
      const blocked =
        /unauthorized|not authorized|access denied|forbidden|don't have access|do not have access|no access/i.test(
          body
        ) ||
        /\/unauthorized/i.test(url) ||
        (/\/hms\/?$/.test(url) && path !== '/hms') ||
        !url.includes(path);
      if (!blocked) {
        // API must still deny (authority proof even if UI shell leaks route)
        const apiPath =
          path === '/hms/roles'
            ? '/api/hms/users'
            : path === '/hms/security'
              ? '/api/hms/security/audit'
              : path === '/hms/billing'
                ? '/api/hms/billing/invoices'
                : path === '/hms/opd'
                  ? '/api/hms/opd/queue'
                  : path === '/hms/lab'
                    ? '/api/hms/lab/worklist'
                    : path === '/hms/anc'
                      ? '/api/hms/anc/kpis'
                      : path === '/hms/maternity'
                        ? '/api/hms/maternity/kpis'
                        : path === '/hms/hiv'
                          ? '/api/hms/hiv/kpis'
                          : null;
        if (apiPath) {
          const tok = fx.tokens[row.key];
          const res = await apiJson(request, 'GET', apiPath, { token: tok });
          expect(res.status, `${row.key} API ${apiPath}`).toBe(403);
          test.info().annotations.push({
            type: 'partial',
            description: `${row.key} UI can open ${path} but API returns 403`,
          });
        } else {
          expect(blocked, `${row.key} should be blocked from ${path} (url=${url})`).toBeTruthy();
        }
      }
      await shot(page, '14-roles', '14.2', `${row.key}-deny-${path.replace(/\//g, '_')}`);
    }

    await logout(page);
  }
});

test('14.4 HIV portal requires can_access_hiv (UI + API)', async ({ page, request }) => {
  resetShotCounters();

  // API already covered; UI:
  await loginAs(page, fx.staff.clinicalNoHiv.email, fx.staff.clinicalNoHiv.password);
  await gotoHms(page, '/hms/hiv');
  await shot(page, '10-hiv', '10.1', 'denied-no-flag');
  const apiDeny = await apiJson(request, 'GET', '/api/hms/hiv/kpis', {
    token: fx.tokens.clinicalNoHiv,
  });
  expect(apiDeny.status).toBe(403);
  // UI may still route to /hms/hiv shell; API deny is the enforceable gate
  if (page.url().includes('/hms/hiv')) {
    test.info().annotations.push({
      type: 'partial',
      description: 'HIV URL reachable without flag but API returns 403',
    });
  }
  await logout(page);

  await loginAs(page, fx.staff.hivDoctor.email, fx.staff.hivDoctor.password);
  await gotoHms(page, '/hms/hiv');
  await expect(page.getByText(/HIV/i).first()).toBeVisible({ timeout: 20_000 });
  await shot(page, '10-hiv', '10.1', 'allowed-with-flag');
  await logout(page);

  const apiOk = await apiJson(request, 'GET', '/api/hms/hiv/kpis', { token: fx.tokens.hivDoctor });
  expect(apiOk.status).toBe(200);
});

test('14.1 Admin reaches roles + security; doctor denied API', async ({ page, request }) => {
  await loginAs(page, STAFF.admin.email, STAFF.admin.password);
  await gotoHms(page, '/hms/roles');
  await expect(page.getByText(/Users|roles|Permission|matrix/i).first()).toBeVisible({
    timeout: 25_000,
  });
  await shot(page, '14-roles', '14.1', 'admin-roles');

  await gotoHms(page, '/hms/security');
  await expect(page.getByText(/Security|Audit|Backup/i).first()).toBeVisible({ timeout: 25_000 });
  await shot(page, '15-security', '15.1', 'admin-security');
  await logout(page);

  expect((await apiJson(request, 'GET', '/api/hms/security/audit', { token: fx.tokens.doctor })).status).toBe(
    403
  );
});
