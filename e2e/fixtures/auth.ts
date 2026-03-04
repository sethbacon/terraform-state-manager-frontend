import { test as base, Page } from '@playwright/test';

interface AuthFixtures {
  authenticatedPage: Page;
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to the app
    await page.goto('/');

    // Set up auth token in localStorage (bypass OIDC for E2E)
    // In test environments, use a pre-generated JWT or dev token
    const testToken = process.env.TSM_TEST_TOKEN || 'test-jwt-token';
    await page.evaluate((token) => {
      localStorage.setItem('tsm_auth_token', token);
    }, testToken);

    // Reload to pick up the token
    await page.goto('/');

    await use(page);
  },
});

export { expect } from '@playwright/test';
