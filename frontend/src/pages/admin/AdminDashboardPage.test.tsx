import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminDashboardPage from './AdminDashboardPage'
import { api, type DashboardOverview } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import i18n from '../../i18n'

vi.mock('../../services/api', () => ({
  api: { getDashboardOverview: vi.fn(), getAdminStats: vi.fn() },
}))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }))

const mocked = vi.mocked(api)
const mockedUseAuth = vi.mocked(useAuth)
type AuthShape = ReturnType<typeof useAuth>

const overview = {
  sources: 2,
  states: 3,
  states_listed: 3,
  rum: 18,
  managed_resources: 19,
  data_sources: 2,
  total_resources: 21,
  source_errors: 0,
  refreshed_at: '2026-06-11T08:00:00Z',
  providers: [{ key: 'aws', count: 12 }],
  terraform_versions: [{ key: '1.9.5', count: 3 }],
  resource_types: [{ key: 'aws_instance', count: 9 }],
  sync: [],
} as DashboardOverview

function setAuth(isAdmin: boolean) {
  mockedUseAuth.mockReturnValue({
    hasScope: (s: string) => (s === 'admin' ? isAdmin : true),
  } as unknown as AuthShape)
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocked.getDashboardOverview.mockResolvedValue(overview)
})

describe('AdminDashboardPage', () => {
  it('shows the estate overview to any authenticated user, without the identity section', async () => {
    setAuth(false)
    renderPage()

    expect(await screen.findByText('18')).toBeInTheDocument() // RUM, from the estate overview
    expect(screen.queryByText(i18n.t('pages.admin.identity') as string)).not.toBeInTheDocument()
    expect(mocked.getAdminStats).not.toHaveBeenCalled()
  })

  it('shows the identity counters as links for admins', async () => {
    setAuth(true)
    mocked.getAdminStats.mockResolvedValue({ users: 7, organizations: 2, roles: 4 })
    renderPage()

    expect(await screen.findByText(i18n.t('pages.admin.identity') as string)).toBeInTheDocument()
    expect(await screen.findByText('7')).toBeInTheDocument()
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(expect.arrayContaining(['/admin/users', '/admin/organizations', '/admin/roles']))
  })

  it('force-refresh re-fetches the overview bypassing the cache', async () => {
    setAuth(false)
    renderPage()
    await screen.findByText('18')

    mocked.getDashboardOverview.mockResolvedValue({ ...overview, rum: 25 } as DashboardOverview)
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.refresh') as string }))

    await waitFor(() => expect(mocked.getDashboardOverview).toHaveBeenLastCalledWith(true))
    expect(await screen.findByText('25')).toBeInTheDocument()
  })
})
