import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import SchedulesPage from './SchedulesPage'
import { api } from '../services/api'
import i18n from '../i18n'

// Dedicated file for the Phase 4b targets-repeater scenarios on
// ScheduleFormDialog (defined inside SchedulesPage.tsx) — kept separate from
// SchedulesPage.test.tsx so the fan-out-specific setup doesn't clutter the
// existing single-target suite.
vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>()
  return {
    ...actual,
    api: {
      listSchedules: vi.fn(),
      listPipelines: vi.fn(),
      createSchedule: vi.fn(),
      updateSchedule: vi.fn(),
      deleteSchedule: vi.fn(),
      runSchedule: vi.fn(),
      listSources: vi.fn(),
      listStates: vi.fn(),
    },
  }
})

const mocked = vi.mocked(api)

const pipelines = [
  { id: 'p1', name: 'drift-ci', provider: 'github_actions', config: {}, created_at: '', updated_at: '' },
  { id: 'p2', name: 'fanout-ci', provider: 'azure_devops', config: { fan_out: true }, created_at: '', updated_at: '' },
]

const sources = [{ id: 's1', name: 'estate', type: 'local', config: {} }]

const states = [
  { key: 'app1.tfstate', name: 'app1.tfstate', size: 10 },
  { key: 'app2.tfstate', name: 'app2.tfstate', size: 10 },
  { key: 'other.tfstate', name: 'other.tfstate', size: 10 },
]

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SchedulesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function openAddDialog() {
  fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.schedules.add') as string }))
  await screen.findByLabelText(new RegExp(`^${i18n.t('common.name')}`))
}

async function pickFanOutPipeline() {
  fireEvent.mouseDown(screen.getByLabelText(new RegExp(`^${i18n.t('pages.schedules.pipeline')}`)))
  fireEvent.click(await screen.findByRole('option', { name: /fanout-ci/ }))
}

beforeEach(() => {
  vi.clearAllMocks()
  mocked.listSchedules.mockResolvedValue([])
  mocked.listPipelines.mockResolvedValue(pipelines as Awaited<ReturnType<typeof api.listPipelines>>)
  mocked.listSources.mockResolvedValue(sources as unknown as Awaited<ReturnType<typeof api.listSources>>)
  mocked.listStates.mockResolvedValue(states as unknown as Awaited<ReturnType<typeof api.listStates>>)
})

describe('ScheduleFormDialog targets repeater (fan-out)', () => {
  it('shows the single source/state fields for a non-fan-out connection (unchanged behavior)', async () => {
    renderPage()
    await openAddDialog()
    fireEvent.mouseDown(screen.getByLabelText(new RegExp(`^${i18n.t('pages.schedules.pipeline')}`)))
    fireEvent.click(await screen.findByRole('option', { name: /drift-ci/ }))
    expect(screen.getByLabelText(i18n.t('pages.schedules.sourceOptional') as string)).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('pages.schedules.fanOutTargets') as string)).not.toBeInTheDocument()
  })

  it('swaps to the targets repeater for a fan-out-capable connection', async () => {
    renderPage()
    await openAddDialog()
    await pickFanOutPipeline()
    expect(screen.getByText(i18n.t('pages.schedules.fanOutTargets') as string)).toBeInTheDocument()
    expect(screen.queryByLabelText(i18n.t('pages.schedules.sourceOptional') as string)).not.toBeInTheDocument()
  })

  it('adds a target row and saves it in target_config.targets', async () => {
    mocked.createSchedule.mockResolvedValue({
      id: 'sc9',
      name: 'fanout nightly',
      cron_expr: 'daily',
      target_type: 'drift',
      target_config: { pipeline_connection_id: 'p2' },
      enabled: true,
      last_run_at: null,
      next_run_at: null,
      last_run_id: null,
      last_status: null,
      created_at: '',
      updated_at: '',
    })
    renderPage()
    await openAddDialog()
    fireEvent.change(screen.getByLabelText(new RegExp(`^${i18n.t('common.name')}`)), {
      target: { value: 'fanout nightly' },
    })
    await pickFanOutPipeline()

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.schedules.addTarget') as string }))

    fireEvent.mouseDown(screen.getByLabelText(i18n.t('pages.schedules.targetSource') as string))
    fireEvent.click(await screen.findByRole('option', { name: 'estate' }))

    await waitFor(() => expect(mocked.listStates).toHaveBeenCalledWith('s1'))
    await waitFor(() =>
      expect(screen.getByLabelText(i18n.t('pages.schedules.targetState') as string)).not.toBeDisabled(),
    )
    fireEvent.mouseDown(screen.getByLabelText(i18n.t('pages.schedules.targetState') as string))
    fireEvent.click(await screen.findByText('app1.tfstate'))

    fireEvent.change(screen.getByLabelText(i18n.t('pages.schedules.targetWorkingDir') as string), {
      target: { value: 'envs/app1' },
    })

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') as string }))
    await waitFor(() =>
      expect(mocked.createSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          target_config: expect.objectContaining({
            pipeline_connection_id: 'p2',
            targets: [{ source_id: 's1', state_key: 'app1.tfstate', working_dir: 'envs/app1' }],
          }),
        }),
      ),
    )
  })

  it('bulk-adds every state matching a regex pattern', async () => {
    renderPage()
    await openAddDialog()
    await pickFanOutPipeline()

    fireEvent.mouseDown(screen.getByLabelText(i18n.t('pages.schedules.bulkSourceLabel') as string))
    fireEvent.click(await screen.findByRole('option', { name: 'estate' }))
    await waitFor(() => expect(mocked.listStates).toHaveBeenCalledWith('s1'))

    fireEvent.change(screen.getByLabelText(i18n.t('pages.schedules.bulkPattern') as string), {
      target: { value: '^app\\d+\\.tfstate$' },
    })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.schedules.bulkAdd') as string }))

    expect(await screen.findByDisplayValue('app1.tfstate')).toBeInTheDocument()
    expect(screen.getByDisplayValue('app2.tfstate')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('other.tfstate')).not.toBeInTheDocument()
  })

  it('disables Save while fan-out mode has zero targets', async () => {
    renderPage()
    await openAddDialog()
    fireEvent.change(screen.getByLabelText(new RegExp(`^${i18n.t('common.name')}`)), { target: { value: 'x' } })
    await pickFanOutPipeline()
    expect(screen.getByRole('button', { name: i18n.t('common.save') as string })).toBeDisabled()
  })
})
