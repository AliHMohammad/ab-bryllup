import { defineConfig, devices } from '@playwright/test';

/**
 * Testene kører mod Netlify Dev, så både den statiske side og
 * gæstebogsfunktionen (/api/guestbook) testes som i produktion.
 * Apps Script erstattes af en lokal mock — se tests/support/mock-apps-script.mjs.
 */

export const MOCK_PORT = 9999;
export const MOCK_URL = `http://localhost:${MOCK_PORT}`;
export const SITE_PORT = 8899;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // mock og rate limit deles på tværs af tests
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : [['list']],

  expect: {
    timeout: 7_000,
  },

  use: {
    baseURL: `http://localhost:${SITE_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'da-DK',
    timezoneId: 'Europe/Copenhagen',
  },

  projects: [
    {
      name: 'api',
      testMatch: /api\.spec\.ts/,
      use: {},
    },
    {
      name: 'mobil',
      testIgnore: /api\.spec\.ts/,
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'desktop',
      testIgnore: /api\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  webServer: [
    {
      command: 'node tests/support/mock-apps-script.mjs',
      url: `${MOCK_URL}/__test/rows`,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: `npm run build && npx netlify dev --port ${SITE_PORT} --no-open`,
      url: `http://localhost:${SITE_PORT}/robots.txt`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        APPS_SCRIPT_URL: MOCK_URL,
        APPS_SCRIPT_SECRET: 'test-secret',
      },
    },
  ],
});
