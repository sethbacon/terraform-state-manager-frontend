import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the api client. listRoleTemplates is expected to resolve a bare array
// (the api layer unwraps the backend's { role_templates } envelope).
const listRoleTemplatesMock = vi.fn()
vi.mock('../../../services/api', () => ({
  default: {
    listRoleTemplates: (...args: unknown[]) => listRoleTemplatesMock(...args),
  },
}))

import RolesPage from '../RolesPage'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
}

function renderPage() {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <RolesPage />
    </QueryClientProvider>,
  )
}

const fakeRoles = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'viewer',
    display_name: 'Viewer',
    description: 'Read-only access',
    scopes: ['analysis:read', 'sources:read'],
    is_system: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'admin',
    display_name: 'Administrator',
    description: 'Full access to all features',
    scopes: ['admin'],
    is_system: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-02-01T00:00:00Z',
  },
]

describe('RolesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner initially', () => {
    listRoleTemplatesMock.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders the role templates returned as a bare array without throwing', async () => {
    listRoleTemplatesMock.mockResolvedValue(fakeRoles)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Roles & Permissions')).toBeInTheDocument()
    })
    expect(screen.getByText('Available Scopes Reference')).toBeInTheDocument()
    expect(screen.getByText('Viewer')).toBeInTheDocument()
    // "Administrator" appears in both the scope reference table and the role row.
    expect(screen.getAllByText('Administrator').length).toBeGreaterThanOrEqual(1)
  })

  it('shows scope counts per role', async () => {
    listRoleTemplatesMock.mockResolvedValue(fakeRoles)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('2 scopes')).toBeInTheDocument() // viewer
      expect(screen.getByText('1 scope')).toBeInTheDocument() // admin
    })
  })

  it('shows no roles found when the list is empty', async () => {
    listRoleTemplatesMock.mockResolvedValue([])
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('No roles found.')).toBeInTheDocument()
    })
  })

  it('shows an error message when the API fails', async () => {
    listRoleTemplatesMock.mockRejectedValue(new Error('Network error'))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Failed to load roles. Please try again.')).toBeInTheDocument()
    })
  })
})
