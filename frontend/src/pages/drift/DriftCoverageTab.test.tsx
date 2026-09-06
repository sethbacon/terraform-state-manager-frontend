import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DriftCoverageTab from './DriftCoverageTab'
import { api, type DriftCoverage, type StateSource } from '../../services/api'
import i18n from '../../i18n'

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>()
  return {
    ...actual,
    api: {
      listSources: vi.fn(),
      getDriftCoverage: vi.fn(),
    },
  }
})

const mocked = vi.mocked(api)

const sources: StateSource[] = [
  { id: 's1', name: 'estate', type: 'local', endpoint: '', config: {}, scope: {}, created_at: '', updated_at: '' },
]

const coverage: DriftCoverage = {
  states: [
    {
      key: 'app1.tfstate',
      scheduled: true,
      last_run_id: 'r1',
      last_run_at: new Date().toISOString(),
      last_status: 'completed',
      drifted: false,
      unparseable: false,
      truncated: false,
      ci_run_url: 'https://dev.azure.com/org/proj/_build/1',
      record_id: null,
      record_status: null,
      severity: null,
      // The Phase 5 case: no unapplied changes, but hand-edited infrastructure.
      infra_drifted: true,
    },
    {
      key: 'app2.tfstate',
      scheduled: false,
      last_run_id: null,
      last_run_at: null,
      last_status: null,
      drifted: null,
      unparseable: false,
      truncated: false,
      ci_run_url: null,
      record_id: null,
      record_status: null,
      severity: null,
      infra_drifted: null,
    },
    {
      key: 'app3.tfstate',
      scheduled: true,
      last_run_id: 'r3',
      last_run_at: new Date().toISOString(),
      last_status: 'completed',
      drifted: false,
      unparseable: true,
      truncated: false,
      ci_run_url: null,
      record_id: null,
      record_status: null,
      severity: null,
      infra_drifted: false,
    },
  ],
  summary: {
    total: 3,
    scheduled: 2,
    unscheduled: 1,
    stale: 1,
    incomplete: 1,
    open: 0,
    critical: 0,
    infra_drifted: 1,
  },
}

function renderTab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <DriftCoverageTab />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocked.listSources.mockResolvedValue(sources)
  mocked.getDriftCoverage.mockResolvedValue(coverage)
})

describe('DriftCoverageTab', () => {
  it('prompts for a source before fetching anything', async () => {
    renderTab()
    expect(await screen.findByText(i18n.t('pages.drift.coverage.chooseSource') as string)).toBeInTheDocument()
    expect(mocked.getDriftCoverage).not.toHaveBeenCalled()
  })

  it('lists every state with its scheduled/status/drifted columns once a source is picked', async () => {
    renderTab()
    fireEvent.mouseDown(screen.getByLabelText(i18n.t('pages.drift.coverage.sourceLabel') as string))
    fireEvent.click(await screen.findByRole('option', { name: 'estate' }))

    await waitFor(() => expect(mocked.getDriftCoverage).toHaveBeenCalledWith('s1'))
    expect(await screen.findByText('app1.tfstate')).toBeInTheDocument()
    expect(screen.getByText('app2.tfstate')).toBeInTheDocument()
    expect(screen.getByText('app3.tfstate')).toBeInTheDocument()
    // Summary chips reflect the endpoint's own counts.
    expect(screen.getByText(i18n.t('pages.drift.coverage.summaryUnscheduled', { count: 1 }) as string)).toBeInTheDocument()
    expect(screen.getByText(i18n.t('pages.drift.coverage.summaryIncomplete', { count: 1 }) as string)).toBeInTheDocument()
  })

  it('flags the unparseable state as unverified rather than clean', async () => {
    renderTab()
    fireEvent.mouseDown(screen.getByLabelText(i18n.t('pages.drift.coverage.sourceLabel') as string))
    fireEvent.click(await screen.findByRole('option', { name: 'estate' }))
    await screen.findByText('app3.tfstate')
    expect(screen.getByLabelText(i18n.t('pages.drift.completeness.unparseableHint') as string)).toBeInTheDocument()
    // app3 (completed, drifted=false, unparseable) must show "unverified", and only
    // app1 — the genuinely clean state — may show "no drift".
    expect(screen.getAllByText(i18n.t('pages.drift.statusUnverified') as string)).toHaveLength(1)
    expect(screen.getAllByText(i18n.t('pages.drift.statusNoDrift') as string)).toHaveLength(1)
  })

  it('links out to the CI run for a state that has one', async () => {
    renderTab()
    fireEvent.mouseDown(screen.getByLabelText(i18n.t('pages.drift.coverage.sourceLabel') as string))
    fireEvent.click(await screen.findByRole('option', { name: 'estate' }))
    await screen.findByText('app1.tfstate')
    const link = screen.getByRole('link', { name: i18n.t('pages.drift.openCiRun') as string })
    expect(link).toHaveAttribute('href', 'https://dev.azure.com/org/proj/_build/1')
  })

  it('surfaces infra_drifted per state, distinctly from the unapplied drifted column', async () => {
    renderTab()
    fireEvent.mouseDown(screen.getByLabelText(i18n.t('pages.drift.coverage.sourceLabel') as string))
    fireEvent.click(await screen.findByRole('option', { name: 'estate' }))
    await screen.findByText('app1.tfstate')

    expect(screen.getByText(i18n.t('pages.drift.coverage.colInfraDrifted') as string)).toBeInTheDocument()
    // Columns: State, Scheduled, Last checked, Status, Drifted, Infra drifted, …
    const driftedIdx = 4
    const infraDriftedIdx = 5

    // app1: no unapplied drift, but infra drift — the case Phase 5 surfaces.
    const app1Cells = within(screen.getByText('app1.tfstate').closest('tr')!).getAllByRole('cell')
    expect(app1Cells[driftedIdx]).toHaveTextContent(i18n.t('common.no') as string)
    expect(app1Cells[infraDriftedIdx]).toHaveTextContent(i18n.t('common.yes') as string)

    // app2: never checked — infra_drifted is null, must read as "not checked"
    // (an em dash), never as "no drift".
    const app2Cells = within(screen.getByText('app2.tfstate').closest('tr')!).getAllByRole('cell')
    expect(app2Cells[driftedIdx]).toHaveTextContent('—')
    expect(app2Cells[infraDriftedIdx]).toHaveTextContent('—')

    // Summary chip mirrors the endpoint's own infra_drifted count.
    expect(screen.getByText(i18n.t('pages.drift.coverage.summaryInfraDrifted', { count: 1 }) as string)).toBeInTheDocument()
  })

  it('filters to unscheduled states only', async () => {
    renderTab()
    fireEvent.mouseDown(screen.getByLabelText(i18n.t('pages.drift.coverage.sourceLabel') as string))
    fireEvent.click(await screen.findByRole('option', { name: 'estate' }))
    await screen.findByText('app1.tfstate')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.drift.coverage.filterUnscheduled') as string }))
    expect(screen.queryByText('app1.tfstate')).not.toBeInTheDocument()
    expect(screen.getByText('app2.tfstate')).toBeInTheDocument()
  })
})
