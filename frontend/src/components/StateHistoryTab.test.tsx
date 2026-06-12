import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StateHistoryTab from './StateHistoryTab'
import { api, type StateAnalysisSnapshot } from '../services/api'
import i18n from '../i18n'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>()
  return {
    ...actual,
    api: {
      getStateHistory: vi.fn(),
    },
  }
})

const mocked = vi.mocked(api)

function snapshot(over: Partial<StateAnalysisSnapshot>): StateAnalysisSnapshot {
  return {
    source_id: 's1',
    state_key: 'app.tfstate',
    version_marker: '10|x',
    size: 2048,
    terraform_version: '1.9.5',
    serial: 7,
    lineage: 'lin',
    rum: 4,
    managed_resources: 4,
    data_sources: 1,
    total_resources: 5,
    providers: { aws: 4 },
    resource_types: { aws_instance: 4 },
    analyzed_at: '2026-06-10T10:00:00Z',
    ...over,
  }
}

function renderTab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <StateHistoryTab sourceId="s1" stateKey="app.tfstate" />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('StateHistoryTab', () => {
  it('lists snapshots newest-first with deltas vs the previous snapshot', async () => {
    // Newest-first API order: serial 9 (rum 6, tf 1.10.1) follows serial 7 (rum 4, tf 1.9.5).
    mocked.getStateHistory.mockResolvedValue([
      snapshot({ serial: 9, rum: 6, total_resources: 7, terraform_version: '1.10.1', analyzed_at: '2026-06-11T10:00:00Z' }),
      snapshot({}),
    ])
    renderTab()
    expect(await screen.findByText(i18n.t('pages.sources.historySnapshots', { count: 2 }) as string)).toBeInTheDocument()
    // RUM 4 -> 6 and resources 5 -> 7 render +2 delta chips on the newest row.
    expect(screen.getAllByText('+2')).toHaveLength(2)
    // Terraform version change is flagged with the previous version.
    expect(screen.getByText('← 1.9.5')).toBeInTheDocument()
    expect(screen.getAllByText('2.0 KB')).toHaveLength(2)
  })

  it('shows the empty hint before any history accrues', async () => {
    mocked.getStateHistory.mockResolvedValue([])
    renderTab()
    expect(await screen.findByText(i18n.t('pages.sources.historyEmpty') as string)).toBeInTheDocument()
  })

  it('surfaces load failures', async () => {
    mocked.getStateHistory.mockRejectedValue(new Error('boom'))
    renderTab()
    expect(await screen.findByText(i18n.t('pages.sources.historyError') as string)).toBeInTheDocument()
  })
})
