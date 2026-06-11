import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DriftRepoWizard from './DriftRepoWizard'
import { api } from '../services/api'
import i18n from '../i18n'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>()
  return {
    ...actual,
    api: {
      listCISources: vi.fn(),
      getCallbackPreflight: vi.fn(),
      listCISourceRepos: vi.fn(),
      listCISourceServiceConnections: vi.fn(),
      getDriftWorkflow: vi.fn(),
      getHealthWorkflow: vi.fn(),
      setupCISourceWorkflow: vi.fn(),
      getCISourcePRState: vi.fn(),
      listCISourcePipelines: vi.fn(),
      listCISourceWorkflows: vi.fn(),
      createCISourcePipeline: vi.fn(),
      createPipeline: vi.fn(),
      createDriftRun: vi.fn(),
    },
  }
})

const mocked = vi.mocked(api)

const adoSource = {
  id: 'c1',
  name: 'corp-ado',
  provider: 'azure_devops',
  organization: 'corp',
  project: 'Platform',
  has_token: true,
  created_at: '',
  updated_at: '',
}
const ghSource = { ...adoSource, id: 'c2', name: 'corp-gh', provider: 'github_actions', project: null }

function renderWizard(onCreated = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <DriftRepoWizard open onClose={() => {}} onCreated={onCreated} />
    </QueryClientProvider>,
  )
  return onCreated
}

async function pickSourceAndRepo(sourceName: RegExp) {
  const dialog = await screen.findByRole('dialog')
  fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[0])
  fireEvent.click(await screen.findByRole('option', { name: sourceName }))

  const repoBox = await within(dialog).findByLabelText(new RegExp(`^${i18n.t('pages.drift.repository')}`))
  fireEvent.mouseDown(repoBox)
  fireEvent.change(repoBox, { target: { value: 'infra' } })
  fireEvent.click(await screen.findByRole('option', { name: /infra/ }))
  return dialog
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn() },
    configurable: true,
  })
  mocked.listCISources.mockResolvedValue([adoSource, ghSource] as Awaited<ReturnType<typeof api.listCISources>>)
  mocked.getCallbackPreflight.mockResolvedValue({
    likely_unreachable: false,
    callback_base: 'https://tsm.example.com',
  } as Awaited<ReturnType<typeof api.getCallbackPreflight>>)
  mocked.listCISourceRepos.mockResolvedValue([
    { id: 'r1', name: 'infra', default_branch: 'refs/heads/main' },
  ] as Awaited<ReturnType<typeof api.listCISourceRepos>>)
  mocked.listCISourceServiceConnections.mockResolvedValue([
    { id: 'sc1', name: 'azure-prod', type: 'azurerm' },
  ] as Awaited<ReturnType<typeof api.listCISourceServiceConnections>>)
  mocked.getDriftWorkflow.mockResolvedValue('drift yaml TF_WORKDIR placeholder')
  mocked.getHealthWorkflow.mockResolvedValue('health yaml placeholder')
  mocked.listCISourcePipelines.mockResolvedValue([])
  mocked.listCISourceWorkflows.mockResolvedValue([])
})

