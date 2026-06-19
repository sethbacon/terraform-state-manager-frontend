import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EstateOverview, { versionStatesToCsv } from './EstateOverview'
import type { DashboardOverview } from '../services/api'
import i18n from '../i18n'

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
} as DashboardOverview

function renderOverview(props: { data?: DashboardOverview; isLoading?: boolean; isError?: boolean }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={<EstateOverview data={props.data} isLoading={props.isLoading ?? false} isError={props.isError ?? false} />}
          />
          <Route path="/sources" element={<div>sources page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EstateOverview', () => {
  it('shows a skeleton while loading', () => {
    renderOverview({ isLoading: true })
    expect(screen.getByTestId('card-grid-skeleton')).toBeInTheDocument()
  })

  it('renders stat cards and charts', () => {
    renderOverview({ data: overview })

    expect(screen.getByText('18')).toBeInTheDocument() // RUM
    expect(screen.getByText('21')).toBeInTheDocument() // total instances
    expect(screen.getByText(i18n.t('pages.dashboard.providerDistribution') as string)).toBeInTheDocument()
    expect(screen.getByText(i18n.t('pages.dashboard.terraformVersions') as string)).toBeInTheDocument()
    expect(screen.getByText(i18n.t('pages.dashboard.topResourceTypes') as string)).toBeInTheDocument()
  })

  it('warns when a source reported sync errors, with per-source detail', () => {
    renderOverview({
      data: {
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
      } as DashboardOverview,
    })
    expect(screen.getByRole('alert')).toBeInTheDocument()
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

  it('flags a catching-up sync and sources awaiting their first cycle', () => {
    renderOverview({
      data: {
        ...overview,
        states: 80,
        states_listed: 168,
        sync: [...overview.sync, { source_id: 's2', name: 'azure-prod', type: 'azure', synced: false }],
      } as DashboardOverview,
    })
    expect(
      screen.getByText(i18n.t('pages.dashboard.syncPartial', { stored: 80, listed: 168 }) as string),
    ).toBeInTheDocument()
    const panel = screen.getByTestId('sync-status-panel')
    expect(within(panel).getByText('azure-prod')).toBeInTheDocument()
    expect(within(panel).getByText(i18n.t('pages.dashboard.syncPending') as string)).toBeInTheDocument()
  })

  it('offers the empty state with a path to Sources when nothing is configured', () => {
    renderOverview({ data: { ...overview, sources: 0 } as DashboardOverview })

    const goto = screen.getByRole('button', { name: i18n.t('pages.dashboard.goToSources') as string })
    fireEvent.click(goto)
    expect(screen.getByText('sources page')).toBeInTheDocument()
  })

  it('surfaces a load failure', () => {
    renderOverview({ isError: true })
    expect(screen.getByText(i18n.t('common.error') as string)).toBeInTheDocument()
  })
})

describe('versionStatesToCsv', () => {
  it('emits a header row and one row per state in column order', () => {
    const csv = versionStatesToCsv([
      { source_id: 's1', source_name: 'prod', state_key: 'app.tfstate', terraform_version: '0.14.11', rum: 12 },
      { source_id: 's2', source_name: 'dev', state_key: 'net.tfstate', terraform_version: '', rum: 0 },
    ])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('source_name,source_id,state_key,terraform_version,rum')
    expect(lines[1]).toBe('"prod","s1","app.tfstate","0.14.11","12"')
    // Empty version stays an empty quoted field; RUM 0 is preserved.
    expect(lines[2]).toBe('"dev","s2","net.tfstate","","0"')
    expect(lines).toHaveLength(3)
  })

  it('escapes embedded quotes and commas so fields stay intact', () => {
    const csv = versionStatesToCsv([
      { source_id: 'id,1', source_name: 'a"b', state_key: 'env/"prod",main', terraform_version: '1.5.7', rum: 3 },
    ])
    // Quotes are doubled; commas live safely inside the quoted fields.
    expect(csv.split('\n')[1]).toBe('"a""b","id,1","env/""prod"",main","1.5.7","3"')
  })

  it('returns just the header when there are no states', () => {
    expect(versionStatesToCsv([])).toBe('source_name,source_id,state_key,terraform_version,rum')
  })
})
