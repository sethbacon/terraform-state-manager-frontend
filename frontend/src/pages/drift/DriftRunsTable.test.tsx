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
  drift_added: 0,
  drift_changed: 0,
  drift_destroyed: 0,
  drift_summary: [],
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
    // ...and the status cell must not contradict it: baseRun is completed with
    // drifted=false, the exact combination that used to render a green "no drift".
    expect(screen.getByText(i18n.t('pages.drift.statusUnverified') as string)).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('pages.drift.statusNoDrift') as string)).not.toBeInTheDocument()
  })

  it('filters to a batch named in the ?batch= query param, for both a fanned batch and a single legacy run id', async () => {
    mocked.listDriftRuns.mockResolvedValue({ runs: [baseRun], total: 1 })
    renderTable(['/drift?batch=abc123'])
    await screen.findByText('main')
    expect(mocked.listDriftRuns).toHaveBeenCalledWith(expect.objectContaining({ batchId: 'abc123' }))
  })

  it('shows both count triplets, distinctly labelled, and a clean infra chip when no infra drift was reported', async () => {
    mocked.listDriftRuns.mockResolvedValue({ runs: [baseRun], total: 1 })
    renderTable()
    await screen.findByText('main')
    expect(screen.getByText(i18n.t('pages.drift.unappliedColumn') as string)).toBeInTheDocument()
    expect(screen.getByText(i18n.t('pages.drift.infraColumn') as string)).toBeInTheDocument()
    expect(screen.getByText('1 / 0 / 0')).toBeInTheDocument()
    expect(screen.getByText('0 / 0 / 0')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('pages.drift.infraNoDrift') as string)).toBeInTheDocument()
  })

  it('flags infra drift separately from the unapplied status when the run has only infra drift', async () => {
    // drifted=false (no unapplied changes) but a non-zero infra triplet: the
    // exact case Phase 5 exists to surface — a hand-edited state that used to
    // read completely clean.
    const infraOnly = { ...baseRun, added: 0, drifted: false, drift_added: 1, drift_changed: 0, drift_destroyed: 0 }
    mocked.listDriftRuns.mockResolvedValue({ runs: [infraOnly], total: 1 })
    renderTable()
    await screen.findByText('main')
    expect(screen.getByText(i18n.t('pages.drift.statusNoDrift') as string)).toBeInTheDocument()
    expect(screen.getByText(i18n.t('pages.drift.infraDriftDetected') as string)).toBeInTheDocument()
  })

  it('renders an em dash for the infra triplet on a run that has not completed', async () => {
    const dispatched = {
      ...baseRun,
      status: 'dispatched',
      added: null,
      changed: null,
      destroyed: null,
      drifted: null,
      detail: 'queued',
    }
    mocked.listDriftRuns.mockResolvedValue({ runs: [dispatched], total: 1 })
    renderTable()
    await screen.findByText('main')
    // Unapplied column + infra column both read "not yet resolved", never a
    // misleading "0 / 0 / 0" that would look like a verified-clean result.
    expect(screen.getAllByText('—')).toHaveLength(2)
  })
})
