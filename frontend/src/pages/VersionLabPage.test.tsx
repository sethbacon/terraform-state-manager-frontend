import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import VersionLabPage from './VersionLabPage'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useSuite } from '../hooks/useSuite'
import i18n from '../i18n'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>()
  return {
    ...actual,
    api: {
      listPipelines: vi.fn(),
      listHealthRuns: vi.fn(),
      createHealthRun: vi.fn(),
      getHealthWorkflow: vi.fn(),
    },
  }
})
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../hooks/useSuite', () => ({ useSuite: vi.fn() }))

const mocked = vi.mocked(api)
const mockedUseAuth = vi.mocked(useAuth)
const mockedUseSuite = vi.mocked(useSuite)
type AuthShape = ReturnType<typeof useAuth>

const pipelines = [{ id: 'p1', name: 'health-ci', provider: 'github_actions', config: {}, created_at: '', updated_at: '' }]
const runs = [
  {
    id: 'h1',
    pipeline_connection_id: 'p1',
    repo_ref: 'main',
    working_dir: '',
    terraform_version: '1.9.5',
    provider_versions: { aws: '5.0.0' },
    module_versions: {},
    registry_host: '',
    status: 'completed',
    init_ok: true,
    plan_ok: true,
    success: true,
    summary: null,
    detail: '',
    actor: 'alice',
    created_at: '2026-06-11T08:00:00Z',
    updated_at: '2026-06-11T08:05:00Z',
  },
  {
    id: 'h2',
    pipeline_connection_id: 'p1',
    repo_ref: '',
    working_dir: '',
    terraform_version: '',
    provider_versions: {},
    module_versions: {},
    registry_host: '',
    status: 'completed',
    init_ok: true,
    plan_ok: false,
    success: false,
    summary: null,
    detail: 'plan failed: provider mismatch',
    actor: 'alice',
    created_at: '2026-06-11T07:00:00Z',
    updated_at: '2026-06-11T07:05:00Z',
  },
]

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <VersionLabPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseAuth.mockReturnValue({ hasScope: () => true } as unknown as AuthShape)
  mockedUseSuite.mockReturnValue({ sibling: null, active: false } as ReturnType<typeof useSuite>)
  mocked.listPipelines.mockResolvedValue(pipelines as Awaited<ReturnType<typeof api.listPipelines>>)
  mocked.listHealthRuns.mockResolvedValue({ runs, total: runs.length } as Awaited<ReturnType<typeof api.listHealthRuns>>)
})

