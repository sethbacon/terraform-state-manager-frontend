import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the api client. getDriftEvents resolves the unwrapped envelope
// { events, total, limit, offset }.
const getDriftEventsMock = vi.fn()
vi.mock('@/services/api', () => ({
  default: {
    getDriftEvents: (...args: unknown[]) => getDriftEventsMock(...args),
  },
}))

import DriftEventsPage from '../DriftEventsPage'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
}

function renderPage() {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <DriftEventsPage />
    </QueryClientProvider>,
  )
}

const fakeEvents = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    organization_id: 'org-1',
    workspace_name: 'prod-network',
    changes: { added: [], removed: ['aws_instance'], modified: [], resource_delta: -1 },
    severity: 'critical' as const,
    detected_at: '2026-06-01T12:00:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    organization_id: 'org-1',
    workspace_name: 'staging-app',
    changes: { added: ['aws_s3_bucket'], removed: [], modified: ['aws_lb'], resource_delta: 1 },
    severity: 'warning' as const,
    detected_at: '2026-06-02T09:30:00Z',
    drift_source: 'code' as const,
    external_ref: 'https://example.com/run/123',
  },
]

describe('DriftEventsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading spinner initially', () => {
    getDriftEventsMock.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders drift events with workspace, severity, and change summary', async () => {
    getDriftEventsMock.mockResolvedValue({ events: fakeEvents, total: 2, limit: 25, offset: 0 })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('prod-network')).toBeInTheDocument()
    })
    expect(screen.getByText('staging-app')).toBeInTheDocument()
    // Severity chips
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('Warning')).toBeInTheDocument()
    // Change summaries
    expect(screen.getByText('1 removed')).toBeInTheDocument()
    expect(screen.getByText('1 added')).toBeInTheDocument()
    expect(screen.getByText('1 modified')).toBeInTheDocument()
  })

  it('renders an external_ref link when present', async () => {
    getDriftEventsMock.mockResolvedValue({ events: fakeEvents, total: 2, limit: 25, offset: 0 })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('staging-app')).toBeInTheDocument()
    })
    const link = screen.getByRole('link', { name: 'https://example.com/run/123' })
    expect(link).toHaveAttribute('href', 'https://example.com/run/123')
  })

  it('shows the empty state when there are no events', async () => {
    getDriftEventsMock.mockResolvedValue({ events: [], total: 0, limit: 25, offset: 0 })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('No drift detected')).toBeInTheDocument()
    })
  })

  it('shows an error message when the API fails', async () => {
    getDriftEventsMock.mockRejectedValue(new Error('Network error'))
    renderPage()

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load drift events. Please try again.'),
      ).toBeInTheDocument()
    })
  })
})
