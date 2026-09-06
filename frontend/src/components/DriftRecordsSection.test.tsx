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
  truncated: false,
  omitted_entries: 0,
  omitted_attrs: 0,
  unparseable: false,
  unmasked: false,
  drift_added: 0,
  drift_changed: 0,
  drift_destroyed: 0,
  drift_summary: [],
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
    total: 2,
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
    expect(mocked.listDriftRecords).toHaveBeenCalledWith(
      expect.objectContaining({ statuses: ['open', 'acknowledged'] }),
    )
  })

  it('shows the all-clear state when nothing is drifted', async () => {
    mocked.listDriftRecords.mockResolvedValue({ records: [], counts: {}, total: 0 })
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

  it('shows both count triplets, distinctly labelled, in the table and the detail dialog', async () => {
    mocked.listDriftRecords.mockResolvedValue({
      records: [{ ...openRecord, drift_added: 5 }, ackedRecord],
      counts: { open: 1, acknowledged: 1 },
      total: 2,
    })
    renderSection()
    await screen.findByText(/estate \/ envs\/prod.tfstate/)
    expect(screen.getByText(i18n.t('pages.drift.unappliedColumn') as string)).toBeInTheDocument()
    expect(screen.getByText(i18n.t('pages.drift.infraColumn') as string)).toBeInTheDocument()
    // Both records share the same unapplied triplet (ackedRecord spreads
    // openRecord's added/changed/destroyed); only the first carries infra drift.
    expect(screen.getAllByText('1 / 2 / 1')).toHaveLength(2)
    expect(screen.getByText('5 / 0 / 0')).toBeInTheDocument()
    expect(screen.getByText('0 / 0 / 0')).toBeInTheDocument()

    fireEvent.click(screen.getByText(/estate \/ envs\/prod.tfstate/))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(new RegExp(`^${i18n.t('pages.drift.unappliedLabel')}:`))).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        new RegExp(
          `^${i18n.t('pages.drift.infraLabel')}: ${i18n.t('pages.drift.addedChangedDestroyed', { added: 5, changed: 0, destroyed: 0 })}$`,
        ),
      ),
    ).toBeInTheDocument()
  })

  it('flags an unparseable live record as not verified, in the table and in the detail dialog', async () => {
    mocked.listDriftRecords.mockResolvedValue({
      records: [{ ...openRecord, unparseable: true }, ackedRecord],
      counts: { open: 1, acknowledged: 1 },
      total: 2,
    })
    renderSection()
    await screen.findByText(/estate \/ envs\/prod.tfstate/)
    expect(screen.getByLabelText(i18n.t('pages.drift.completeness.unparseableHint') as string)).toBeInTheDocument()

    fireEvent.click(screen.getByText(/estate \/ envs\/prod.tfstate/))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(i18n.t('pages.drift.completeness.unparseable') as string)).toBeInTheDocument()
  })

  it('shows when a record was resolved', async () => {
    const resolvedRecord = { ...openRecord, status: 'resolved' as const, resolved_at: '2026-06-12T09:00:00Z' }
    mocked.listDriftRecords.mockResolvedValue({
      records: [resolvedRecord],
      counts: {},
      total: 1,
    })
    renderSection()
    fireEvent.click(await screen.findByText(/estate \/ envs\/prod.tfstate/))
    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByText(
        i18n.t('pages.drift.recordResolvedAt', { when: new Date(resolvedRecord.resolved_at!).toLocaleString() }) as string,
      ),
    ).toBeInTheDocument()
  })

  it('switching to All requests every status', async () => {
    renderSection()
    await screen.findByText(/estate \/ envs\/prod.tfstate/)
    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.drift.recordsAll') as string }))
    await waitFor(() =>
      expect(mocked.listDriftRecords).toHaveBeenLastCalledWith(expect.objectContaining({ statuses: undefined })),
    )
  })

  it('filters by severity and source', async () => {
    renderSection()
    await screen.findByText(/estate \/ envs\/prod.tfstate/)

    fireEvent.click(screen.getByRole('button', { name: /critical/i }))
    await waitFor(() =>
      expect(mocked.listDriftRecords).toHaveBeenLastCalledWith(expect.objectContaining({ severity: 'critical' })),
    )

    fireEvent.mouseDown(screen.getByLabelText(i18n.t('pages.drift.sourceFilter') as string))
    fireEvent.click(await screen.findByRole('option', { name: 'estate' }))
    await waitFor(() =>
      expect(mocked.listDriftRecords).toHaveBeenLastCalledWith(expect.objectContaining({ sourceId: 's1' })),
    )
  })

  it('paginates server-side', async () => {
    mocked.listDriftRecords.mockResolvedValue({
      records: [openRecord, ackedRecord],
      counts: { open: 1, acknowledged: 1 },
      total: 60,
    })
    renderSection()
    await screen.findByText(/estate \/ envs\/prod.tfstate/)

    fireEvent.click(screen.getByRole('button', { name: /next page/i }))
    await waitFor(() => expect(mocked.listDriftRecords).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })))
  })

  it('clears the bulk selection when the page or a filter changes (issue #187)', async () => {
    mocked.listDriftRecords.mockResolvedValue({
      records: [openRecord, ackedRecord],
      counts: { open: 1, acknowledged: 1 },
      total: 60,
    })
    renderSection()
    await screen.findByText(/estate \/ envs\/prod.tfstate/)

    // Select a row: the bulk bar reports 1 selected.
    fireEvent.click(screen.getAllByRole('checkbox')[1])
    expect(screen.getByText(i18n.t('pages.drift.selectedCount', { count: 1 }) as string)).toBeInTheDocument()

    // Changing page must clear the selection — a carried-over selection would
    // report "N selected" while bulk actions only touch the visible page.
    fireEvent.click(screen.getByRole('button', { name: /next page/i }))
    await waitFor(() =>
      expect(screen.queryByText(i18n.t('pages.drift.selectedCount', { count: 1 }) as string)).not.toBeInTheDocument(),
    )

    // Same for a severity filter change — await the refetched rows first, since
    // the page change swapped the query key and the table re-renders async.
    const checkboxes = await screen.findAllByRole('checkbox')
    fireEvent.click(checkboxes[1])
    expect(screen.getByText(i18n.t('pages.drift.selectedCount', { count: 1 }) as string)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Critical' }))
    await waitFor(() =>
      expect(screen.queryByText(i18n.t('pages.drift.selectedCount', { count: 1 }) as string)).not.toBeInTheDocument(),
    )
  })

  it('bulk-acknowledges the selected open records', async () => {
    mocked.acknowledgeDriftRecord.mockResolvedValue({ ...openRecord, status: 'acknowledged' })
    renderSection()
    await screen.findByText(/estate \/ envs\/prod.tfstate/)

    fireEvent.click(screen.getAllByRole('checkbox')[1]) // row 0 (index 0 is header select-all)
    expect(screen.getByText(i18n.t('pages.drift.selectedCount', { count: 1 }) as string)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.drift.acknowledgeSelected') as string }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('pages.drift.acknowledge') as string }))
    await waitFor(() => expect(mocked.acknowledgeDriftRecord).toHaveBeenCalledWith('r1', ''))
    expect(mocked.acknowledgeDriftRecord).toHaveBeenCalledTimes(1)
  })

  it('bulk-resolves the selected records and reports partial failure', async () => {
    mocked.resolveDriftRecord.mockResolvedValueOnce({ ...openRecord, status: 'resolved' })
    mocked.resolveDriftRecord.mockRejectedValueOnce({ response: { data: { error: 'already resolved' } } })
    renderSection()
    await screen.findByText(/estate \/ envs\/prod.tfstate/)

    const rowCheckboxes = screen.getAllByRole('checkbox').slice(1)
    fireEvent.click(rowCheckboxes[0])
    fireEvent.click(rowCheckboxes[1])

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.drift.resolveSelected') as string }))
    await waitFor(() => expect(mocked.resolveDriftRecord).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(i18n.t('pages.drift.bulkPartialFailure', { count: 1 }) as string)).toBeInTheDocument()
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
