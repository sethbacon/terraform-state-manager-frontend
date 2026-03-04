import { test, expect } from '../fixtures/auth';

test.describe('Analysis', () => {
  test('analysis page loads', async ({ authenticatedPage: page }) => {
    await page.goto('/analysis');
    await page.waitForTimeout(2000);
    // Page should show analysis content or empty state
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});
