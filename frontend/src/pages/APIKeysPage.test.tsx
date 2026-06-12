import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import APIKeysPage from './APIKeysPage'
import { api, type APIKey } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import i18n from '../i18n'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>()
  return {
    ...actual,
    api: {
      listAPIKeys: vi.fn(),
      createAPIKey: vi.fn(),
      updateAPIKey: vi.fn(),
      deleteAPIKey: vi.fn(),
      rotateAPIKey: vi.fn(),
    },
  }
})
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))

const mocked = vi.mocked(api)
const mockedUseAuth = vi.mocked(useAuth)
type AuthShape = ReturnType<typeof useAuth>

const keys: APIKey[] = [
  {
    id: 'k1',
    user_id: 'u1',
    organization_id: 'org1',
    name: 'ci-drift',
    description: 'nightly drift ingest',
    key_prefix: 'tsm_abc123',
    scopes: ['state:read', 'state:drift'],
    created_at: '2026-06-01T00:00:00Z',
    last_used_at: '2026-06-11T08:00:00Z',
  },
  {
    id: 'k2',
    user_id: 'u1',
    organization_id: 'org1',
    name: 'old-key',
    key_prefix: 'tsm_def456',
    scopes: ['state:read'],
    expires_at: '2020-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
  },
]

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <APIKeysPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  // Holds read+drift (not write/manage/admin): grantable scopes are limited.
  mockedUseAuth.mockReturnValue({
    hasScope: (s: string) => ['state:read', 'state:drift'].includes(s),
  } as unknown as AuthShape)
  mocked.listAPIKeys.mockResolvedValue(keys)
})

describe('APIKeysPage', () => {
  it('lists keys with prefix, scope chips, last-used, and expired state', async () => {
    renderPage()
    expect(await screen.findByText('ci-drift')).toBeInTheDocument()
    expect(screen.getByText('tsm_abc123…')).toBeInTheDocument()
    expect(screen.getByText('state:drift')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('pages.apiKeys.expired') as string)).toBeInTheDocument()
    expect(screen.getByText('nightly drift ingest')).toBeInTheDocument()
  })

  it('shows the empty hint', async () => {
    mocked.listAPIKeys.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(i18n.t('pages.apiKeys.empty') as string)).toBeInTheDocument()
  })

  it('creates a key and shows the secret exactly once', async () => {
    mocked.createAPIKey.mockResolvedValue({ key: 'tsm_SECRET123', api_key: keys[0] })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: i18n.t('pages.apiKeys.create') as string }))
    const dialog = await screen.findByRole('dialog')

    // Scope checkboxes are limited to scopes the user can grant.
    expect(within(dialog).queryByLabelText('admin')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('sources:manage')).not.toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText(/Name/), { target: { value: 'new-key' } })
    fireEvent.click(within(dialog).getByLabelText('state:drift'))
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('pages.apiKeys.create') as string }))

    await waitFor(() =>
      expect(mocked.createAPIKey).toHaveBeenCalledWith({
        name: 'new-key',
        description: undefined,
        scopes: ['state:drift'],
        expires_at: undefined,
      }),
    )
    // The secret dialog presents the one-time key.
    expect(await screen.findByDisplayValue('tsm_SECRET123')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('pages.apiKeys.secretWarning') as string)).toBeInTheDocument()
  })

  it('rotates with a grace period and shows the new secret', async () => {
    mocked.rotateAPIKey.mockResolvedValue({ key: 'tsm_ROTATED', api_key: keys[0] })
    renderPage()
    await screen.findByText('ci-drift')
    fireEvent.click(screen.getAllByRole('button', { name: i18n.t('pages.apiKeys.rotate') as string })[0])
    const dialog = await screen.findByRole('dialog')

    fireEvent.mouseDown(within(dialog).getByRole('combobox'))
    fireEvent.click(await screen.findByRole('option', { name: i18n.t('pages.apiKeys.graceHours', { count: 24 }) as string }))
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('pages.apiKeys.rotate') as string }))

    await waitFor(() => expect(mocked.rotateAPIKey).toHaveBeenCalledWith('k1', 24))
    expect(await screen.findByDisplayValue('tsm_ROTATED')).toBeInTheDocument()
  })

  it('edits a key without exposing any secret', async () => {
    mocked.updateAPIKey.mockResolvedValue(keys[0])
    renderPage()
    await screen.findByText('ci-drift')
    fireEvent.click(screen.getAllByRole('button', { name: i18n.t('common.edit') as string })[0])
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Name/), { target: { value: 'renamed' } })
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('common.save') as string }))
    await waitFor(() =>
      expect(mocked.updateAPIKey).toHaveBeenCalledWith('k1', expect.objectContaining({ name: 'renamed' })),
    )
    // No secret dialog on edit.
    expect(screen.queryByText(i18n.t('pages.apiKeys.secretWarning') as string)).not.toBeInTheDocument()
  })

  it('deletes after confirmation', async () => {
    mocked.deleteAPIKey.mockResolvedValue()
    renderPage()
    await screen.findByText('ci-drift')
    fireEvent.click(screen.getAllByRole('button', { name: i18n.t('common.delete') as string })[0])
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('common.confirm') as string }))
    await waitFor(() => expect(mocked.deleteAPIKey).toHaveBeenCalledWith('k1'))
  })

  it('copies the secret and dismisses the secret dialog', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    mocked.createAPIKey.mockResolvedValue({ key: 'tsm_SECRET123', api_key: keys[0] })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: i18n.t('pages.apiKeys.create') as string }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Name/), { target: { value: 'k' } })
    fireEvent.click(within(dialog).getByLabelText('state:read'))
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('pages.apiKeys.create') as string }))

    await screen.findByDisplayValue('tsm_SECRET123')
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.copy') as string }))
    expect(writeText).toHaveBeenCalledWith('tsm_SECRET123')
    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.apiKeys.secretStored') as string }))
    await waitFor(() => expect(screen.queryByDisplayValue('tsm_SECRET123')).not.toBeInTheDocument())
  })

  it('surfaces rotate failures inside the dialog', async () => {
    mocked.rotateAPIKey.mockRejectedValue({ response: { data: { error: 'rotate denied' } } })
    renderPage()
    await screen.findByText('ci-drift')
    fireEvent.click(screen.getAllByRole('button', { name: i18n.t('pages.apiKeys.rotate') as string })[0])
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('pages.apiKeys.rotate') as string }))
    expect(await within(dialog).findByText('rotate denied')).toBeInTheDocument()
  })

  it('shows a dismissible page-level error when delete fails', async () => {
    mocked.deleteAPIKey.mockRejectedValue(new Error('boom'))
    renderPage()
    await screen.findByText('ci-drift')
    fireEvent.click(screen.getAllByRole('button', { name: i18n.t('common.delete') as string })[0])
    const confirm = await screen.findByRole('dialog')
    fireEvent.click(within(confirm).getByRole('button', { name: i18n.t('common.confirm') as string }))
    expect(await screen.findByText('Request failed.')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Close'))
    await waitFor(() => expect(screen.queryByText('Request failed.')).not.toBeInTheDocument())
  })

  it('surfaces create failures inside the dialog', async () => {
    mocked.createAPIKey.mockRejectedValue({
      response: { data: { error: 'cannot grant scope sources:manage (keys may only carry scopes you hold)' } },
    })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: i18n.t('pages.apiKeys.create') as string }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Name/), { target: { value: 'x' } })
    fireEvent.click(within(dialog).getByLabelText('state:read'))
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('pages.apiKeys.create') as string }))
    expect(await within(dialog).findByText(/cannot grant scope/)).toBeInTheDocument()
  })
})
