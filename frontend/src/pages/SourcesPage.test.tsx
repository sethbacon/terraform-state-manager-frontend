import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SourcesPage from './SourcesPage'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import i18n from '../i18n'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>()
  return {
    ...actual,
    api: {
      listSources: vi.fn(),
      deleteSource: vi.fn(),
      createSource: vi.fn(),
      analyzeUpload: vi.fn(),
      listStates: vi.fn(),
      analyzeState: vi.fn(),
      listStateResources: vi.fn(),
      getRawState: vi.fn(),
      editState: vi.fn(),
      listBackups: vi.fn(),
      restoreBackup: vi.fn(),
      downloadReport: vi.fn(),
      stateOperation: vi.fn(),
      backupToSource: vi.fn(),
      migrateToSource: vi.fn(),
    },
  }
})
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))

const mocked = vi.mocked(api)
const mockedUseAuth = vi.mocked(useAuth)
type AuthShape = ReturnType<typeof useAuth>

const sources = [
  { id: 's1', name: 'demo-local', type: 'local', config: { base_path: '/data/states' } },
  { id: 's2', name: 'archive', type: 's3', config: {} },
]

const states = [
  { key: 'app.tfstate', name: 'app.tfstate', size: 2048, last_modified: '2026-06-11T08:00:00Z' },
  { key: 'net.tfstate', name: 'net.tfstate', size: 1024 },
]

const analysis = {
  key: 'app.tfstate',
  size: 2048,
  analysis: {
    terraform_version: '1.9.5',
    format_version: 4,
    serial: 7,
    lineage: 'lin-1',
    total_resources: 21,
    managed_resources: 19,
    data_sources: 2,
    null_resources: 1,
    rum: 18,
    resource_types: [{ key: 'aws_instance', count: 9 }],
    providers: [{ key: 'aws', count: 19 }],
    modules: [],
  },
}

const resources = [
  { module: 'root', mode: 'managed', type: 'aws_instance', name: 'web', provider: 'aws', instances: 2 },
  { module: 'module.vpc', mode: 'data', type: 'aws_ami', name: 'ubuntu', provider: 'aws', instances: 1 },
]

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <SourcesPage />
    </QueryClientProvider>,
  )
}

async function openStateDetail() {
  renderPage()
  await screen.findByText('demo-local')
  fireEvent.click(screen.getAllByRole('button', { name: i18n.t('pages.sources.browseStates') as string })[0])
  fireEvent.click(await screen.findByText('app.tfstate'))
  await screen.findByText(i18n.t('pages.sources.tabAnalysis') as string)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseAuth.mockReturnValue({ hasScope: () => true } as unknown as AuthShape)
  mocked.listSources.mockResolvedValue(sources as Awaited<ReturnType<typeof api.listSources>>)
  mocked.listStates.mockResolvedValue(states as Awaited<ReturnType<typeof api.listStates>>)
  mocked.analyzeState.mockResolvedValue(analysis as Awaited<ReturnType<typeof api.analyzeState>>)
  mocked.listStateResources.mockResolvedValue(resources as Awaited<ReturnType<typeof api.listStateResources>>)
})

