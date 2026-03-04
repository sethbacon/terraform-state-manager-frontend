import { test, expect } from '../fixtures/auth';

test.describe('Backups', () => {
  test('backups page loads', async ({ authenticatedPage: page }) => {
    await page.goto('/backups');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});
