import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DashboardPage from './DashboardPage'
import { api } from '../services/api'
import i18n from '../i18n'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>()
  return { ...actual, api: { getDashboardOverview: vi.fn() } }
})

const mocked = vi.mocked(api)

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
  providers: [
    { key: 'aws', count: 12 },
    { key: 'azurerm', count: 6 },
  ],
  terraform_versions: [{ key: '1.9.5', count: 3 }],
  resource_types: [{ key: 'aws_instance', count: 9 }],
  sync: [
    {
      source_id: 's1',
      name: 'demo-local',
      type: 'local',
      synced: true,
      last_sync_at: '2026-06-11T08:00:00Z',
      states_listed: 3,
      states_stored: 3,
      read_errors: 0,
      last_error: '',
    },
  ],
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/sources" element={<div>sources page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DashboardPage', () => {
  it('shows a skeleton while loading', () => {
    mocked.getDashboardOverview.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByTestId('card-grid-skeleton')).toBeInTheDocument()
  })

  it('renders stat cards, charts, and the as-of caption', async () => {
    mocked.getDashboardOverview.mockResolvedValue(overview as Awaited<ReturnType<typeof api.getDashboardOverview>>)
    renderPage()

    expect(await screen.findByText('18')).toBeInTheDocument() // RUM
    expect(screen.getByText('21')).toBeInTheDocument() // total instances
    expect(screen.getByText(i18n.t('pages.dashboard.providerDistribution') as string)).toBeInTheDocument()
    expect(screen.getByText(i18n.t('pages.dashboard.terraformVersions') as string)).toBeInTheDocument()
    expect(screen.getByText(i18n.t('pages.dashboard.topResourceTypes') as string)).toBeInTheDocument()
    const asOfPrefix = (i18n.t('pages.dashboard.asOf', { time: '' }) as string).trim()
    expect(screen.getByText((text) => text.includes(asOfPrefix))).toBeInTheDocument()
    // No warning banner when every source aggregated cleanly.
    expect(screen.queryByText(/source/i, { selector: '.MuiAlert-message' })).not.toBeInTheDocument()
  })

  it('warns when a source reported sync errors, with per-source detail', async () => {
    mocked.getDashboardOverview.mockResolvedValue({
      ...overview,
      source_errors: 1,
      sync: [
        {
          source_id: 's1',
          name: 'HCP Terraform',
          type: 'hcp',
          synced: true,
          last_sync_at: '2026-06-11T08:00:00Z',
          states_listed: 165,
          states_stored: 162,
          read_errors: 3,
          last_error: 'read ws-1: 429',
        },
      ],
    } as Awaited<ReturnType<typeof api.getDashboardOverview>>)
    renderPage()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    const panel = screen.getByTestId('sync-status-panel')
    expect(within(panel).getByText('HCP Terraform')).toBeInTheDocument()
    expect(
      within(panel).getByText(i18n.t('pages.dashboard.syncStates', { stored: 162, listed: 165 }) as string),
    ).toBeInTheDocument()
    expect(
      within(panel).getByText(i18n.t('pages.dashboard.syncReadErrors', { count: 3 }) as string),
    ).toBeInTheDocument()
    expect(within(panel).getByText('read ws-1: 429')).toBeInTheDocument()
  })

  it('flags a catching-up sync and sources awaiting their first cycle', async () => {
    mocked.getDashboardOverview.mockResolvedValue({
      ...overview,
      states: 80,
      states_listed: 168,
      sync: [
        ...overview.sync,
        { source_id: 's2', name: 'azure-prod', type: 'azure', synced: false },
      ],
    } as Awaited<ReturnType<typeof api.getDashboardOverview>>)
    renderPage()
    expect(
      await screen.findByText(i18n.t('pages.dashboard.syncPartial', { stored: 80, listed: 168 }) as string),
    ).toBeInTheDocument()
    const panel = screen.getByTestId('sync-status-panel')
    expect(within(panel).getByText('azure-prod')).toBeInTheDocument()
    expect(
      within(panel).getByText(i18n.t('pages.dashboard.syncPending') as string),
    ).toBeInTheDocument()
  })

  it('offers the empty state with a path to Sources when nothing is configured', async () => {
    mocked.getDashboardOverview.mockResolvedValue({
      ...overview,
      sources: 0,
    } as Awaited<ReturnType<typeof api.getDashboardOverview>>)
    renderPage()

    const goto = await screen.findByRole('button', { name: i18n.t('pages.dashboard.goToSources') as string })
    fireEvent.click(goto)
    expect(screen.getByText('sources page')).toBeInTheDocument()
  })

  it('force-refresh bypasses the cache and updates the view', async () => {
    mocked.getDashboardOverview.mockResolvedValue(overview as Awaited<ReturnType<typeof api.getDashboardOverview>>)
    renderPage()
    await screen.findByText('18')

    mocked.getDashboardOverview.mockResolvedValue({
      ...overview,
      rum: 25,
    } as Awaited<ReturnType<typeof api.getDashboardOverview>>)
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.refresh') as string }))

    await waitFor(() => expect(mocked.getDashboardOverview).toHaveBeenLastCalledWith(true))
    expect(await screen.findByText('25')).toBeInTheDocument()
  })

  it('surfaces a load failure', async () => {
    mocked.getDashboardOverview.mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByText(i18n.t('common.error') as string)).toBeInTheDocument()
  })
})
