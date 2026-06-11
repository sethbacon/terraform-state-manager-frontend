import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import RolesPage from './RolesPage'
import { api } from '../../services/api'
import i18n from '../../i18n'

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>()
  return { ...actual, api: { listAdminRoles: vi.fn() } }
})

const mocked = vi.mocked(api)

const roles = [
  { id: 'r2', name: 'viewer', display_name: 'Viewer', description: 'Read-only', scopes: ['state:read'], is_system: true },
  { id: 'r1', name: 'admin', display_name: 'Administrator', description: 'Everything', scopes: ['admin'], is_system: true },
  { id: 'r3', name: 'custom-ops', display_name: 'Custom Ops', description: 'Bespoke', scopes: ['state:drift'], is_system: false },
]

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <RolesPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RolesPage', () => {
  it('shows a spinner while roles load', () => {
    mocked.listAdminRoles.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders the scope reference table from the catalogue', async () => {
    mocked.listAdminRoles.mockResolvedValue(roles as Awaited<ReturnType<typeof api.listAdminRoles>>)
    renderPage()
    expect(await screen.findByText(i18n.t('admin.roles.availableScopesReference') as string)).toBeInTheDocument()
    expect(screen.getByText('Browse sources and read state files and analyses')).toBeInTheDocument()
  })

  it('sorts system roles by escalation order ahead of custom roles', async () => {
    mocked.listAdminRoles.mockResolvedValue(roles as Awaited<ReturnType<typeof api.listAdminRoles>>)
    renderPage()
    const viewer = await screen.findByText('Viewer')
    const admin = screen.getByText('Administrator')
    const custom = screen.getByText('Custom Ops')
    // DOM order: viewer (lowest) → admin (highest system), then custom roles.
    expect(viewer.compareDocumentPosition(admin) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(admin.compareDocumentPosition(custom) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('expands a role to show its permission breakdown', async () => {
    mocked.listAdminRoles.mockResolvedValue(roles as Awaited<ReturnType<typeof api.listAdminRoles>>)
    renderPage()
    fireEvent.click(await screen.findByText('Viewer'))
    expect(await screen.findByText('Read-only')).toBeInTheDocument()
  })

  it('shows the empty-state note when no templates exist', async () => {
    mocked.listAdminRoles.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(i18n.t('admin.roles.noRoles') as string)).toBeInTheDocument()
  })

  it('surfaces a load error', async () => {
    mocked.listAdminRoles.mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByText(i18n.t('admin.roles.loadError') as string)).toBeInTheDocument()
  })
})
