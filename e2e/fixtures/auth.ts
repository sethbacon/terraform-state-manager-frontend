import { test as base, expect, type Page } from '@playwright/test'

// loggedInPage: a page whose browser context holds a dev-login session
// (cookie auth). page.request shares the context's cookie jar, so the
// HttpOnly tsm_auth_token from the API call is visible to the app.
export const test = base.extend<{ loggedInPage: Page }>({
  loggedInPage: async ({ page }, use) => {
    const resp = await page.request.post('/api/v1/dev/login')
    expect(resp.ok(), 'dev login must succeed (is the compose stack up with DEV_MODE?)').toBeTruthy()
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
    await use(page)
  },
})

// csrfToken reads the double-submit cookie so API helpers can mutate.
export async function csrfToken(page: Page): Promise<string> {
  const cookies = await page.context().cookies()
  return cookies.find((c) => c.name === 'tsm_csrf')?.value ?? ''
}

export { expect }
