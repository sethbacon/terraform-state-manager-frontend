import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DriftRecordsSection from './DriftRecordsSection'
import { api, type DriftRecord } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import i18n from '../i18n'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>()
  return {
    ...actual,
    api: {
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

const openRecord: DriftRecord = {
  id: 'r1',
  source_id: 's1',
  state_key: 'envs/prod.tfstate',
  pipeline_connection_id: null,
  last_run_id: null,
  origin: 'ingest',
  severity: 'critical',
  added: 1,
  changed: 2,
  destroyed: 1,
  summary: [
    {
      address: 'aws_instance.web',
      actions: ['update'],
      attrs: [{ name: 'instance_type', before: 't2.micro', after: 't3.micro' }],
    },
  ],
  status: 'open',
  acknowledged_by: '',
  acknowledged_at: null,
  ack_note: '',
  resolved_at: null,
  detections: 3,
  first_detected_at: '2026-06-10T08:00:00Z',
  last_detected_at: '2026-06-11T08:00:00Z',
}

const ackedRecord: DriftRecord = {
  ...openRecord,
  id: 'r2',
  state_key: 'envs/dev.tfstate',
  severity: 'warning',
  status: 'acknowledged',
  acknowledged_by: 'alice',
  ack_note: 'cert rotation',
}

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <DriftRecordsSection sourceNames={{ s1: 'estate' }} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseAuth.mockReturnValue({ hasScope: () => true } as unknown as AuthShape)
  mocked.listDriftRecords.mockResolvedValue({
    records: [openRecord, ackedRecord],
    counts: { open: 1, acknowledged: 1 },
  })
})

describe('DriftRecordsSection', () => {
  it('lists records with status/severity chips, source names, and counts', async () => {
    renderSection()
    expect(await screen.findByText(/estate \/ envs\/prod.tfstate/)).toBeInTheDocument()
    expect(screen.getByText('critical')).toBeInTheDocument()
    expect(screen.getByText(`${i18n.t('pages.drift.recordOpen')}: 1`)).toBeInTheDocument()
    expect(screen.getByText(`${i18n.t('pages.drift.recordAcknowledged')}: 1`)).toBeInTheDocument()
    // Active view requests only open+acknowledged.
    expect(mocked.listDriftRecords).toHaveBeenCalledWith(['open', 'acknowledged'])
  })

  it('shows the all-clear state when nothing is drifted', async () => {
    mocked.listDriftRecords.mockResolvedValue({ records: [], counts: {} })
    renderSection()
    expect(await screen.findByText(i18n.t('pages.drift.noActiveRecords') as string)).toBeInTheDocument()
  })

  it('acknowledges an open record with a note', async () => {
    mocked.acknowledgeDriftRecord.mockResolvedValue({ ...openRecord, status: 'acknowledged' })
    renderSection()
    fireEvent.click((await screen.findAllByRole('button', { name: i18n.t('pages.drift.acknowledge') as string }))[0])
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(i18n.t('pages.drift.ackNoteLabel') as string), {
      target: { value: 'known cert rotation' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('pages.drift.acknowledge') as string }))
    await waitFor(() => expect(mocked.acknowledgeDriftRecord).toHaveBeenCalledWith('r1', 'known cert rotation'))
  })

  it('resolves a record from the row actions', async () => {
    mocked.resolveDriftRecord.mockResolvedValue({ ...openRecord, status: 'resolved' })
    renderSection()
    fireEvent.click((await screen.findAllByRole('button', { name: i18n.t('pages.drift.resolve') as string }))[0])
    await waitFor(() => expect(mocked.resolveDriftRecord).toHaveBeenCalledWith('r1'))
  })

  it('opens the detail dialog with the resource summary and ack note', async () => {
    renderSection()
    fireEvent.click(await screen.findByText(/estate \/ envs\/dev.tfstate/))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/alice/)).toBeInTheDocument()
    expect(within(dialog).getByText(/cert rotation/)).toBeInTheDocument()
    expect(within(dialog).getByText('aws_instance.web')).toBeInTheDocument()
    // per-resource changed attribute (name + before -> after)
    expect(within(dialog).getByText('instance_type')).toBeInTheDocument()
    expect(within(dialog).getByText(/t2\.micro → t3\.micro/)).toBeInTheDocument()
  })

  it('switching to All requests every status', async () => {
    renderSection()
    await screen.findByText(/estate \/ envs\/prod.tfstate/)
    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.drift.recordsAll') as string }))
    await waitFor(() => expect(mocked.listDriftRecords).toHaveBeenCalledWith(undefined))
  })

  it('surfaces and dismisses API errors from a failed resolve', async () => {
    mocked.resolveDriftRecord.mockRejectedValue({ response: { data: { error: 'drift record is already resolved' } } })
    renderSection()
    fireEvent.click((await screen.findAllByRole('button', { name: i18n.t('pages.drift.resolve') as string }))[0])
    const alert = await screen.findByText('drift record is already resolved')
    expect(alert).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Close'))
    await waitFor(() => expect(screen.queryByText('drift record is already resolved')).not.toBeInTheDocument())

    // Errors without a server message fall back to a generic one.
    mocked.acknowledgeDriftRecord.mockRejectedValue(new Error('network'))
    fireEvent.click((await screen.findAllByRole('button', { name: i18n.t('pages.drift.acknowledge') as string }))[0])
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('pages.drift.acknowledge') as string }))
    expect(await screen.findByText('Request failed.')).toBeInTheDocument()
  })

  it('hides acknowledge/resolve without the drift scope', async () => {
    mockedUseAuth.mockReturnValue({ hasScope: () => false } as unknown as AuthShape)
    renderSection()
    await screen.findByText(/estate \/ envs\/prod.tfstate/)
    expect(screen.queryByRole('button', { name: i18n.t('pages.drift.acknowledge') as string })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: i18n.t('pages.drift.resolve') as string })).not.toBeInTheDocument()
  })
})
