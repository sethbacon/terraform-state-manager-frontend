import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import DriftRunsTable from './DriftRunsTable'
import { api, type DriftRun } from '../../services/api'
import i18n from '../../i18n'

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>()
  return {
    ...actual,
    api: {
      listDriftRuns: vi.fn(),
    },
  }
})

const mocked = vi.mocked(api)

const baseRun: DriftRun = {
  id: 'd1',
  pipeline_connection_id: 'p1',
  source_id: 's1',
  state_key: 'app.tfstate',
  repo_ref: 'main',
  working_dir: 'envs/prod',
  status: 'completed',
  added: 1,
  changed: 0,
  destroyed: 0,
  drifted: false,
  summary: [],
  detail: '',
  actor: 'alice',
  created_at: '2026-06-11T08:00:00Z',
  updated_at: '2026-06-11T08:05:00Z',
  batch_id: null,
  ci_run_id: '',
  ci_run_url: '',
  truncated: false,
  omitted_entries: 0,
  omitted_attrs: 0,
  unparseable: false,
  unmasked: false,
}

function renderTable(initialEntries: string[] = ['/drift']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>
        <DriftRunsTable />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DriftRunsTable', () => {
  it('shows no completeness icon for a fully-verified run', async () => {
    mocked.listDriftRuns.mockResolvedValue({ runs: [baseRun], total: 1 })
    renderTable()
    await screen.findByText('main')
    expect(
      screen.queryByLabelText(i18n.t('pages.drift.completeness.unparseableHint') as string),
    ).not.toBeInTheDocument()
  })

  it('flags an unparseable run with a completeness icon instead of reading as clean', async () => {
    mocked.listDriftRuns.mockResolvedValue({ runs: [{ ...baseRun, unparseable: true }], total: 1 })
    renderTable()
    await screen.findByText('main')
    expect(
      screen.getByLabelText(i18n.t('pages.drift.completeness.unparseableHint') as string),
    ).toBeInTheDocument()
  })

  it('filters to a batch named in the ?batch= query param, for both a fanned batch and a single legacy run id', async () => {
    mocked.listDriftRuns.mockResolvedValue({ runs: [baseRun], total: 1 })
    renderTable(['/drift?batch=abc123'])
    await screen.findByText('main')
    expect(mocked.listDriftRuns).toHaveBeenCalledWith(expect.objectContaining({ batchId: 'abc123' }))
  })
})
