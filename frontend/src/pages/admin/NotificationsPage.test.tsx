import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NotificationsPage from './NotificationsPage'
import { api } from '../../services/api'
import i18n from '../../i18n'

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>()
  return {
    ...actual,
    api: {
      listNotificationChannels: vi.fn(),
      createNotificationChannel: vi.fn(),
      updateNotificationChannel: vi.fn(),
      deleteNotificationChannel: vi.fn(),
      testNotificationChannel: vi.fn(),
    },
  }
})

const mocked = vi.mocked(api)

const channel = {
  id: 'n1',
  name: 'ops-webhook',
  type: 'webhook',
  has_target: true,
  events: ['drift_detected'],
  enabled: true,
  last_status: 'sent',
  last_error: null,
  last_sent_at: '2026-06-11T08:00:00Z',
  created_at: '2026-06-01',
  updated_at: '2026-06-10',
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <NotificationsPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocked.listNotificationChannels.mockResolvedValue([channel] as Awaited<ReturnType<typeof api.listNotificationChannels>>)
})

describe('NotificationsPage', () => {
  it('lists channels with event chips and delivery status', async () => {
    renderPage()
    expect(await screen.findByText('ops-webhook')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('pages.notifications.event.drift_detected') as string)).toBeInTheDocument()
    expect(screen.getByText('sent')).toBeInTheDocument()
  })

  it('renders the all-events chip for channels without an event filter', async () => {
    mocked.listNotificationChannels.mockResolvedValue([
      { ...channel, events: [] },
    ] as Awaited<ReturnType<typeof api.listNotificationChannels>>)
    renderPage()
    expect(await screen.findByText(i18n.t('pages.notifications.allEvents') as string)).toBeInTheDocument()
  })

  it('shows the empty hint when no channels exist', async () => {
    mocked.listNotificationChannels.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(i18n.t('pages.notifications.noChannels') as string)).toBeInTheDocument()
  })

  it('creates a channel with type, target, and selected events', async () => {
    mocked.createNotificationChannel.mockResolvedValue(channel as Awaited<ReturnType<typeof api.createNotificationChannel>>)
    renderPage()
    await screen.findByText('ops-webhook')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.notifications.add') as string }))
    fireEvent.change(await screen.findByLabelText(new RegExp(`^${i18n.t('common.name')}`)), {
      target: { value: 'sec-slack' },
    })
    fireEvent.mouseDown(screen.getByLabelText(new RegExp(`^${i18n.t('common.type')}`)))
    fireEvent.click(await screen.findByRole('option', { name: i18n.t('pages.notifications.typeSlack') as string }))
    fireEvent.change(screen.getByLabelText(new RegExp(`^${i18n.t('pages.notifications.target')}`)), {
      target: { value: 'https://hooks.slack.com/services/x' },
    })
    fireEvent.click(screen.getByLabelText(i18n.t('pages.notifications.event.run_failed') as string))

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') as string }))
    await waitFor(() =>
      expect(mocked.createNotificationChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'sec-slack',
          type: 'slack',
          target: 'https://hooks.slack.com/services/x',
          events: expect.arrayContaining(['run_failed']),
        }),
      ),
    )
  })

  it('creates a Microsoft Teams channel with a webhook URL', async () => {
    mocked.createNotificationChannel.mockResolvedValue(channel as Awaited<ReturnType<typeof api.createNotificationChannel>>)
    renderPage()
    await screen.findByText('ops-webhook')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.notifications.add') as string }))
    fireEvent.change(await screen.findByLabelText(new RegExp(`^${i18n.t('common.name')}`)), {
      target: { value: 'ops-teams' },
    })
    fireEvent.mouseDown(screen.getByLabelText(new RegExp(`^${i18n.t('common.type')}`)))
    fireEvent.click(await screen.findByRole('option', { name: i18n.t('pages.notifications.typeTeams') as string }))
    fireEvent.change(screen.getByLabelText(new RegExp(`^${i18n.t('pages.notifications.target')}`)), {
      target: { value: 'https://example.webhook.office.com/webhookb2/x' },
    })

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') as string }))
    await waitFor(() =>
      expect(mocked.createNotificationChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ops-teams',
          type: 'teams',
          target: 'https://example.webhook.office.com/webhookb2/x',
        }),
      ),
    )
  })

  it('edits keeping the existing secret when the target is left blank', async () => {
    mocked.updateNotificationChannel.mockResolvedValue(channel as Awaited<ReturnType<typeof api.updateNotificationChannel>>)
    renderPage()
    await screen.findByText('ops-webhook')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.edit') as string }))
    expect(await screen.findByText(i18n.t('pages.notifications.targetKeep') as string)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') as string }))
    await waitFor(() =>
      expect(mocked.updateNotificationChannel).toHaveBeenCalledWith(
        'n1',
        expect.objectContaining({ name: 'ops-webhook' }),
      ),
    )
  })

  it('sends a test notification and reports the outcome', async () => {
    mocked.testNotificationChannel.mockResolvedValue({ status: 'sent' })
    renderPage()
    await screen.findByText('ops-webhook')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.notifications.test') as string }))
    expect(await screen.findByText(i18n.t('pages.notifications.testSent') as string)).toBeInTheDocument()
  })

  it('deletes after confirmation', async () => {
    mocked.deleteNotificationChannel.mockResolvedValue(undefined)
    renderPage()
    await screen.findByText('ops-webhook')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.delete') as string }))
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'))
    await waitFor(() => expect(mocked.deleteNotificationChannel.mock.calls[0]?.[0]).toBe('n1'))
  })

  it('toggles enablement from the switch', async () => {
    mocked.updateNotificationChannel.mockResolvedValue(channel as Awaited<ReturnType<typeof api.updateNotificationChannel>>)
    renderPage()
    await screen.findByText('ops-webhook')

    fireEvent.click(screen.getByRole('switch'))
    await waitFor(() =>
      expect(mocked.updateNotificationChannel).toHaveBeenCalledWith('n1', expect.objectContaining({ enabled: false })),
    )
  })
})