describe('SourcesPage', () => {
  it('lists source cards with type chips and config hints', async () => {
    renderPage()
    expect(await screen.findByText('demo-local')).toBeInTheDocument()
    expect(screen.getByText('/data/states')).toBeInTheDocument()
    expect(screen.getByText('local')).toBeInTheDocument()
    expect(screen.getByText('s3')).toBeInTheDocument()
  })

  it('shows empty and error states', async () => {
    mocked.listSources.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(i18n.t('pages.sources.empty') as string)).toBeInTheDocument()

    mocked.listSources.mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByText(i18n.t('pages.sources.loadFailed') as string)).toBeInTheDocument()
  })

  it('analyzes an uploaded state file in a dialog', async () => {
    mocked.analyzeUpload.mockResolvedValue({
      analysis: analysis.analysis,
      resources,
    } as Awaited<ReturnType<typeof api.analyzeUpload>>)
    const { container } = renderPage()
    await screen.findByText('demo-local')

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([JSON.stringify({ version: 4 })], 'uploaded.tfstate', { type: 'application/json' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(mocked.analyzeUpload).toHaveBeenCalled())
    expect(await screen.findByText(/uploaded\.tfstate/)).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument() // RUM stat card

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.close') as string }))
    await waitFor(() => expect(screen.queryByText(/uploaded\.tfstate/)).not.toBeInTheDocument())
  })

  it('surfaces an upload-analyze failure', async () => {
    mocked.analyzeUpload.mockRejectedValue(new Error('not state'))
    const { container } = renderPage()
    await screen.findByText('demo-local')

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'bad.tfstate')] } })
    expect(await screen.findByText(i18n.t('pages.sources.uploadError') as string)).toBeInTheDocument()
  })

  it('deletes a source behind type-to-confirm', async () => {
    mocked.deleteSource.mockResolvedValue(undefined)
    renderPage()
    await screen.findByText('demo-local')

    fireEvent.click(screen.getAllByLabelText(i18n.t('pages.sources.deleteSourceAria') as string)[0])
    const confirm = await screen.findByTestId('confirm-dialog-confirm')
    expect(confirm).toBeDisabled()

    fireEvent.change(screen.getByTestId('confirm-dialog-type-input'), { target: { value: 'demo-local' } })
    fireEvent.click(confirm)
    await waitFor(() => expect(mocked.deleteSource.mock.calls[0]?.[0]).toBe('s1'))
  })

  it('browses states and renders the analysis tab', async () => {
    await openStateDetail()
    expect(mocked.listStates).toHaveBeenCalledWith('s1')
    expect(await screen.findByText('18')).toBeInTheDocument() // RUM
    expect(screen.getByText('1.9.5')).toBeInTheDocument()
    expect(screen.getByText('aws_instance')).toBeInTheDocument() // breakdown
    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument() // list metadata
  })

  it('offers a type-to-filter only for long state lists and filters them', async () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      key: `ws-${i}.tfstate`,
      name: `workspace-${i}.tfstate`,
      size: 100,
    }))
    mocked.listStates.mockResolvedValue(many as Awaited<ReturnType<typeof api.listStates>>)
    renderPage()
    await screen.findByText('demo-local')
    fireEvent.click(screen.getAllByRole('button', { name: i18n.t('pages.sources.browseStates') as string })[0])

    const filter = await screen.findByPlaceholderText(
      i18n.t('pages.sources.filterStates', { count: 10 }) as string,
    )
    fireEvent.change(filter, { target: { value: 'workspace-7' } })
    expect(screen.getByText('workspace-7.tfstate')).toBeInTheDocument()
    expect(screen.queryByText('workspace-3.tfstate')).not.toBeInTheDocument()

    fireEvent.change(filter, { target: { value: 'zzz' } })
    expect(screen.getByText(i18n.t('pages.sources.noStatesMatch', { filter: 'zzz' }) as string)).toBeInTheDocument()
  })

  it('renders the resources tab', async () => {
    await openStateDetail()
    fireEvent.click(screen.getByRole('tab', { name: i18n.t('pages.sources.tabResources') as string }))
    expect(await screen.findByText('web')).toBeInTheDocument()
    expect(screen.getByText('aws_ami')).toBeInTheDocument()
  })

  it('edits raw state through the overwrite confirmation', async () => {
    mocked.getRawState.mockResolvedValue('{"version":4,"serial":7}')
    mocked.editState.mockResolvedValue({ status: 'written', serial: 8 } as Awaited<ReturnType<typeof api.editState>>)
    await openStateDetail()

    fireEvent.click(screen.getByRole('tab', { name: i18n.t('pages.sources.tabRaw') as string }))
    fireEvent.click(await screen.findByRole('button', { name: i18n.t('common.edit') as string }))

    const editor = screen.getByDisplayValue(/"serial": 7/)
    // Invalid JSON disables saving.
    fireEvent.change(editor, { target: { value: '{nope' } })
    expect(screen.getByText(i18n.t('pages.sources.notValidJson') as string)).toBeInTheDocument()

    fireEvent.change(editor, { target: { value: '{"version":4,"serial":8}' } })
    const saveBtn = screen
      .getAllByRole('button')
      .find((b) => !(b as HTMLButtonElement).disabled && b.textContent === (i18n.t('common.save') as string))
    fireEvent.click(saveBtn ?? screen.getByText(i18n.t('common.save') as string))

    fireEvent.click(await screen.findByRole('button', { name: i18n.t('pages.sources.overwrite') as string }))
    await waitFor(() => expect(mocked.editState).toHaveBeenCalledWith('s1', 'app.tfstate', '{"version":4,"serial":8}'))
  })

  it('lists backups and restores one', async () => {
    mocked.listBackups.mockResolvedValue([
      { id: 'b1', source_id: 's1', state_key: 'app.tfstate', serial: 6, created_by: 'alice', created_at: '2026-06-10T00:00:00Z' },
    ] as Awaited<ReturnType<typeof api.listBackups>>)
    mocked.restoreBackup.mockResolvedValue(undefined)
    await openStateDetail()

    fireEvent.click(screen.getByRole('tab', { name: i18n.t('pages.sources.tabBackups') as string }))
    fireEvent.click(await screen.findByRole('button', { name: i18n.t('pages.sources.restore') as string }))
    await waitFor(() => expect(mocked.restoreBackup).toHaveBeenCalledWith('s1', 'b1', 'app.tfstate'))
  })

  it('downloads reports in each format', async () => {
    mocked.downloadReport.mockResolvedValue(undefined)
    await openStateDetail()

    fireEvent.click(screen.getByRole('button', { name: 'MD' }))
    fireEvent.click(screen.getByRole('button', { name: 'JSON' }))
    fireEvent.click(screen.getByRole('button', { name: 'CSV' }))
    expect(mocked.downloadReport).toHaveBeenCalledWith('s1', 'app.tfstate', 'md')
    expect(mocked.downloadReport).toHaveBeenCalledWith('s1', 'app.tfstate', 'json')
    expect(mocked.downloadReport).toHaveBeenCalledWith('s1', 'app.tfstate', 'csv')
  })

  it('hides write/transfer actions without their scopes', async () => {
    mockedUseAuth.mockReturnValue({ hasScope: () => false } as unknown as AuthShape)
    await openStateDetail()
    expect(screen.queryByRole('button', { name: i18n.t('pages.sources.stateOps') as string })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: i18n.t('pages.sources.transfer') as string })).not.toBeInTheDocument()
  })

  it('applies an rm state operation with a picked resource address', async () => {
    mocked.stateOperation.mockResolvedValue({ status: 'applied', op: 'rm', backup_id: 'b9', serial: 8 } as Awaited<
      ReturnType<typeof api.stateOperation>
    >)
    await openStateDetail()

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.sources.stateOps') as string }))
    const dialog = await screen.findByRole('dialog')

    // Pick the address from the resource picker (root module → bare address).
    const addressBox = within(dialog).getByLabelText(new RegExp(`^${i18n.t('pages.sources.resourceAddress')}`))
    fireEvent.mouseDown(addressBox)
    fireEvent.change(addressBox, { target: { value: 'aws_instance' } })
    fireEvent.click(await screen.findByText('aws_instance.web'))

    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))
    await waitFor(() =>
      expect(mocked.stateOperation).toHaveBeenCalledWith('s1', 'app.tfstate', 'rm', 'aws_instance.web', undefined),
    )
  })

  it('requires a destination for mv operations', async () => {
    mocked.stateOperation.mockResolvedValue({ status: 'applied', op: 'mv', backup_id: 'b9', serial: 8 } as Awaited<
      ReturnType<typeof api.stateOperation>
    >)
    await openStateDetail()

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.sources.stateOps') as string }))
    const dialog = await screen.findByRole('dialog')

    // Switch to mv first (select interactions hide the dialog while open).
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[0])
    fireEvent.click(await screen.findByRole('option', { name: i18n.t('pages.sources.opMove') as string }))

    const addressBox = within(dialog).getByLabelText(new RegExp(`^${i18n.t('pages.sources.resourceAddress')}`))
    fireEvent.change(addressBox, { target: { value: 'aws_instance.web' } })

    const apply = within(dialog).getByRole('button', { name: 'Apply' })
    expect(apply).toBeDisabled()

    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('pages.sources.newAddress')}`)), {
      target: { value: 'aws_instance.web2' },
    })
    fireEvent.click(apply)
    await waitFor(() =>
      expect(mocked.stateOperation).toHaveBeenCalledWith('s1', 'app.tfstate', 'mv', 'aws_instance.web', 'aws_instance.web2'),
    )
  })

  it('runs an in-page backup transfer from the state detail', async () => {
    mocked.backupToSource.mockResolvedValue({ mode: 'backup', status: 'success', verified: true } as Awaited<
      ReturnType<typeof api.backupToSource>
    >)
    await openStateDetail()

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.sources.transfer') as string }))
    const dialog = await screen.findByRole('dialog')

    // Target source select (first combobox is mode, second target source).
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[1])
    fireEvent.click(await screen.findByRole('option', { name: /archive/ }))

    const run = within(dialog)
      .getAllByRole('button')
      .find((b) => !(b as HTMLButtonElement).disabled && /backup/i.test(b.textContent ?? ''))!
    fireEvent.click(run)
    await waitFor(() => expect(mocked.backupToSource).toHaveBeenCalled())
  })

  it('creates a source with type-specific config/credential split', async () => {
    mocked.createSource.mockResolvedValue(sources[0] as Awaited<ReturnType<typeof api.createSource>>)
    renderPage()
    await screen.findByText('demo-local')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('actions.addSource') as string }))
    const dialog = await screen.findByRole('dialog')

    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('common.name')}`)), {
      target: { value: 'hcp-prod' },
    })
    // Switch type to HCP — its fields replace the local ones.
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[0])
    fireEvent.click(await screen.findByRole('option', { name: /HCP/ }))

    const orgField = await within(dialog).findByLabelText(/[Oo]rganization/)
    fireEvent.change(orgField, { target: { value: 'acme' } })
    const tokenField = within(dialog).getByLabelText(/[Tt]oken/)
    fireEvent.change(tokenField, { target: { value: 'tfe-secret' } })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }))
    await waitFor(() =>
      expect(mocked.createSource).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'hcp-prod',
          type: 'hcp',
          config: expect.objectContaining({ organization: 'acme' }),
          credentials: expect.objectContaining({ token: 'tfe-secret' }),
        }),
      ),
    )
  })

  it('surfaces the backend error when source creation fails', async () => {
    mocked.createSource.mockRejectedValue({ response: { data: { error: 'base_path is not a directory' } } })
    renderPage()
    await screen.findByText('demo-local')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('actions.addSource') as string }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('common.name')}`)), {
      target: { value: 'bad' },
    })
    const pathField = within(dialog).getByLabelText(/path/i)
    fireEvent.change(pathField, { target: { value: '/nope' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('base_path is not a directory')).toBeInTheDocument()
  })
})
