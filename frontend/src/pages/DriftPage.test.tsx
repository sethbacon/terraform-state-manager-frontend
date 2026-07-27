import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DriftPage from './DriftPage'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import i18n from '../i18n'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>()
  return {
    ...actual,
    api: {
      listPipelines: vi.fn(),
      listDriftRuns: vi.fn(),
      createDriftRun: vi.fn(),
      createPipeline: vi.fn(),
      updatePipeline: vi.fn(),
      deletePipeline: vi.fn(),
      getDriftWorkflow: vi.fn(),
      listCISources: vi.fn(),
      createCISource: vi.fn(),
      verifyCISource: vi.fn(),
      deleteCISource: vi.fn(),
      listCISourcePipelines: vi.fn(),
      listCISourceRepos: vi.fn(),
      listCISourceWorkflows: vi.fn(),
      listCISourceServiceConnections: vi.fn(),
      getCallbackPreflight: vi.fn(),
      getHealthWorkflow: vi.fn(),
      setupCISourceWorkflow: vi.fn(),
      getCISourcePRState: vi.fn(),
      createCISourcePipeline: vi.fn(),
      listSources: vi.fn(),
      listStates: vi.fn(),
      listDriftRecords: vi.fn(),
      acknowledgeDriftRecord: vi.fn(),
      resolveDriftRecord: vi.fn(),
    },
  }
})
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))

const mocked = vi.mocked(api)
const mockedUseAuth = vi.mocked(useAuth)
type AuthShape = ReturnType<typeof useAuth>

const pipelines = [
  {
    id: 'p1',
    name: 'drift-ci',
    provider: 'github_actions',
    config: { owner: 'corp', repo: 'infra', workflow_id: 'tsm-drift.yml' },
    created_at: '2026-06-01',
    updated_at: '2026-06-01',
  },
]

const runs = [
  {
    id: 'd1',
    pipeline_connection_id: 'p1',
    source_id: null,
    state_key: 'app.tfstate',
    repo_ref: 'main',
    working_dir: 'envs/prod',
    status: 'completed',
    added: 1,
    changed: 2,
    destroyed: 0,
    drifted: true,
    summary: null,
    detail: '',
    actor: 'alice',
    created_at: '2026-06-11T08:00:00Z',
    updated_at: '2026-06-11T08:05:00Z',
  },
  {
    id: 'd2',
    pipeline_connection_id: 'p1',
    source_id: null,
    state_key: '',
    repo_ref: '',
    working_dir: '',
    status: 'completed',
    added: 0,
    changed: 0,
    destroyed: 0,
    drifted: false,
    summary: null,
    detail: '',
    actor: 'alice',
    created_at: '2026-06-11T07:00:00Z',
    updated_at: '2026-06-11T07:01:00Z',
  },
  {
    id: 'd3',
    pipeline_connection_id: 'p1',
    source_id: null,
    state_key: '',
    repo_ref: '',
    working_dir: '',
    status: 'dispatched',
    added: null,
    changed: null,
    destroyed: null,
    drifted: null,
    summary: null,
    detail: '',
    actor: 'alice',
    created_at: '2026-06-11T09:00:00Z',
    updated_at: '2026-06-11T09:00:00Z',
  },
]

const ciSources = [
  {
    id: 'c1',
    name: 'corp-ado',
    provider: 'azure_devops',
    organization: 'corp',
    project: 'Platform',
    auth_method: 'pat',
    has_token: true,
    has_client_secret: false,
    has_app_private_key: false,
    created_at: '',
    updated_at: '',
  },
]

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <DriftPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseAuth.mockReturnValue({ hasScope: () => true } as unknown as AuthShape)
  mocked.listPipelines.mockResolvedValue(pipelines as Awaited<ReturnType<typeof api.listPipelines>>)
  mocked.listDriftRuns.mockResolvedValue({ runs, total: runs.length } as unknown as Awaited<
    ReturnType<typeof api.listDriftRuns>
  >)
  mocked.listCISources.mockResolvedValue(ciSources as Awaited<ReturnType<typeof api.listCISources>>)
  mocked.getCallbackPreflight.mockResolvedValue({ likely_unreachable: false } as Awaited<
    ReturnType<typeof api.getCallbackPreflight>
  >)
  mocked.listSources.mockResolvedValue([])
  mocked.listStates.mockResolvedValue([])
  mocked.listDriftRecords.mockResolvedValue({ records: [], counts: {}, total: 0 })
})

