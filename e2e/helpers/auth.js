/**
 * Shared auth helpers for Playwright API + UI tests.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}

// Prefer workspace backend/.env (Memon layout); keep legacy path as fallback.
loadEnvFile(path.resolve(__dirname, '../../../backend/.env'));
loadEnvFile(path.resolve(__dirname, '../../../Memon-HMS-Backend/.env'));
loadEnvFile(path.resolve(__dirname, '../../.env'));
loadEnvFile(path.resolve(__dirname, '../../../frontend/.env'));

export const API_URL = (
  process.env.PLAYWRIGHT_API_URL ||
  process.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:5000'
)
  .replace(/\/$/, '')
  .replace(/\/api$/, '');
export const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
export const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || 'admin@memon1.local';
export const ADMIN_PASS = process.env.QA_ADMIN_PASSWORD || 'Medicare@123@#';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function supabaseLogin(email = ADMIN_EMAIL, password = ADMIN_PASS) {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_ANON_KEY for Playwright auth');
  }
  const client = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let lastErr;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (!error) {
      return {
        accessToken: data.session.access_token,
        user: data.user,
        client,
      };
    }
    lastErr = error;
    if (/rate limit/i.test(error.message) && attempt < 6) {
      await sleep(5000 * attempt);
      continue;
    }
    break;
  }
  throw new Error(`Login failed: ${lastErr?.message || 'unknown'}`);
}

export function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function apiJson(request, method, path, { token, data } = {}) {
  const url = path.startsWith('http') ? path : `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await request.fetch(url, {
    method,
    headers: token ? authHeaders(token) : { 'Content-Type': 'application/json' },
    data: data != null ? JSON.stringify(data) : undefined,
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status(), body, ok: res.ok() };
}
