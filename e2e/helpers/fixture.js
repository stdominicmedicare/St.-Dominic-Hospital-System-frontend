/**
 * Load fixture produced by acceptance/global-setup.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURE_PATH = path.resolve(__dirname, '../artifacts/acceptance-fixture.json');

export function loadFixture() {
  if (!fs.existsSync(FIXTURE_PATH)) {
    throw new Error(
      `Missing ${FIXTURE_PATH}. Run acceptance project so globalSetup seeds first.`
    );
  }
  return JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
}