describe('DriftPage', () => {
  it('lists pipelines and recent runs with status chips', async () => {
    renderPage()
    expect(await screen.findByText('drift-ci')).toBeInTheDocument()
    expect(await screen.findByText(i18n.t('pages.drift.statusDriftDetected') as string)).toBeInTheDocument()
    expect(screen.getByText(i18n.t('pages.drift.statusNoDrift') as string)).toBeInTheDocument()
    expect(screen.getByText('envs/prod')).toBeInTheDocument()
  })

  it('shows the no-runs hint', async () => {
    mocked.listDriftRuns.mockResolvedValue({ runs: [], total: 0 })
    renderPage()
    expect(await screen.findByText(i18n.t('pages.drift.noRuns') as string)).toBeInTheDocument()
  })

  it('filters runs by status and paginates', async () => {
    mocked.listDriftRuns.mockResolvedValue({ runs: [runs[0]], total: 25 } as unknown as Awaited<
      ReturnType<typeof api.listDriftRuns>
    >)
    renderPage()
    await screen.findByText('envs/prod')

    const statusSelect = screen.getByLabelText(i18n.t('common.status') as string)
    fireEvent.mouseDown(statusSelect)
    fireEvent.click(await screen.findByRole('option', { name: 'failed' }))
    await waitFor(() =>
      expect(mocked.listDriftRuns).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'failed', offset: 0 })),
    )

    fireEvent.click(await screen.findByRole('button', { name: i18n.t('common.next') as string }))
    await waitFor(() =>
      expect(mocked.listDriftRuns).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 20 })),
    )
  })

  it('optionally links a new run to a picked source and state', async () => {
    mocked.listSources.mockResolvedValue([
      { id: 's1', name: 'estate', type: 'local', config: {} },
    ] as unknown as Awaited<ReturnType<typeof api.listSources>>)
    mocked.listStates.mockResolvedValue([
      { key: 'app.tfstate', name: 'app.tfstate', size: 10 },
    ] as unknown as Awaited<ReturnType<typeof api.listStates>>)
    mocked.createDriftRun.mockResolvedValue(runs[2] as unknown as Awaited<ReturnType<typeof api.createDriftRun>>)
    renderPage()
    await screen.findByText('drift-ci')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('actions.newDriftRun') as string }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[0])
    fireEvent.click(await screen.findByRole('option', { name: /drift-ci/ }))

    fireEvent.mouseDown(within(dialog).getByLabelText(i18n.t('pages.drift.sourceOptional') as string))
    fireEvent.click(await screen.findByRole('option', { name: 'estate' }))
    await waitFor(() => expect(mocked.listStates).toHaveBeenCalledWith('s1'))

    // The state Autocomplete is disabled while its query is loading; wait for
    // it to become interactive before opening it, rather than racing the fetch.
    await waitFor(() =>
      expect(within(dialog).getByLabelText(i18n.t('pages.drift.stateOptional') as string)).not.toBeDisabled(),
    )
    const stateBox = within(dialog).getByLabelText(i18n.t('pages.drift.stateOptional') as string)
    fireEvent.mouseDown(stateBox)
    fireEvent.click(await screen.findByText('app.tfstate'))

    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('pages.drift.dispatch') as string }))
    await waitFor(() =>
      expect(mocked.createDriftRun).toHaveBeenCalledWith(
        expect.objectContaining({ source_id: 's1', state_key: 'app.tfstate' }),
      ),
    )
  })

  it('hides run/manage actions without their scopes', async () => {
    mockedUseAuth.mockReturnValue({ hasScope: () => false } as unknown as AuthShape)
    renderPage()
    await screen.findByText('drift-ci')
    expect(screen.queryByRole('button', { name: i18n.t('actions.newDriftRun') as string })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: i18n.t('actions.addPipeline') as string })).not.toBeInTheDocument()
  })

  it('opens the run detail dialog from a row', async () => {
    renderPage()
    fireEvent.click(await screen.findByText('envs/prod'))
    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByText(
        new RegExp((i18n.t('pages.drift.addedChangedDestroyed', { added: 1, changed: 2, destroyed: 0 }) as string).slice(0, 8)),
      ),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(i18n.t('pages.drift.noResourceDrift') as string)).toBeInTheDocument()
  })

  it('caps the run-summary table and notes truncation for very large plans', async () => {
    const bigSummary = Array.from({ length: 250 }, (_, i) => ({
      address: `aws_instance.n${i}`,
      actions: ['update'],
      attrs: [],
    }))
    const bigRun = { ...runs[0], id: 'dbig', working_dir: 'big/plan', summary: bigSummary }
    mocked.listDriftRuns.mockResolvedValue({ runs: [bigRun], total: 1 } as unknown as Awaited<
      ReturnType<typeof api.listDriftRuns>
    >)
    renderPage()
    fireEvent.click(await screen.findByText('big/plan'))
    const dialog = await screen.findByRole('dialog')
    // The truncation note reports the shown/total counts…
    expect(
      within(dialog).getByText(
        i18n.t('pages.drift.summaryTruncated', { shown: 200, total: 250 }) as string,
      ),
    ).toBeInTheDocument()
    // …and only the first 200 resource rows are rendered into the DOM.
    expect(within(dialog).getByText('aws_instance.n0')).toBeInTheDocument()
    expect(within(dialog).getByText('aws_instance.n199')).toBeInTheDocument()
    expect(within(dialog).queryByText('aws_instance.n200')).not.toBeInTheDocument()
  })

  it('dispatches a new run with optional ref and working dir', async () => {
    mocked.createDriftRun.mockResolvedValue(runs[2] as unknown as Awaited<ReturnType<typeof api.createDriftRun>>)
    renderPage()
    await screen.findByText('drift-ci')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('actions.newDriftRun') as string }))
    const dialog = await screen.findByRole('dialog')

    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[0])
    fireEvent.click(await screen.findByRole('option', { name: /drift-ci/ }))
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('pages.drift.workingDir')}`)), {
      target: { value: 'envs/prod' },
    })

    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('pages.drift.dispatch') as string }))
    await waitFor(() =>
      expect(mocked.createDriftRun).toHaveBeenCalledWith(
        expect.objectContaining({ pipeline_connection_id: 'p1', working_dir: 'envs/prod' }),
      ),
    )
  })

  it('shows the workflow template per provider and template style', async () => {
    mocked.getDriftWorkflow.mockResolvedValue('yaml: tsm-drift')
    renderPage()
    await screen.findByText('drift-ci')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('actions.workflowTemplate') as string }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText(/yaml: tsm-drift/)).toBeInTheDocument()

    // Switch the template style to the suite variant (combobox 1; provider is 0).
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[1])
    fireEvent.click(await screen.findByRole('option', { name: i18n.t('common.templateSuite') as string }))
    await waitFor(() => expect(mocked.getDriftWorkflow).toHaveBeenCalledWith('github_actions', 'suite'))
  })

  it('deletes a pipeline behind confirmation', async () => {
    mocked.deletePipeline.mockResolvedValue(undefined)
    renderPage()
    await screen.findByText('drift-ci')

    fireEvent.click(screen.getByLabelText('delete'))
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'))
    await waitFor(() => expect(mocked.deletePipeline.mock.calls[0]?.[0]).toBe('p1'))
  })

  it('edits a pipeline, prefilling config and rotating the token only when provided', async () => {
    mocked.updatePipeline.mockResolvedValue(pipelines[0] as Awaited<ReturnType<typeof api.updatePipeline>>)
    renderPage()
    await screen.findByText('drift-ci')

    fireEvent.click(screen.getByLabelText('edit'))
    const dialog = await screen.findByRole('dialog')

    // Existing coordinates are prefilled from config.
    expect(within(dialog).getByDisplayValue('infra')).toBeInTheDocument()
    expect(within(dialog).getByDisplayValue('tsm-drift.yml')).toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('common.name')}`)), {
      target: { value: 'renamed-ci' },
    })
    fireEvent.change(within(dialog).getByDisplayValue('infra'), { target: { value: 'platform' } })

    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('common.save') as string }))
    await waitFor(() =>
      expect(mocked.updatePipeline).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({
          name: 'renamed-ci',
          config: expect.objectContaining({ owner: 'corp', repo: 'platform', workflow_id: 'tsm-drift.yml' }),
        }),
      ),
    )
    // No token entered → the request must not carry one.
    expect(mocked.updatePipeline.mock.calls[0]?.[1]).not.toHaveProperty('token')
  })

  it('hides the token field for connections built from a CI source', async () => {
    mocked.listPipelines.mockResolvedValue([
      {
        ...pipelines[0],
        config: { ci_source_id: 'c1', owner: 'corp', repo: 'infra', workflow_id: 'tsm-drift.yml' },
      },
    ] as Awaited<ReturnType<typeof api.listPipelines>>)
    renderPage()
    await screen.findByText('drift-ci')

    fireEvent.click(screen.getByLabelText('edit'))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByLabelText(new RegExp(`^${i18n.t('pages.drift.apiToken')}`))).not.toBeInTheDocument()
    expect(within(dialog).getByText(i18n.t('pages.drift.credentialInherited') as string)).toBeInTheDocument()
  })

  it('manages CI sources: list, add (ADO requires a project), delete', async () => {
    mocked.createCISource.mockResolvedValue(ciSources[0] as Awaited<ReturnType<typeof api.createCISource>>)
    mocked.deleteCISource.mockResolvedValue(undefined)
    renderPage()
    await screen.findByText('drift-ci')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.drift.ciSources') as string }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('corp-ado')).toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('common.name')}`)), {
      target: { value: 'corp-gh' },
    })
    // Switch the provider to Azure DevOps so the org/project fields appear.
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[0])
    fireEvent.click(await screen.findByRole('option', { name: /Azure DevOps/ }))
    fireEvent.change(await within(dialog).findByLabelText(new RegExp(`^${i18n.t('pages.drift.organization')}`)), {
      target: { value: 'corp' },
    })
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('pages.drift.project')}`)), {
      target: { value: 'Platform' },
    })
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('pages.drift.apiToken')}`)), {
      target: { value: 'pat' },
    })
    const addBtn = within(dialog)
      .getAllByRole('button')
      .find((b) => !(b as HTMLButtonElement).disabled && /add/i.test(b.textContent ?? ''))!
    fireEvent.click(addBtn)
    await waitFor(() =>
      expect(mocked.createCISource).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'corp-gh', organization: 'corp', project: 'Platform', token: 'pat' }),
      ),
    )

    fireEvent.click(within(dialog).getByLabelText('delete CI source'))
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'))
    await waitFor(() => expect(mocked.deleteCISource.mock.calls[0]?.[0]).toBe('c1'))
  })

  it('adds an ADO source with Entra app-registration auth and verifies it', async () => {
    mocked.createCISource.mockResolvedValue(ciSources[0] as Awaited<ReturnType<typeof api.createCISource>>)
    mocked.verifyCISource.mockResolvedValue({ ok: true })
    renderPage()
    await screen.findByText('drift-ci')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.drift.ciSources') as string }))
    const dialog = await screen.findByRole('dialog')

    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('common.name')}`)), {
      target: { value: 'corp-app' },
    })
    // Provider → Azure DevOps (combobox 0).
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[0])
    fireEvent.click(await screen.findByRole('option', { name: /Azure DevOps/ }))
    fireEvent.change(await within(dialog).findByLabelText(new RegExp(`^${i18n.t('pages.drift.organization')}`)), {
      target: { value: 'corp' },
    })
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('pages.drift.project')}`)), {
      target: { value: 'Platform' },
    })
    // Auth method → App registration (combobox 1).
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[1])
    fireEvent.click(await screen.findByRole('option', { name: i18n.t('pages.drift.authMethodApp') as string }))
    fireEvent.change(await within(dialog).findByLabelText(new RegExp(`^${i18n.t('pages.drift.tenantId')}`)), {
      target: { value: 'the-tenant' },
    })
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('pages.drift.clientId')}`)), {
      target: { value: 'the-client' },
    })
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('pages.drift.clientSecret')}`)), {
      target: { value: 'the-secret' },
    })
    const addBtn = within(dialog)
      .getAllByRole('button')
      .find((b) => !(b as HTMLButtonElement).disabled && /add/i.test(b.textContent ?? ''))!
    fireEvent.click(addBtn)
    await waitFor(() =>
      expect(mocked.createCISource).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'corp-app',
          provider: 'azure_devops',
          auth_method: 'app',
          tenant_id: 'the-tenant',
          client_id: 'the-client',
          client_secret: 'the-secret',
        }),
      ),
    )
    // The app payload must not carry a PAT token.
    expect(mocked.createCISource.mock.calls[0]?.[0]).not.toHaveProperty('token')

    // Test connection on the existing source.
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('pages.drift.testConnection') as string }))
    await waitFor(() => expect(mocked.verifyCISource).toHaveBeenCalledWith('c1'))
    expect(await within(dialog).findByText(i18n.t('pages.drift.testConnectionOk') as string)).toBeInTheDocument()
  })

  it('adds a GitHub source with GitHub App auth (no PAT in the payload)', async () => {
    mocked.createCISource.mockResolvedValue(ciSources[0] as Awaited<ReturnType<typeof api.createCISource>>)
    renderPage()
    await screen.findByText('drift-ci')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.drift.ciSources') as string }))
    const dialog = await screen.findByRole('dialog')

    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('common.name')}`)), {
      target: { value: 'corp-ghapp' },
    })
    // Provider stays GitHub Actions (default). Owner field.
    fireEvent.change(within(dialog).getByLabelText(/^Owner/), {
      target: { value: 'corp' },
    })
    // Auth method → App registration (combobox 1; provider is combobox 0).
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[1])
    fireEvent.click(await screen.findByRole('option', { name: i18n.t('pages.drift.authMethodApp') as string }))
    fireEvent.change(await within(dialog).findByLabelText(new RegExp(`^${i18n.t('pages.drift.githubAppId')}`)), {
      target: { value: 'app-123' },
    })
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('pages.drift.githubInstallationId')}`)), {
      target: { value: 'inst-9' },
    })
    fireEvent.change(within(dialog).getByLabelText(/^Private key/), {
      target: { value: '-----BEGIN RSA PRIVATE KEY-----\nMII...\n-----END RSA PRIVATE KEY-----' },
    })
    const addBtn = within(dialog)
      .getAllByRole('button')
      .find((b) => !(b as HTMLButtonElement).disabled && /add/i.test(b.textContent ?? ''))!
    fireEvent.click(addBtn)
    await waitFor(() =>
      expect(mocked.createCISource).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'corp-ghapp',
          provider: 'github_actions',
          auth_method: 'app',
          github_app_id: 'app-123',
          github_installation_id: 'inst-9',
          app_private_key: expect.stringContaining('BEGIN RSA PRIVATE KEY'),
        }),
      ),
    )
    expect(mocked.createCISource.mock.calls[0]?.[0]).not.toHaveProperty('token')
    expect(mocked.createCISource.mock.calls[0]?.[0]).not.toHaveProperty('client_secret')
  })

  it('adds a pipeline from a CI source with the ADO pipeline picker', async () => {
    mocked.listCISourcePipelines.mockResolvedValue([
      { id: 7, name: 'TSM Drift', folder: '\\' },
    ] as Awaited<ReturnType<typeof api.listCISourcePipelines>>)
    mocked.createPipeline.mockResolvedValue(pipelines[0] as Awaited<ReturnType<typeof api.createPipeline>>)
    renderPage()
    await screen.findByText('drift-ci')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('actions.addPipeline') as string }))
    const dialog = await screen.findByRole('dialog')

    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('common.name')}`)), {
      target: { value: 'corp drift' },
    })
    // Pick the CI source (first combobox).
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[0])
    fireEvent.click(await screen.findByRole('option', { name: /corp-ado/ }))

    // Pick the discovered ADO pipeline.
    const pipelineBox = await within(dialog).findByLabelText(new RegExp(`^${i18n.t('pages.drift.pipeline')}`))
    fireEvent.mouseDown(pipelineBox)
    fireEvent.change(pipelineBox, { target: { value: 'TSM' } })
    fireEvent.click(await screen.findByText(/TSM Drift/))

    const createBtn = within(dialog)
      .getAllByRole('button')
      .find((b) => !(b as HTMLButtonElement).disabled && /create|add/i.test(b.textContent ?? ''))!
    fireEvent.click(createBtn)

    await waitFor(() =>
      expect(mocked.createPipeline).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'corp drift',
          provider: 'azure_devops',
          config: expect.objectContaining({
            ci_source_id: 'c1',
            organization: 'corp',
            project: 'Platform',
            pipeline_id: '7',
          }),
        }),
      ),
    )
  })

  it('adds a pipeline manually with provider fields and token', async () => {
    mocked.createPipeline.mockResolvedValue(pipelines[0] as Awaited<ReturnType<typeof api.createPipeline>>)
    renderPage()
    await screen.findByText('drift-ci')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('actions.addPipeline') as string }))
    const dialog = await screen.findByRole('dialog')

    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('common.name')}`)), {
      target: { value: 'manual gh' },
    })
    // Manual entry is the default (no CI source selected); fill the GitHub fields.
    const owner = within(dialog).getByLabelText(/owner/i)
    fireEvent.change(owner, { target: { value: 'corp' } })
    fireEvent.change(within(dialog).getByLabelText(/repo/i), { target: { value: 'infra' } })
    fireEvent.change(within(dialog).getByLabelText(/workflow/i), { target: { value: 'tsm-drift.yml' } })
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('pages.drift.apiToken')}`)), {
      target: { value: 'ghp_x' },
    })

    const createBtn = within(dialog)
      .getAllByRole('button')
      .find((b) => !(b as HTMLButtonElement).disabled && /create|add/i.test(b.textContent ?? ''))!
    fireEvent.click(createBtn)

    await waitFor(() =>
      expect(mocked.createPipeline).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'manual gh',
          provider: 'github_actions',
          token: 'ghp_x',
          config: expect.objectContaining({ owner: 'corp', repo: 'infra', workflow_id: 'tsm-drift.yml' }),
        }),
      ),
    )
  })
})
