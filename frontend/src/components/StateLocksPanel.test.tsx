import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StateLocksPanel from './StateLocksPanel'
import { api, type StateLock } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import i18n from '../i18n'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>()
  return {
    ...actual,
    api: {
      listStateLocks: vi.fn(),
      forceUnlock: vi.fn(),
    },
  }
})
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))

const mocked = vi.mocked(api)
const mockedUseAuth = vi.mocked(useAuth)
type AuthShape = ReturnType<typeof useAuth>

function lock(over: Partial<StateLock>): StateLock {
  return {
    id: 'l1',
    source_id: 's1',
    state_key: 'app.tfstate',
    actor: 'user-1',
    acquired_at: new Date().toISOString(),
    ...over,
  }
}

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <StateLocksPanel sourceId="s1" />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseAuth.mockReturnValue({ hasScope: () => true } as unknown as AuthShape)
})

describe('StateLocksPanel', () => {
  it('renders nothing while there are no locks', async () => {
    mocked.listStateLocks.mockResolvedValue([])
    const { container } = renderPanel()
    await waitFor(() => expect(mocked.listStateLocks).toHaveBeenCalledWith('s1'))
    expect(container).toBeEmptyDOMElement()
  })

  it('lists held locks with actor and flags stale ones', async () => {
    mocked.listStateLocks.mockResolvedValue([
      lock({}),
      lock({
        id: 'l2',
        state_key: 'old.tfstate',
        actor: '',
        // 20 minutes old: past the backend's 15-minute stale TTL.
        acquired_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      }),
    ])
    renderPanel()
    expect(await screen.findByText('app.tfstate')).toBeInTheDocument()
    expect(screen.getByText('old.tfstate')).toBeInTheDocument()
    expect(screen.getByText(new RegExp('user-1'))).toBeInTheDocument()
    expect(screen.getAllByText(i18n.t('pages.sources.lockStale') as string)).toHaveLength(1)
  })

  it('force-unlocks after confirmation (admin only)', async () => {
    mocked.listStateLocks.mockResolvedValue([lock({})])
    mocked.forceUnlock.mockResolvedValue({ released: true })
    renderPanel()

    await userEvent.click(await screen.findByRole('button', { name: i18n.t('pages.sources.forceUnlock') as string }))
    await userEvent.click(screen.getByTestId('confirm-dialog-confirm'))

    await waitFor(() => expect(mocked.forceUnlock).toHaveBeenCalledWith('s1', 'app.tfstate'))
  })

  it('hides the force-unlock button from non-admins', async () => {
    mockedUseAuth.mockReturnValue({ hasScope: (s: string) => s !== 'admin' } as unknown as AuthShape)
    mocked.listStateLocks.mockResolvedValue([lock({})])
    renderPanel()
    expect(await screen.findByText('app.tfstate')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: i18n.t('pages.sources.forceUnlock') as string })).not.toBeInTheDocument()
  })
})
