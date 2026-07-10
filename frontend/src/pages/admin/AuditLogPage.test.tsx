import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AuditLogPage from './AuditLogPage'
import { api } from '../../services/api'
import i18n from '../../i18n'

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>()
  return { ...actual, api: { listAuditLogs: vi.fn(), exportAuditLogs: vi.fn() } }
})

const mocked = vi.mocked(api)

const logs = [
  {
    id: 'l1',
    user_id: 'u1',
    organization_id: null,
    action: 'state.edit',
    resource_type: 'state',
    resource_id: 's1',
    metadata: { key: 'app.tfstate' },
    ip_address: '127.0.0.1',
    created_at: '2026-06-11T08:00:00Z',
    user_email: 'alice@example.com',
    user_name: 'Alice',
  },
  {
    id: 'l2',
    user_id: 'u2',
    organization_id: null,
    action: 'source.create',
    resource_type: 'source',
    resource_id: 's2',
    metadata: null,
    ip_address: '127.0.0.2',
    created_at: '2026-06-11T09:00:00Z',
    user_email: 'bob@example.com',
    user_name: 'Bob',
  },
]

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AuditLogPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocked.listAuditLogs.mockResolvedValue({ logs, total: 2 } as Awaited<ReturnType<typeof api.listAuditLogs>>)
})

describe('AuditLogPage', () => {
  it('lists entries with actor and action', async () => {
    renderPage()
    expect(await screen.findByText('state.edit')).toBeInTheDocument()
    expect(screen.getByText(/alice@example.com/)).toBeInTheDocument()
    expect(mocked.listAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ page: 1, per_page: 25 }))
  })

  it('shows the empty state when no entries match', async () => {
    mocked.listAuditLogs.mockResolvedValue({ logs: [], total: 0 } as Awaited<ReturnType<typeof api.listAuditLogs>>)
    renderPage()
    expect(await screen.findByTestId('audit-log-empty-state')).toBeInTheDocument()
  })

  it('filters by resource type and debounced action text', async () => {
    renderPage()
    await screen.findByText('state.edit')

    fireEvent.mouseDown(screen.getByLabelText(new RegExp(i18n.t('admin.auditLog.labelResourceType') as string)))
    fireEvent.click(await screen.findByRole('option', { name: 'state' }))
    await waitFor(() =>
      expect(mocked.listAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ resource_type: 'state', page: 1 })),
    )

    fireEvent.change(screen.getByLabelText(new RegExp(i18n.t('admin.auditLog.labelAction') as string)), {
      target: { value: 'state.edit' },
    })
    // The text filter is debounced before it reaches the query.
    await waitFor(() =>
      expect(mocked.listAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ action: 'state.edit' })),
    )

    fireEvent.click(screen.getByRole('button', { name: i18n.t('admin.auditLog.reset') as string }))
    await waitFor(() =>
      expect(mocked.listAuditLogs).toHaveBeenLastCalledWith(expect.not.objectContaining({ resource_type: 'state' })),
    )
  })

  it('opens the detail dialog with metadata on row click', async () => {
    renderPage()
    fireEvent.click(await screen.findByText('state.edit'))
    expect(await screen.findByText(/app\.tfstate/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: i18n.t('admin.auditLog.close') as string }))
    await waitFor(() => expect(screen.queryByText(/app\.tfstate/)).not.toBeInTheDocument())
  })

  it('exports server-side with the active filters', async () => {
    const createObjectURL = vi.fn(() => 'blob:audit')
    const revokeObjectURL = vi.fn()
    // Subclass URL so it stays constructable: link.click() triggers happy-dom
    // navigation that calls `new URL` on a microtask, which a plain object stub
    // can't satisfy (leaks an unhandled TypeError under --coverage).
    vi.stubGlobal('URL', Object.assign(class extends URL { }, { createObjectURL, revokeObjectURL }))
    mocked.exportAuditLogs.mockResolvedValue(new Blob(['csv'], { type: 'text/csv' }))

    renderPage()
    await screen.findByText('state.edit')

    // Narrow by resource type so the export must carry the active filter.
    fireEvent.mouseDown(screen.getByLabelText(new RegExp(i18n.t('admin.auditLog.labelResourceType') as string)))
    fireEvent.click(await screen.findByRole('option', { name: 'state' }))

    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('admin.auditLog.export') as string, 'i') }))
    fireEvent.click(await screen.findByText(i18n.t('admin.auditLog.exportCsv') as string))
    await waitFor(() =>
      expect(mocked.exportAuditLogs).toHaveBeenCalledWith('csv', expect.objectContaining({ resource_type: 'state' })),
    )
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('admin.auditLog.export') as string, 'i') }))
    fireEvent.click(await screen.findByText(i18n.t('admin.auditLog.exportJson') as string))
    await waitFor(() => expect(mocked.exportAuditLogs).toHaveBeenCalledWith('json', expect.anything()))
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(2))
    expect(revokeObjectURL).toHaveBeenCalledTimes(2)
    vi.unstubAllGlobals()
  })

  it('paginates server-side', async () => {
    mocked.listAuditLogs.mockResolvedValue({ logs, total: 60 } as Awaited<ReturnType<typeof api.listAuditLogs>>)
    renderPage()
    await screen.findByText('state.edit')

    fireEvent.click(screen.getByRole('button', { name: /next page/i }))
    await waitFor(() =>
      expect(mocked.listAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })),
    )
  })

  it('falls back to the empty state when loading fails', async () => {
    // The page has no dedicated query-error banner; a failed load renders as
    // an empty table.
    mocked.listAuditLogs.mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByTestId('audit-log-empty-state')).toBeInTheDocument()
  })
})
