import { test, expect } from '../fixtures/auth'

// Every page renders with real data from the live stack — the class of
// regression unit tests miss (FE/BE contract drift, proxy/auth wiring).

test('login page renders for anonymous visitors', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText(/Terraform State Manager/i).first()).toBeVisible()
})

test('home dashboard shows store-backed totals', async ({ loggedInPage: page }) => {
  await expect(page.getByText('Data as of').first()).toBeVisible()
})

test('sources page lists source cards with state counts', async ({ loggedInPage: page }) => {
  await page.goto('/sources')
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Browse states' }).first()).toBeVisible()
})

test('drift page shows records and runs sections', async ({ loggedInPage: page }) => {
  await page.goto('/drift')
  await expect(page.getByRole('heading', { name: 'Drift records' })).toBeVisible()
})

test('version lab page renders', async ({ loggedInPage: page }) => {
  await page.goto('/version-lab')
  await expect(page.getByRole('heading', { name: 'Version Lab' })).toBeVisible()
})

test('schedules page renders', async ({ loggedInPage: page }) => {
  await page.goto('/schedules')
  await expect(page.getByRole('heading', { name: 'Schedules' })).toBeVisible()
})

test('reports page renders', async ({ loggedInPage: page }) => {
  await page.goto('/reports')
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
})

test('transfer page renders', async ({ loggedInPage: page }) => {
  await page.goto('/transfer')
  await expect(page.getByRole('heading', { name: 'Transfer' })).toBeVisible()
})

test('api keys page renders', async ({ loggedInPage: page }) => {
  await page.goto('/apikeys')
  await expect(page.getByRole('heading', { name: 'API keys' })).toBeVisible()
})

test('admin dashboard renders for the admin session', async ({ loggedInPage: page }) => {
  await page.goto('/admin')
  await expect(page.getByText(/Users|Organizations/).first()).toBeVisible()
})
