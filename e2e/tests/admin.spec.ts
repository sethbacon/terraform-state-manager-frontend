import { test, expect } from '../fixtures/auth';

test.describe('Admin Pages', () => {
  test('users page loads', async ({ authenticatedPage: page }) => {
    await page.goto('/admin/users');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('organizations page loads', async ({ authenticatedPage: page }) => {
    await page.goto('/admin/organizations');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('scheduler page loads', async ({ authenticatedPage: page }) => {
    await page.goto('/admin/scheduler');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});
