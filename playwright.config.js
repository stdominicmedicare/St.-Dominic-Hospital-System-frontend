// @ts-check
import { defineConfig, devices } from '@playwright/test';

const FRONTEND = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173';
const API = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:5000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  outputDir: 'e2e/artifacts/test-results',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: FRONTEND,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Video needs Playwright ffmpeg; CDN often blocked — step PNGs via shot() are the evidence
    video: 'off',
    launchOptions: {
      slowMo: Number(process.env.PLAYWRIGHT_SLOW_MO || 0) || 0,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Prefer system Chrome when Playwright CDN install is blocked/timed out
        channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
      },
    },
    {
      name: 'acceptance',
      testMatch: /acceptance\/.*\.spec\.js/,
      timeout: 180_000,
      dependencies: [],
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
      },
    },
  ],
  globalSetup: process.env.PW_SKIP_GLOBAL_SETUP
    ? undefined
    : './e2e/acceptance/global-setup.js',
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  metadata: { apiURL: API },
});
