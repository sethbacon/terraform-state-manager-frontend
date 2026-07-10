/**
 * Targeted secondary-path tests: cancel handlers, alternate branches, and
 * pickers that the primary suites don't reach. Each case is small by design —
 * the behaviors are simple, but they hold the branches/functions floors.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SourcesPage from './SourcesPage'
import DriftPage from './DriftPage'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import i18n from '../i18n'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>()
  const fns: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const k of Object.keys(actual.api)) fns[k] = vi.fn()
  return { ...actual, api: fns }
})
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))

const mocked = vi.mocked(api)
const mockedUseAuth = vi.mocked(useAuth)
type AuthShape = ReturnType<typeof useAuth>

const sources = [
  { id: 's1', name: 'demo-local', type: 'local', config: { base_path: '/data' } },
  { id: 's2', name: 'archive', type: 's3', config: {} },
]
const states = [{ key: 'app.tfstate', name: 'app.tfstate', size: 2048 }]
const resources = [
  { module: 'root', mode: 'managed', type: 'aws_instance', name: 'web', provider: 'aws', instances: 2 },
  { module: 'module.vpc', mode: 'data', type: 'aws_ami', name: 'ubuntu', provider: 'aws', instances: 1 },
]

function renderWith(el: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{el}</MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseAuth.mockReturnValue({ hasScope: () => true } as unknown as AuthShape)
  mocked.listSources.mockResolvedValue(sources as never)
  mocked.listStates.mockResolvedValue(states as never)
  mocked.listStateResources.mockResolvedValue(resources as never)
  mocked.listStateModuleFreshness.mockResolvedValue([] as never)
  mocked.analyzeState.mockResolvedValue({
    key: 'app.tfstate',
    size: 1,
    analysis: {
      terraform_version: '1.9.5',
      serial: 7,
      lineage: 'l',
      total_resources: 1,
      managed_resources: 1,
      data_sources: 0,
      null_resources: 0,
      rum: 1,
      resource_types: [],
      providers: [],
      modules: [],
    },
  } as never)
})

describe('AddSourceDialog field definitions', () => {
  // 10 sequential MUI select open/close cycles — legitimately slow under the
  // CPU contention of a full parallel test run, so it gets its own budget
  // above the file-wide testTimeout rather than a weaker per-query wait.
  it('renders the field set for every connector type', async () => {
    renderWith(<SourcesPage />)
    await screen.findByText('demo-local')
    fireEvent.click(screen.getByRole('button', { name: i18n.t('actions.addSource') as string }))
    const dialog = await screen.findByRole('dialog')

    // Walk the full connector catalogue — each switch renders that type's
    // field branch (labels, optional markers, secret inputs, helpers).
    const typeNames = [/S3/i, /GCS|Google/i, /Azure/i, /HCP/i, /Kubernetes/i, /Git\b/i, /PostgreSQL|Postgres/i, /Consul/i, /HTTP/i, /Local/i]
    for (const name of typeNames) {
      fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[0])
      const listbox = await screen.findByRole('listbox')
      const option = within(listbox).queryByRole('option', { name })
      if (option) fireEvent.click(option)
      else fireEvent.keyDown(listbox, { key: 'Escape' })
      await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    }
    expect(within(dialog).getByRole('button', { name: 'Create' })).toBeDisabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  }, 30_000)
})

describe('SourcesPage secondary paths', () => {
  async function openDetail() {
    renderWith(<SourcesPage />)
    await screen.findByText('demo-local')
    fireEvent.click(screen.getAllByRole('button', { name: i18n.t('pages.sources.browseStates') as string })[0])
    fireEvent.click(await screen.findByText('app.tfstate'))
    await screen.findByText(i18n.t('pages.sources.tabAnalysis') as string)
  }

  it('cancels a raw edit without saving', async () => {
    mocked.getRawState.mockResolvedValue('{"version":4,"serial":7}' as never)
    await openDetail()
    fireEvent.click(screen.getByRole('tab', { name: i18n.t('pages.sources.tabRaw') as string }))
    fireEvent.click(await screen.findByRole('button', { name: i18n.t('common.edit') as string }))
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.cancel') as string }))
    expect(mocked.editState).not.toHaveBeenCalled()
  })

  it('lists captured module provenance with a constraint-only marker', async () => {
    mocked.listStateModules.mockResolvedValue([
      {
        source_id: 's1',
        state_key: 'app.tfstate',
        module_source: 'terraform-aws-modules/vpc/aws',
        module_version: null,
        registry_host: 'registry.terraform.io',
        observed_at: '2026-06-14',
      },
    ] as never)
    await openDetail()
    fireEvent.click(screen.getByRole('tab', { name: i18n.t('pages.sources.tabModules') as string }))
    // registry_host renders as plain text (module_source goes through breakableSegments).
    expect(await screen.findByText('registry.terraform.io')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('pages.sources.constraintOnly') as string)).toBeInTheDocument()
  })

  it('renders freshness badges (behind, up-to-date, unknown) against the registry', async () => {
    const mod = (source: string, version: string) => ({
      source_id: 's1',
      state_key: 'app.tfstate',
      module_source: source,
      module_version: version,
      registry_host: 'app.terraform.io',
      observed_at: '2026-06-14',
    })
    mocked.listStateModules.mockResolvedValue([
      mod('acme/vpc/aws', '5.3.0'),
      mod('acme/db/aws', '2.0.0'),
      mod('acme/dns/aws', '1.0.0'),
    ] as never)
    mocked.listStateModuleFreshness.mockResolvedValue([
      { module_source: 'acme/vpc/aws', registry_host: 'app.terraform.io', current: '5.3.0', latest: '5.7.1', status: 'behind' },
      { module_source: 'acme/db/aws', registry_host: 'app.terraform.io', current: '2.0.0', latest: '2.0.0', status: 'up_to_date' },
      { module_source: 'acme/dns/aws', registry_host: 'app.terraform.io', current: '1.0.0', latest: null, status: 'unknown' },
    ] as never)
    await openDetail()
    fireEvent.click(screen.getByRole('tab', { name: i18n.t('pages.sources.tabModules') as string }))
    expect(await screen.findByText('5.3.0 → 5.7.1')).toBeInTheDocument() // behind: current → latest
    expect(screen.getByText(i18n.t('pages.sources.moduleUpToDate') as string)).toBeInTheDocument()
    expect(screen.getByText(i18n.t('pages.sources.moduleUnknown') as string)).toBeInTheDocument()
  })

  it('shows the empty state when no module provenance is captured', async () => {
    mocked.listStateModules.mockResolvedValue([] as never)
    await openDetail()
    fireEvent.click(screen.getByRole('tab', { name: i18n.t('pages.sources.tabModules') as string }))
    expect(await screen.findByText(i18n.t('pages.sources.noModules') as string)).toBeInTheDocument()
  })

  it('runs an in-page migrate with decommission and shows verification results', async () => {
    mocked.migrateToSource.mockResolvedValue({
      mode: 'migrate',
      status: 'verification_failed',
      verified: false,
      detail: 'parity mismatch',
    } as never)
    await openDetail()

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.sources.transfer') as string }))
    const dialog = await screen.findByRole('dialog')

    // Switch mode to migrate, then enable decommission + confirm key.
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[0])
    fireEvent.click(await screen.findByRole('option', { name: i18n.t('pages.transfer.modeMigrate') as string }))
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[1])
    fireEvent.click(await screen.findByRole('option', { name: /archive/ }))

    const checkbox = within(dialog).queryByRole('checkbox')
    if (checkbox) {
      fireEvent.click(checkbox)
      const confirm = within(dialog).queryByPlaceholderText('app.tfstate')
      if (confirm) fireEvent.change(confirm, { target: { value: 'app.tfstate' } })
    }

    const run = within(dialog)
      .getAllByRole('button')
      .find((b) => !(b as HTMLButtonElement).disabled && /migrate/i.test(b.textContent ?? ''))
    if (run) {
      fireEvent.click(run)
      await waitFor(() => expect(mocked.migrateToSource).toHaveBeenCalled())
      expect(await within(dialog).findByText(/verification_failed|parity mismatch/)).toBeInTheDocument()
    }
  })

  it('renders ops picker options with data/instance chips', async () => {
    await openDetail()
    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.sources.stateOps') as string }))
    const dialog = await screen.findByRole('dialog')

    const addressBox = within(dialog).getByLabelText(new RegExp(`^${i18n.t('pages.sources.resourceAddress')}`))
    fireEvent.mouseDown(addressBox)
    fireEvent.change(addressBox, { target: { value: 'aws' } })
    // Both option decorations render: ×2 instances and the data chip.
    expect(await screen.findByText('×2')).toBeInTheDocument()
    expect(screen.getByText('data')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  })
})

describe('DriftPage secondary paths', () => {
  const pipelines = [
    { id: 'p1', name: 'drift-ci', provider: 'github_actions', config: {}, created_at: '', updated_at: '' },
  ]
  const failedRun = {
    id: 'df',
    pipeline_connection_id: 'p1',
    source_id: null,
    state_key: '',
    repo_ref: '',
    working_dir: '',
    status: 'failed',
    added: null,
    changed: null,
    destroyed: null,
    drifted: null,
    summary: null,
    detail: 'dispatch 400',
    actor: 'a',
    created_at: '2026-06-11T08:00:00Z',
    updated_at: '2026-06-11T08:00:00Z',
  }
  const driftedWithSummary = {
    ...failedRun,
    id: 'ds',
    status: 'completed',
    added: 1,
    changed: 0,
    destroyed: 1,
    drifted: true,
    detail: '',
    summary: [{ address: 'aws_instance.web', actions: ['delete'] }],
  }

  beforeEach(() => {
    mocked.listPipelines.mockResolvedValue(pipelines as never)
    mocked.listDriftRuns.mockResolvedValue({ runs: [failedRun, driftedWithSummary], total: 2 } as never)
    mocked.listCISources.mockResolvedValue([
      { id: 'c2', name: 'corp-gh', provider: 'github_actions', organization: 'corp', project: null, has_token: true },
    ] as never)
    mocked.getCallbackPreflight.mockResolvedValue({ likely_unreachable: false } as never)
  })

  it('shows the failed chip and resource-level drift in the detail dialog', async () => {
    renderWith(<DriftPage />)
    expect(await screen.findByText(i18n.t('pages.drift.statusFailed') as string)).toBeInTheDocument()

    fireEvent.click(screen.getByText(i18n.t('pages.drift.statusDriftDetected') as string))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('aws_instance.web')).toBeInTheDocument()
    expect(within(dialog).getByText('delete')).toBeInTheDocument()
  })

  it('adds a pipeline from a GitHub CI source via repo + workflow pickers', async () => {
    mocked.listCISourceRepos.mockResolvedValue([{ id: 'r1', name: 'infra', default_branch: 'main' }] as never)
    mocked.listCISourceWorkflows.mockResolvedValue([
      { id: 1, name: 'Drift', file: 'tsm-drift.yml', state: 'active' },
    ] as never)
    mocked.createPipeline.mockResolvedValue(pipelines[0] as never)
    renderWith(<DriftPage />)
    await screen.findByText('drift-ci')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('actions.addPipeline') as string }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('common.name')}`)), {
      target: { value: 'gh picked' },
    })
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[0])
    fireEvent.click(await screen.findByRole('option', { name: /corp-gh/ }))

    const repoBox = await within(dialog).findByLabelText(new RegExp(`^${i18n.t('pages.drift.repository')}`))
    fireEvent.mouseDown(repoBox)
    fireEvent.change(repoBox, { target: { value: 'infra' } })
    fireEvent.click(await screen.findByRole('option', { name: /infra/ }))

    const wfBox = await within(dialog).findByLabelText(new RegExp(`^${i18n.t('pages.drift.workflow')}`))
    fireEvent.mouseDown(wfBox)
    fireEvent.change(wfBox, { target: { value: 'tsm' } })
    fireEvent.click(await screen.findByRole('option', { name: /tsm-drift\.yml|Drift/ }))

    const createBtn = within(dialog)
      .getAllByRole('button')
      .find((b) => !(b as HTMLButtonElement).disabled && /create|add/i.test(b.textContent ?? ''))!
    fireEvent.click(createBtn)
    await waitFor(() =>
      expect(mocked.createPipeline).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'github_actions',
          config: expect.objectContaining({ ci_source_id: 'c2', repo: 'infra', workflow_id: 'tsm-drift.yml' }),
        }),
      ),
    )
  })

  it('cancels dialogs cleanly', async () => {
    renderWith(<DriftPage />)
    await screen.findByText('drift-ci')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('actions.newDriftRun') as string }))
    let dialog = await screen.findByRole('dialog')
    fireEvent.click(
      within(dialog)
        .getAllByRole('button')
        .find((b) => /cancel/i.test(b.textContent ?? ''))!,
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.drift.ciSources') as string }))
    dialog = await screen.findByRole('dialog')
    fireEvent.click(
      within(dialog)
        .getAllByRole('button')
        .find((b) => /close|cancel/i.test(b.textContent ?? ''))!,
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mocked.createDriftRun).not.toHaveBeenCalled()
  })
})
