import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { VersionDrift } from '../../types/dashboard'

// Mock the api client. getVersionDrift resolves a fully-shaped VersionDrift
// (the api layer unwraps the backend's { data } envelope and normalises it).
const getVersionDriftMock = vi.fn()
vi.mock('../../services/api', () => ({
  default: {
    getVersionDrift: (...args: unknown[]) => getVersionDriftMock(...args),
  },
}))

import VersionDriftPage from '../VersionDriftPage'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
}

function renderPage() {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <VersionDriftPage />
    </QueryClientProvider>,
  )
}

const fakeDrift: VersionDrift = {
  run_id: 'run-1',
  total: 3,
  satisfied: 1,
  drift: 1,
  unknown: 1,
  entries: [
    { workspace_name: 'prod-network', required: '~> 1.5', actual: '1.6.2', satisfies: true, status: 'satisfied' },
    { workspace_name: 'staging-app', required: '>= 1.7', actual: '1.6.0', satisfies: false, status: 'drift' },
    { workspace_name: 'legacy-db', required: '', actual: '1.4.0', satisfies: false, status: 'unknown' },
  ],
}

const emptyDrift: VersionDrift = {
  run_id: '',
  total: 0,
  satisfied: 0,
  drift: 0,
  unknown: 0,
  entries: [],
}

describe('VersionDriftPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading spinner initially', () => {
    getVersionDriftMock.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders the rollup summary and a row per workspace', async () => {
    getVersionDriftMock.mockResolvedValue(fakeDrift)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('prod-network')).toBeInTheDocument()
    })
    expect(screen.getByText('staging-app')).toBeInTheDocument()
    expect(screen.getByText('legacy-db')).toBeInTheDocument()

    // Required-version constraints are rendered in the table.
    expect(screen.getByText('~> 1.5')).toBeInTheDocument()
    expect(screen.getByText('1.6.2')).toBeInTheDocument()
  })

  it('shows the empty state when the run carries no version-drift entries', async () => {
    getVersionDriftMock.mockResolvedValue(emptyDrift)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('No version drift data yet')).toBeInTheDocument()
    })
    // The per-workspace table must not be present.
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows an error message when the API fails', async () => {
    getVersionDriftMock.mockRejectedValue(new Error('Network error'))
    renderPage()

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load version drift. Please try again.'),
      ).toBeInTheDocument()
    })
  })
})
