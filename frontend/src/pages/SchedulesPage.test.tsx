import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SchedulesPage from './SchedulesPage'
import { api } from '../services/api'
import i18n from '../i18n'

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

const schedule = {
  id: 'sc1',
  name: 'nightly drift',
  cron_expr: '0 2 * * *',
  target_type: 'drift',
  target_config: { pipeline_connection_id: 'p1' },
  enabled: true,
  last_run_at: '2026-06-10T02:00:00Z',
  next_run_at: '2026-06-12T02:00:00Z',
  last_run_id: 'd1',
  last_status: 'success',
  created_at: '2026-06-01',
  updated_at: '2026-06-10',
}

const pipelines = [{ id: 'p1', name: 'drift-ci', provider: 'github_actions', config: {}, created_at: '', updated_at: '' }]

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <SchedulesPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocked.listSchedules.mockResolvedValue([schedule] as Awaited<ReturnType<typeof api.listSchedules>>)
  mocked.listPipelines.mockResolvedValue(pipelines as Awaited<ReturnType<typeof api.listPipelines>>)
  mocked.listSources.mockResolvedValue([])
  mocked.listStates.mockResolvedValue([])
})

describe('SchedulesPage', () => {
  it('lists schedules with pipeline name, status, and next run', async () => {
    renderPage()
    expect(await screen.findByText('nightly drift')).toBeInTheDocument()
    expect(screen.getByText('0 2 * * *')).toBeInTheDocument()
    expect(screen.getByText('drift-ci')).toBeInTheDocument()
    expect(screen.getByText('success')).toBeInTheDocument()
  })

  it('shows the empty hint when no schedules exist', async () => {
    mocked.listSchedules.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(i18n.t('pages.schedules.noSchedules') as string)).toBeInTheDocument()
  })

  it('creates a schedule through the dialog', async () => {
    mocked.createSchedule.mockResolvedValue(schedule as Awaited<ReturnType<typeof api.createSchedule>>)
    renderPage()
    await screen.findByText('nightly drift')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.schedules.add') as string }))
    fireEvent.change(await screen.findByLabelText(new RegExp(`^${i18n.t('common.name')}`)), {
      target: { value: 'weekly health' },
    })
    fireEvent.change(screen.getByLabelText(new RegExp(`^${i18n.t('pages.schedules.cron')}`)), {
      target: { value: 'weekly' },
    })
    fireEvent.mouseDown(screen.getByLabelText(new RegExp(`^${i18n.t('pages.schedules.pipeline')}`)))
    fireEvent.click(await screen.findByRole('option', { name: /drift-ci/ }))

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') as string }))
    await waitFor(() =>
      expect(mocked.createSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'weekly health',
          cron_expr: 'weekly',
          target_type: 'drift',
          target_config: expect.objectContaining({ pipeline_connection_id: 'p1' }),
        }),
      ),
    )
  })

  it('links a new schedule to a picked source and state', async () => {
    mocked.createSchedule.mockResolvedValue(schedule as Awaited<ReturnType<typeof api.createSchedule>>)
    mocked.listSources.mockResolvedValue([
      { id: 's1', name: 'estate', type: 'local', config: {} },
    ] as unknown as Awaited<ReturnType<typeof api.listSources>>)
    mocked.listStates.mockResolvedValue([
      { key: 'app.tfstate', name: 'app.tfstate', size: 10 },
    ] as unknown as Awaited<ReturnType<typeof api.listStates>>)
    renderPage()
    await screen.findByText('nightly drift')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.schedules.add') as string }))
    fireEvent.change(await screen.findByLabelText(new RegExp(`^${i18n.t('common.name')}`)), {
      target: { value: 'weekly health' },
    })
    fireEvent.change(screen.getByLabelText(new RegExp(`^${i18n.t('pages.schedules.cron')}`)), {
      target: { value: 'weekly' },
    })
    fireEvent.mouseDown(screen.getByLabelText(new RegExp(`^${i18n.t('pages.schedules.pipeline')}`)))
    fireEvent.click(await screen.findByRole('option', { name: /drift-ci/ }))

    fireEvent.mouseDown(screen.getByLabelText(i18n.t('pages.schedules.sourceOptional') as string))
    fireEvent.click(await screen.findByRole('option', { name: 'estate' }))
    await waitFor(() => expect(mocked.listStates).toHaveBeenCalledWith('s1'))

    await waitFor(() =>
      expect(screen.getByLabelText(i18n.t('pages.schedules.stateOptional') as string)).not.toBeDisabled(),
    )
    fireEvent.mouseDown(screen.getByLabelText(i18n.t('pages.schedules.stateOptional') as string))
    fireEvent.click(await screen.findByText('app.tfstate'))

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') as string }))
    await waitFor(() =>
      expect(mocked.createSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          target_config: expect.objectContaining({ source_id: 's1', state_key: 'app.tfstate' }),
        }),
      ),
    )
  })

  it('edits an existing schedule with its values seeded', async () => {
    mocked.updateSchedule.mockResolvedValue(schedule as Awaited<ReturnType<typeof api.updateSchedule>>)
    renderPage()
    await screen.findByText('nightly drift')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.edit') as string }))
    const nameField = await screen.findByLabelText(new RegExp(`^${i18n.t('common.name')}`))
    expect(nameField).toHaveValue('nightly drift')

    fireEvent.change(nameField, { target: { value: 'nightly drift v2' } })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') as string }))
    await waitFor(() =>
      expect(mocked.updateSchedule).toHaveBeenCalledWith('sc1', expect.objectContaining({ name: 'nightly drift v2' })),
    )
  })

  it('preserves an edited schedule source id that no longer resolves to a listed source', async () => {
    const orphaned = {
      ...schedule,
      id: 'sc2',
      target_config: { pipeline_connection_id: 'p1', source_id: 's-gone', state_key: 'app.tfstate' },
    }
    mocked.listSchedules.mockResolvedValue([orphaned] as unknown as Awaited<ReturnType<typeof api.listSchedules>>)
    mocked.updateSchedule.mockResolvedValue(orphaned as unknown as Awaited<ReturnType<typeof api.updateSchedule>>)
    renderPage()
    await screen.findByText('nightly drift')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.edit') as string }))
    await screen.findByLabelText(new RegExp(`^${i18n.t('common.name')}`))
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') as string }))
    await waitFor(() =>
      expect(mocked.updateSchedule).toHaveBeenCalledWith(
        'sc2',
        expect.objectContaining({ target_config: expect.objectContaining({ source_id: 's-gone', state_key: 'app.tfstate' }) }),
      ),
    )
  })

  it('runs a schedule now', async () => {
    mocked.runSchedule.mockResolvedValue(schedule as Awaited<ReturnType<typeof api.runSchedule>>)
    renderPage()
    await screen.findByText('nightly drift')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.schedules.runNow') as string }))
    await waitFor(() => expect(mocked.runSchedule.mock.calls[0]?.[0]).toBe('sc1'))
  })

  it('toggles enablement from the switch', async () => {
    mocked.updateSchedule.mockResolvedValue(schedule as Awaited<ReturnType<typeof api.updateSchedule>>)
    renderPage()
    await screen.findByText('nightly drift')

    fireEvent.click(screen.getByRole('switch'))
    await waitFor(() =>
      expect(mocked.updateSchedule).toHaveBeenCalledWith('sc1', expect.objectContaining({ enabled: false })),
    )
  })

  it('deletes after confirmation', async () => {
    mocked.deleteSchedule.mockResolvedValue(undefined)
    renderPage()
    await screen.findByText('nightly drift')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.delete') as string }))
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'))
    await waitFor(() => expect(mocked.deleteSchedule.mock.calls[0]?.[0]).toBe('sc1'))
  })

  it('surfaces a save failure inside the dialog', async () => {
    mocked.createSchedule.mockRejectedValue({ response: { data: { error: 'invalid cron_expr' } } })
    renderPage()
    await screen.findByText('nightly drift')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.schedules.add') as string }))
    fireEvent.change(await screen.findByLabelText(new RegExp(`^${i18n.t('common.name')}`)), {
      target: { value: 'x' },
    })
    // A client-side invalid cron now disables Save with an inline error…
    fireEvent.change(screen.getByLabelText(new RegExp(`^${i18n.t('pages.schedules.cron')}`)), {
      target: { value: 'bogus' },
    })
    fireEvent.mouseDown(screen.getByLabelText(new RegExp(`^${i18n.t('pages.schedules.pipeline')}`)))
    fireEvent.click(await screen.findByRole('option', { name: /drift-ci/ }))
    expect(screen.getByText(i18n.t('pages.schedules.cronInvalid') as string)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: i18n.t('common.save') as string })).toBeDisabled()

    // …while a server-side rejection still surfaces inside the dialog.
    fireEvent.change(screen.getByLabelText(new RegExp(`^${i18n.t('pages.schedules.cron')}`)), {
      target: { value: '0 3 * * *' },
    })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') as string }))

    expect(await screen.findByText('invalid cron_expr')).toBeInTheDocument()
  })

  it('previews the next fire times for a valid cron', async () => {
    renderPage()
    await screen.findByText('nightly drift')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.schedules.add') as string }))
    fireEvent.change(await screen.findByLabelText(new RegExp(`^${i18n.t('pages.schedules.cron')}`)), {
      target: { value: '0 3 * * *' },
    })
    expect(screen.getByText(/Next: /)).toBeInTheDocument()
  })
})
