import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminDashboardPage from './AdminDashboardPage'
import { api } from '../../services/api'

vi.mock('../../services/api', () => ({
  api: { getAdminStats: vi.fn() },
}))

const mocked = vi.mocked(api)

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
})

describe('AdminDashboardPage', () => {
  it('shows a skeleton grid while loading', () => {
    mocked.getAdminStats.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByTestId('card-grid-skeleton')).toBeInTheDocument()
  })

  it('renders the identity counters as links to their pages', async () => {
    mocked.getAdminStats.mockResolvedValue({ users: 7, organizations: 2, roles: 4 })
    renderPage()

    expect(await screen.findByText('7')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()

    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(expect.arrayContaining(['/admin/users', '/admin/organizations', '/admin/roles']))
  })

  it('shows an error alert when stats cannot load', async () => {
    mocked.getAdminStats.mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
