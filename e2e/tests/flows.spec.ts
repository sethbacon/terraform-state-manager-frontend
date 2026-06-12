import { test, expect, csrfToken } from '../fixtures/auth'

// One critical flow per capability pillar, end to end through the real stack.

test('browse a state: analysis, outputs, and history tabs', async ({ loggedInPage: page }) => {
  await page.goto('/sources')
  await page.getByRole('button', { name: 'Browse states' }).first().click()
  // Pick the first state row in the browse panel (MUI ListItemButton = div[role=button]).
  await page.getByText(/States in /).waitFor({ timeout: 15_000 })
  // State rows are MUI ListItemButtons; filter by state-key shapes so the nav
  // drawer's collapsible group headers (also div[role=button]) never match.
  await page.locator('div[role="button"]').filter({ hasText: /\.tfstate|ws-/ }).first().click()
  await page.getByRole('tab', { name: 'Analysis' }).waitFor({ timeout: 15_000 })
  await expect(page.getByRole('tab', { name: 'Outputs' })).toBeVisible()
  await page.getByRole('tab', { name: 'Outputs' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  // Either accrued snapshots or the explanatory empty state.
  await expect(page.getByText(/snapshots?|No history yet/i).first()).toBeVisible()
})

test('drift record lifecycle: ingest -> acknowledge in UI -> resolve', async ({ loggedInPage: page }) => {
  const csrf = await csrfToken(page)
  const sources = await (await page.request.get('/api/v1/sources')).json()
  const sourceId = sources.sources[0].id as string

  // Push a drift result the way an external pipeline would.
  const ingest = await page.request.post('/api/v1/drift/ingest', {
    headers: { 'X-CSRF-Token': csrf },
    data: {
      source_id: sourceId,
      state_key: 'e2e-smoke.tfstate',
      external_ref: `e2e-${Date.now()}`,
      plan: { resource_changes: [{ address: 'aws_instance.e2e', change: { actions: ['update'] } }] },
    },
  })
  expect(ingest.ok()).toBeTruthy()

  await page.goto('/drift')
  const row = page.getByRole('row').filter({ hasText: 'e2e-smoke.tfstate' })
  await expect(row.getByText('Open')).toBeVisible()
  await row.getByRole('button', { name: 'Acknowledge' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel(/Note/).fill('e2e smoke acknowledgement')
  await dialog.getByRole('button', { name: 'Acknowledge' }).click()
  await expect(row.getByText('Acknowledged')).toBeVisible()

  // Clean ingest resolves the record (and tidies the live store).
  const clean = await page.request.post('/api/v1/drift/ingest', {
    headers: { 'X-CSRF-Token': csrf },
    data: { source_id: sourceId, state_key: 'e2e-smoke.tfstate', drifted: false },
  })
  expect(clean.ok()).toBeTruthy()
  await page.reload()
  await expect(page.getByRole('row').filter({ hasText: 'e2e-smoke.tfstate' })).toHaveCount(0)
})

test('api key lifecycle: create in UI -> authenticate with it -> delete', async ({ loggedInPage: page, request }) => {
  // Unique per run; also sweep leftovers from earlier aborted runs.
  const keyName = `e2e-smoke-${Date.now()}`
  const csrf = await csrfToken(page)
  const existing = await (await page.request.get('/api/v1/apikeys')).json()
  for (const k of existing.keys ?? []) {
    if ((k.name as string).startsWith('e2e-smoke')) {
      await page.request.delete(`/api/v1/apikeys/${k.id}`, { headers: { 'X-CSRF-Token': csrf } })
    }
  }

  await page.goto('/admin/apikeys')
  await page.getByRole('button', { name: 'Create key' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name', { exact: false }).first().fill(keyName)
  await dialog.getByLabel('state:read', { exact: true }).check()
  await dialog.getByRole('button', { name: 'Create key' }).click()

  // The one-time secret dialog carries the full key.
  await expect(page.getByText('Your new API key')).toBeVisible()
  const secret = await page.getByRole('textbox', { name: 'api key' }).inputValue()
  expect(secret.startsWith('tsm_')).toBeTruthy()
  await page.getByRole('button', { name: 'I saved the key' }).click()

  // The `request` fixture has NO cookies: this proves pure key auth.
  const viaKey = await request.get('/api/v1/sources', {
    headers: { Authorization: `Bearer ${secret}` },
  })
  expect(viaKey.status()).toBe(200)
  const noKey = await request.get('/api/v1/sources')
  expect(noKey.status()).toBe(401)

  // Delete the key from the table and verify it stops working.
  const row = page.getByRole('row').filter({ hasText: keyName })
  await row.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByRole('row').filter({ hasText: keyName })).toHaveCount(0)
  const revoked = await request.get('/api/v1/sources', {
    headers: { Authorization: `Bearer ${secret}` },
  })
  expect(revoked.status()).toBe(401)
})
