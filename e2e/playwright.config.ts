import { defineConfig, devices } from '@playwright/test'

// Smoke pack against the running dev compose stack (frontend :3001 proxies
// /api to the backend). Deliberately thin: chromium only, serial workers
// (tests share the live backend), trace/screenshot kept on failure.
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.TSM_E2E_BASE_URL ?? 'http://localhost:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
})
