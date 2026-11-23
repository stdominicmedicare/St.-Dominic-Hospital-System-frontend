/**
 * One-time seed before acceptance project — avoids Supabase auth rate limits.
 */
import fs from 'fs';
import path from 'path';
import { request as playwrightRequest } from '@playwright/test';
import { seedAcceptanceStaffAndStock } from '../helpers/seed.js';
import { FIXTURE_PATH } from '../helpers/fixture.js';
import { API_URL } from '../helpers/auth.js';

export default async function globalSetup() {
  fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
  const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
  try {
    const health = await ctx.get('/');
    if (!health.ok()) {
      throw new Error(`Backend not healthy at ${API_URL}: ${health.status()}`);
    }
    // Prefer cache; force reseed only when FORCE_RESEED=1
    await seedAcceptanceStaffAndStock(ctx, { force: process.env.FORCE_RESEED === '1' });
    console.log(`[acceptance globalSetup] fixture ready at ${FIXTURE_PATH}`);
  } finally {
    await ctx.dispose();
  }
}