describe('VersionLabPage', () => {
  it('lists runs with health status and check results', async () => {
    renderPage()
    expect(await screen.findByText(i18n.t('pages.versionLab.statusHealthy') as string)).toBeInTheDocument()
    expect(screen.getByText(i18n.t('pages.versionLab.statusUnhealthy') as string)).toBeInTheDocument()
    expect(screen.getByText('1.9.5')).toBeInTheDocument()
    expect(screen.getByText(/plan failed: provider mismatch/)).toBeInTheDocument()
  })

  it('paginates and filters health runs server-side', async () => {
    mocked.listHealthRuns.mockResolvedValueOnce({ runs, total: 60 } as Awaited<ReturnType<typeof api.listHealthRuns>>)
    renderPage()
    await screen.findByText('1.9.5')
    expect(screen.getByText(/of 60/)).toBeInTheDocument()

    // Next advances the server offset by one page.
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.next') as string }))
    await waitFor(() =>
      expect(mocked.listHealthRuns).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 25 })),
    )

    // The status filter is sent to the server.
    fireEvent.mouseDown(screen.getByLabelText(i18n.t('common.status') as string))
    fireEvent.click(await screen.findByRole('option', { name: 'failed' }))
    await waitFor(() =>
      expect(mocked.listHealthRuns).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'failed' })),
    )
  })

  it('hints when no pipelines are configured and disables the run button', async () => {
    mocked.listPipelines.mockResolvedValue([])
    mocked.listHealthRuns.mockResolvedValue({ runs: [], total: 0 } as Awaited<ReturnType<typeof api.listHealthRuns>>)
    renderPage()
    expect(await screen.findByText(i18n.t('pages.versionLab.noPipelines') as string)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: i18n.t('actions.newHealthRun') as string })).toBeDisabled()
  })

  it('shows the no-runs hint', async () => {
    mocked.listHealthRuns.mockResolvedValue({ runs: [], total: 0 } as Awaited<ReturnType<typeof api.listHealthRuns>>)
    renderPage()
    expect(await screen.findByText(i18n.t('pages.versionLab.noRuns') as string)).toBeInTheDocument()
  })

  it('hides the run button without the execute scope', async () => {
    mockedUseAuth.mockReturnValue({ hasScope: () => false } as unknown as AuthShape)
    renderPage()
    await screen.findByText(i18n.t('pages.versionLab.statusHealthy') as string)
    expect(screen.queryByRole('button', { name: i18n.t('actions.newHealthRun') as string })).not.toBeInTheDocument()
  })

  it('dispatches a run from the dialog', async () => {
    mocked.createHealthRun.mockResolvedValue(runs[0] as Awaited<ReturnType<typeof api.createHealthRun>>)
    renderPage()
    await screen.findByText('1.9.5')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('actions.newHealthRun') as string }))
    fireEvent.change(await screen.findByLabelText(new RegExp(`^${i18n.t('pages.versionLab.pipeline')}`)), {
      target: { value: 'health' },
    })
    fireEvent.click(await screen.findByRole('option', { name: /health-ci/ }))
    fireEvent.change(screen.getByLabelText(new RegExp(`^${i18n.t('pages.versionLab.terraformVersion')}`)), {
      target: { value: '1.9.5' },
    })

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.versionLab.dispatch') as string }))
    await waitFor(() =>
      expect(mocked.createHealthRun).toHaveBeenCalledWith(
        expect.objectContaining({ pipeline_connection_id: 'p1', terraform_version: '1.9.5' }),
      ),
    )
  })

  it('surfaces a dispatch failure inside the dialog', async () => {
    mocked.createHealthRun.mockRejectedValue({ response: { data: { error: 'pipeline rejected the run' } } })
    renderPage()
    await screen.findByText('1.9.5')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('actions.newHealthRun') as string }))
    fireEvent.change(await screen.findByLabelText(new RegExp(`^${i18n.t('pages.versionLab.pipeline')}`)), {
      target: { value: 'health' },
    })
    fireEvent.click(await screen.findByRole('option', { name: /health-ci/ }))
    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.versionLab.dispatch') as string }))

    expect(await screen.findByText('pipeline rejected the run')).toBeInTheDocument()
  })

  it('shows the workflow template per provider', async () => {
    mocked.getHealthWorkflow.mockResolvedValue('yaml: tsm-health')
    renderPage()
    await screen.findByText('1.9.5')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('actions.workflowTemplate') as string }))
    expect(await screen.findByText(/yaml: tsm-health/)).toBeInTheDocument()
    expect(mocked.getHealthWorkflow).toHaveBeenCalled()
  })

  it('auto-fills the registry host from a connected sibling registry', async () => {
    mockedUseSuite.mockReturnValue({
      sibling: { app: 'terraform-registry', state: 'active', publicUrl: 'https://registry.example.com' },
      active: true,
    } as ReturnType<typeof useSuite>)
    renderPage()
    await screen.findByText('1.9.5')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('actions.newHealthRun') as string }))
    // Label is "Registry host (optional)"; match the prefix to avoid escaping the parens.
    const field = (await screen.findByLabelText(/registry host/i)) as HTMLInputElement
    await waitFor(() => expect(field.value).toBe('registry.example.com'))
  })

  it('leaves the registry host empty when standalone (no sibling)', async () => {
    renderPage() // beforeEach default: sibling null, active false
    await screen.findByText('1.9.5')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('actions.newHealthRun') as string }))
    const field = (await screen.findByLabelText(/registry host/i)) as HTMLInputElement
    expect(field.value).toBe('')
  })
})