describe('DriftRepoWizard', () => {
  it('gates Next on picking a source and repository', async () => {
    renderWizard()
    const dialog = await screen.findByRole('dialog')
    const next = within(dialog).getByRole('button', { name: i18n.t('common.next') as string })
    expect(next).toBeDisabled()

    await pickSourceAndRepo(/corp-ado/)
    expect(next).toBeEnabled()
  })

  it('warns when the callback base looks unreachable from hosted agents', async () => {
    mocked.getCallbackPreflight.mockResolvedValue({
      likely_unreachable: true,
      callback_base: 'http://localhost:8080',
    } as Awaited<ReturnType<typeof api.getCallbackPreflight>>)
    renderWizard()
    expect(await screen.findByText(/localhost:8080/)).toBeInTheDocument()
  })

  it('shows the customized template and commits it via PR (with Version Lab)', async () => {
    mocked.setupCISourceWorkflow.mockResolvedValue({
      status: 'pr_created',
      pr_id: 12,
      pr_url: 'https://dev.azure.com/pr/12',
    } as Awaited<ReturnType<typeof api.setupCISourceWorkflow>>)
    mocked.getCISourcePRState.mockResolvedValue({ state: 'merged' })

    renderWizard()
    const dialog = await pickSourceAndRepo(/corp-ado/)

    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('common.next') as string }))
    expect(await within(dialog).findByText(/drift yaml/)).toBeInTheDocument()

    // Opt into the Version Lab workflow from the template step.
    fireEvent.click(within(dialog).getByLabelText(new RegExp(i18n.t('pages.drift.wizard.includeVersionLab') as string)))
    expect(await within(dialog).findByText(/health yaml/)).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('pages.drift.wizard.commitViaPR') as string }))
    await waitFor(() =>
      expect(mocked.setupCISourceWorkflow).toHaveBeenCalledWith(
        'c1',
        'r1', // ADO uses the repo id
        expect.arrayContaining([
          expect.objectContaining({ kind: 'drift' }),
          expect.objectContaining({ kind: 'versionlab' }),
        ]),
      ),
    )
    // The PR poller reports the merge.
    expect(await screen.findByText(i18n.t('pages.drift.wizard.prMerged') as string)).toBeInTheDocument()
  })

  it('copies the template to the clipboard', async () => {
    renderWizard()
    const dialog = await pickSourceAndRepo(/corp-ado/)
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('common.next') as string }))
    await within(dialog).findByText(/drift yaml/)

    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('pages.drift.wizard.copy') as string }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('drift yaml'))
    expect(await within(dialog).findByText(i18n.t('pages.drift.wizard.copied') as string)).toBeInTheDocument()
  })

  it('finishes the ADO path: creates the pipeline, connection, and first run', async () => {
    mocked.createCISourcePipeline.mockResolvedValue({ id: 42, name: 'corp drift', folder: '\\' } as Awaited<
      ReturnType<typeof api.createCISourcePipeline>
    >)
    mocked.createPipeline.mockResolvedValue({ id: 'p9', name: 'corp drift', provider: 'azure_devops', config: {} } as Awaited<
      ReturnType<typeof api.createPipeline>
    >)
    mocked.createDriftRun.mockResolvedValue({ id: 'd9', status: 'dispatched' } as Awaited<
      ReturnType<typeof api.createDriftRun>
    >)
    const onCreated = renderWizard()
    const dialog = await pickSourceAndRepo(/corp-ado/)

    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('common.next') as string }))
    await within(dialog).findByText(/drift yaml/)
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('common.next') as string }))

    fireEvent.change(
      await within(dialog).findByLabelText(new RegExp(`^${i18n.t('pages.drift.wizard.pipelineName')}`)),
      { target: { value: 'corp drift' } },
    )
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('pages.drift.wizard.createBoth') as string }))

    await waitFor(() => expect(mocked.createCISourcePipeline).toHaveBeenCalledWith('c1', 'r1', expect.anything()))
    await waitFor(() =>
      expect(mocked.createPipeline).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'corp drift',
          provider: 'azure_devops',
          config: expect.objectContaining({ ci_source_id: 'c1', pipeline_id: '42' }),
        }),
      ),
    )
    // First-run dispatch is on by default.
    await waitFor(() => expect(mocked.createDriftRun).toHaveBeenCalledWith({ pipeline_connection_id: 'p9' }))
    expect(await screen.findByText(i18n.t('pages.drift.wizard.firstRunDispatched') as string)).toBeInTheDocument()
    expect(onCreated).toHaveBeenCalled()
  })

  it('offers Use Existing when an ADO pipeline with the same name exists', async () => {
    mocked.listCISourcePipelines.mockResolvedValue([
      { id: 7, name: 'corp drift', folder: '\\' },
    ] as Awaited<ReturnType<typeof api.listCISourcePipelines>>)
    mocked.createPipeline.mockResolvedValue({ id: 'p9', name: 'corp drift', provider: 'azure_devops', config: {} } as Awaited<
      ReturnType<typeof api.createPipeline>
    >)
    mocked.createDriftRun.mockResolvedValue({ id: 'd9', status: 'dispatched' } as Awaited<
      ReturnType<typeof api.createDriftRun>
    >)
    renderWizard()
    const dialog = await pickSourceAndRepo(/corp-ado/)
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('common.next') as string }))
    await within(dialog).findByText(/drift yaml/)
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('common.next') as string }))

    fireEvent.change(
      await within(dialog).findByLabelText(new RegExp(`^${i18n.t('pages.drift.wizard.pipelineName')}`)),
      { target: { value: 'corp drift' } },
    )
    // Existing pipeline detected → offer to reuse it; the primary action flips
    // to "create anyway".
    fireEvent.click(await within(dialog).findByRole('button', { name: i18n.t('pages.drift.wizard.useExisting') as string }))
    await waitFor(() =>
      expect(mocked.createPipeline).toHaveBeenCalledWith(
        expect.objectContaining({ config: expect.objectContaining({ pipeline_id: '7' }) }),
      ),
    )
    expect(mocked.createCISourcePipeline).not.toHaveBeenCalled()
  })

  it('GitHub path: warns when the workflow is missing, connects when present', async () => {
    mocked.createPipeline.mockResolvedValue({ id: 'p9', name: 'gh conn', provider: 'github_actions', config: {} } as Awaited<
      ReturnType<typeof api.createPipeline>
    >)
    mocked.createDriftRun.mockResolvedValue({ id: 'd9', status: 'dispatched' } as Awaited<
      ReturnType<typeof api.createDriftRun>
    >)
    renderWizard()
    const dialog = await pickSourceAndRepo(/corp-gh/)
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('common.next') as string }))
    await within(dialog).findByText(/drift yaml/)
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('common.next') as string }))

    fireEvent.change(
      await within(dialog).findByLabelText(new RegExp(`^${i18n.t('pages.drift.wizard.connectionName')}`)),
      { target: { value: 'gh conn' } },
    )

    // First detection: workflow not committed yet.
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('pages.drift.wizard.detectConnect') as string }))
    expect(await screen.findByText(new RegExp('tsm-drift\\.yml'))).toBeInTheDocument()
    expect(mocked.createPipeline).not.toHaveBeenCalled()

    // Second attempt: the workflow now exists → the connection is created.
    mocked.listCISourceWorkflows.mockResolvedValue([
      { id: 1, name: 'Drift', file: 'tsm-drift.yml', state: 'active' },
    ] as unknown as Awaited<ReturnType<typeof api.listCISourceWorkflows>>)
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('pages.drift.wizard.checkAgain') as string }))
    await waitFor(() =>
      expect(mocked.createPipeline).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'github_actions',
          config: expect.objectContaining({ ci_source_id: 'c2', owner: 'corp', repo: 'infra' }),
        }),
      ),
    )
  })
})
