import { test, expect } from '@playwright/test';

test.describe('Setup Wizard', () => {
  test('setup page is accessible', async ({ page }) => {
    await page.goto('/setup');
    // Setup page should render without requiring auth
    await expect(page.locator('body')).toBeVisible();
  });
});
