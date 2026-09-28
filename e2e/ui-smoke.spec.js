import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import {
  ADMIN_EMAIL,
  ADMIN_PASS,
  SUPABASE_URL,
  SUPABASE_ANON,
  supabaseLogin,
  apiJson,
  API_URL,
} from './helpers/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendEnv = path.resolve(__dirname, '../../Memon-HMS-Backend/.env');
for (const line of fs.readFileSync(backendEnv, 'utf8').split('\n')) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!process.env[m[1]]) process.env[m[1]] = v;
}

const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STAFF_EMAIL = process.env.QA_MIDWIFE_EMAIL || 'pw-midwife@memon1.local';
const STAFF_PASS = process.env.QA_MIDWIFE_PASSWORD || 'TestMidwife@123!';

async function ensureMidwifeUser() {
  if (!SERVICE) throw new Error('SUPABASE_SERVICE_ROLE_KEY required for staff UI user');
  const admin = createClient(SUPABASE_URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Try login first in case user exists from prior run with fixed email
  const client = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const existing = await client.auth.signInWithPassword({ email: STAFF_EMAIL, password: STAFF_PASS });
  if (!existing.error) return { email: STAFF_EMAIL, password: STAFF_PASS };

  const { data, error } = await admin.auth.admin.createUser({
    email: STAFF_EMAIL,
    password: STAFF_PASS,
    email_confirm: true,
    user_metadata: { full_name: 'Playwright Midwife', role: 'Midwife' },
  });
  if (error && !/already/i.test(error.message)) throw error;
  const userId = data?.user?.id;
  if (userId) {
    await admin.from('profiles').upsert({
      id: userId,
      email: STAFF_EMAIL,
      full_name: 'Playwright Midwife',
      role: 'Midwife',
      is_active: true,
      password_changed_at: new Date().toISOString(),
    });
  }
  return { email: STAFF_EMAIL, password: STAFF_PASS };
}

test.describe('UI smoke — public', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /MEMON COMMUNITY HOSPITAL/i })).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('signup page renders', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('form').first()).toBeVisible();
  });

  test('wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"], input[name="email"]').first().fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').first().fill('DefinitelyWrongPass@999');
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await expect(page.getByText(/invalid|error|failed|incorrect|wrong/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});

test.describe('UI smoke — admin login', () => {
  test('admin login reaches admin dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"], input[name="email"]').first().fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    await expect(page.getByRole('heading', { name: /Dashboard Analytics|Admin/i }).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});

test.describe('UI modules as Midwife', () => {
  let staff;

  test.beforeAll(async () => {
    staff = await ensureMidwifeUser();
  });

  test('midwife can open MCH, OPD, programs pages', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"], input[name="email"]').first().fill(staff.email);
    await page.locator('input[type="password"]').first().fill(staff.password);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await page.waitForURL(/\/(midwife|opd|staff|admin)/, { timeout: 30_000 });

    const routes = [
      { path: '/midwife', text: /Midwife|MCH|Antenatal|ANC|Labour/i },
      { path: '/opd', text: /OPD/i },
      { path: '/programs', text: /Immunization|Family planning|HIV|Clinical programs/i },
      { path: '/lab', text: /Laboratory|Lab|Worklist|order/i },
    ];

    for (const r of routes) {
      await page.goto(r.path);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('body')).toContainText(r.text, { timeout: 15_000 });
    }
  });

  test('accounts page forbidden for midwife', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"], input[name="email"]').first().fill(staff.email);
    await page.locator('input[type="password"]').first().fill(staff.password);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await page.waitForURL(/\/(midwife|opd|staff|admin)/, { timeout: 30_000 });
    await page.goto('/accounts');
    await page.waitForLoadState('domcontentloaded');
    const body = await page.locator('body').innerText();
    // RoleGuard redirects away from Accounts
    expect(/Accounts|Billing/i.test(body) && /invoice/i.test(body)).toBeFalsy();
  });
});

test('supabase helper login works', async () => {
  const auth = await supabaseLogin();
  expect(auth.accessToken).toBeTruthy();
});

test('API still healthy from UI suite context', async ({ request }) => {
  const res = await request.get(`${API_URL}/`);
  expect(res.ok()).toBeTruthy();
  const auth = await supabaseLogin();
  const me = await apiJson(request, 'GET', '/api/auth/me', { token: auth.accessToken });
  expect(me.status).toBe(200);
});
