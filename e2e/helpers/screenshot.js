/**
 * Step screenshots for authority evidence.
 * Files: frontend/e2e/artifacts/screenshots/<screen>/<NNN>-<featureId>-<slug>.png
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SCREENSHOT_ROOT = path.resolve(__dirname, '../artifacts/screenshots');

const counters = new Map();

function safe(s) {
  return String(s || 'step')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} screen  e.g. '01-opd'
 * @param {string} featureId e.g. '1.8'
 * @param {string} slug e.g. 'order-lab'
 */
export async function shot(page, screen, featureId, slug) {
  const dir = path.join(SCREENSHOT_ROOT, safe(screen));
  fs.mkdirSync(dir, { recursive: true });
  const key = screen;
  const n = (counters.get(key) || 0) + 1;
  counters.set(key, n);
  const file = path.join(
    dir,
    `${String(n).padStart(3, '0')}-${safe(featureId)}-${safe(slug)}.png`
  );
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

export function resetShotCounters() {
  counters.clear();
}
