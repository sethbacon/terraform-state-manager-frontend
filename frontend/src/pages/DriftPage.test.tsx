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
  mocked.listDriftRuns.mockResolvedValue(runs as unknown as Awaited<ReturnType<typeof api.listDriftRuns>>)
  mocked.listCISources.mockResolvedValue(ciSources as Awaited<ReturnType<typeof api.listCISources>>)
  mocked.getCallbackPreflight.mockResolvedValue({ likely_unreachable: false } as Awaited<
    ReturnType<typeof api.getCallbackPreflight>
  >)
  mocked.listSources.mockResolvedValue([])
  mocked.listDriftRecords.mockResolvedValue({ records: [], counts: {} })
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
    mocked.listDriftRuns.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(i18n.t('pages.drift.noRuns') as string)).toBeInTheDocument()
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

  it('shows the workflow template per provider', async () => {
    mocked.getDriftWorkflow.mockResolvedValue('yaml: tsm-drift')
    renderPage()
    await screen.findByText('drift-ci')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('actions.workflowTemplate') as string }))
    expect(await screen.findByText(/yaml: tsm-drift/)).toBeInTheDocument()
  })

  it('deletes a pipeline behind confirmation', async () => {
    mocked.deletePipeline.mockResolvedValue(undefined)
    renderPage()
    await screen.findByText('drift-ci')

    fireEvent.click(screen.getByLabelText('delete'))
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'))
    await waitFor(() => expect(mocked.deletePipeline.mock.calls[0]?.[0]).toBe('p1'))
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
