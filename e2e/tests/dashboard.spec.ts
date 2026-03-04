import { test, expect } from '../fixtures/auth';

test.describe('Dashboard', () => {
  test('dashboard page loads', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboards');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});
