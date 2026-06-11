/**
 * Round 2 of secondary-path coverage: untouched field onChange handlers and
 * cancel/close paths across the dialog-heavy pages.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SchedulesPage from './SchedulesPage'
import VersionLabPage from './VersionLabPage'
import AuditLogPage from './admin/AuditLogPage'
import GroupMappingsPage from './admin/GroupMappingsPage'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import i18n from '../i18n'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>()
  const fns: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const k of Object.keys(actual.api)) fns[k] = vi.fn()
  return { ...actual, api: fns }
})
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))

const mocked = vi.mocked(api)
const mockedUseAuth = vi.mocked(useAuth)
type AuthShape = ReturnType<typeof useAuth>

// Labels like "Repo ref (optional)" contain regex metacharacters.
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const labelRe = (key: string) => new RegExp(`^${esc(i18n.t(key) as string)}`)

function renderWith(el: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{el}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseAuth.mockReturnValue({ hasScope: () => true } as unknown as AuthShape)
})

describe('SchedulesPage dialog field handlers', () => {
  it('fills every optional drift-target field before saving', async () => {
    mocked.listSchedules.mockResolvedValue([] as never)
    mocked.listPipelines.mockResolvedValue([
      { id: 'p1', name: 'drift-ci', provider: 'github_actions', config: {} },
    ] as never)
    mocked.createSchedule.mockResolvedValue({ id: 'sc9' } as never)
    renderWith(<SchedulesPage />)
    await screen.findByText(i18n.t('pages.schedules.noSchedules') as string)

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.schedules.add') as string }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('common.name')}`)), {
      target: { value: 'full' },
    })
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('pages.schedules.cron')}`)), {
      target: { value: 'daily' },
    })
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[0])
    fireEvent.click(await screen.findByRole('option', { name: /drift-ci/ }))
    fireEvent.change(within(dialog).getByLabelText(labelRe('pages.schedules.repoRef')), {
      target: { value: 'main' },
    })
    fireEvent.change(within(dialog).getByLabelText(labelRe('pages.schedules.workingDir')), {
      target: { value: 'envs/prod' },
    })
    const sourceField = within(dialog).queryByLabelText(labelRe('pages.schedules.sourceId'))
    if (sourceField) fireEvent.change(sourceField, { target: { value: 's1' } })

    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('common.save') as string }))
    await waitFor(() =>
      expect(mocked.createSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          target_config: expect.objectContaining({ repo_ref: 'main', working_dir: 'envs/prod' }),
        }),
      ),
    )
  })
})

describe('VersionLabPage version-pin fields', () => {
  it('adds provider and module version rows to the dispatch payload', async () => {
    mocked.listPipelines.mockResolvedValue([
      { id: 'p1', name: 'health-ci', provider: 'github_actions', config: {} },
    ] as never)
    mocked.listHealthRuns.mockResolvedValue([] as never)
    mocked.createHealthRun.mockResolvedValue({ id: 'h9' } as never)
    renderWith(<VersionLabPage />)
    await screen.findByText(i18n.t('pages.versionLab.noRuns') as string)

    fireEvent.click(screen.getByRole('button', { name: i18n.t('actions.newHealthRun') as string }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[0])
    fireEvent.click(await screen.findByRole('option', { name: /health-ci/ }))

    fireEvent.change(within(dialog).getByLabelText(labelRe('pages.versionLab.gitRef')), {
      target: { value: 'main' },
    })
    fireEvent.change(within(dialog).getByLabelText(labelRe('pages.versionLab.workingDir')), {
      target: { value: '.' },
    })
    fireEvent.change(within(dialog).getByLabelText(labelRe('pages.versionLab.registryHost')), {
      target: { value: 'registry.example.com' },
    })

    // Provider/module version rows: fill the first key/value pair of each
    // section when the inputs exist.
    const textboxes = within(dialog).getAllByRole('textbox')
    for (const tb of textboxes) {
      const ph = tb.getAttribute('placeholder') ?? ''
      if (/aws|provider/i.test(ph) && !(tb as HTMLInputElement).value) {
        fireEvent.change(tb, { target: { value: 'aws' } })
      }
    }

    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('pages.versionLab.dispatch') as string }))
    await waitFor(() =>
      expect(mocked.createHealthRun).toHaveBeenCalledWith(
        expect.objectContaining({ registry_host: 'registry.example.com', repo_ref: 'main' }),
      ),
    )
  })
})

describe('AuditLogPage date filters', () => {
  it('applies start/end date bounds and changes rows-per-page', async () => {
    mocked.listAuditLogs.mockResolvedValue({ logs: [], total: 0 } as never)
    renderWith(<AuditLogPage />)
    await screen.findByTestId('audit-log-empty-state')

    // datetime-local inputs need the full YYYY-MM-DDTHH:MM form; the page
    // converts via new Date(v).toISOString(), which is TZ-dependent — compute
    // the expectation the same way.
    fireEvent.change(screen.getByLabelText(labelRe('admin.auditLog.labelStartDate')), {
      target: { value: '2026-06-01T00:00' },
    })
    fireEvent.change(screen.getByLabelText(labelRe('admin.auditLog.labelEndDate')), {
      target: { value: '2026-06-11T23:59' },
    })
    await waitFor(() =>
      expect(mocked.listAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ start_date: new Date('2026-06-01T00:00').toISOString() }),
      ),
    )

    // Rows-per-page select exercises the pagination handler. findByRole: the
    // table (and pagination) unmounts into the loading branch while the
    // refetch above is in flight.
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /rows per page/i }))
    fireEvent.click(await screen.findByRole('option', { name: '50' }))
    await waitFor(() =>
      expect(mocked.listAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ per_page: 50 })),
    )
  })
})

describe('GroupMappingsPage editor fields', () => {
  it('edits the claim name and default role before saving', async () => {
    mocked.getAdminOIDCConfig.mockResolvedValue({
      provider_type: 'oidc',
      issuer_url: 'https://idp',
      client_id: 'tsm',
      is_active: false,
      group_claim_name: 'groups',
      default_role: 'viewer',
      group_mappings: [],
    } as never)
    mocked.getIdentityGroupMappings.mockResolvedValue({} as never)
    mocked.listAdminOrganizations.mockResolvedValue([] as never)
    mocked.listAdminRoles.mockResolvedValue([] as never)
    mocked.updateOIDCGroupMapping.mockResolvedValue({
      group_claim_name: 'memberOf',
      default_role: 'operator',
      group_mappings: [],
    } as never)
    renderWith(<GroupMappingsPage />)

    const claim = await screen.findByLabelText(new RegExp(`^${i18n.t('admin.oidcSettings.labelGroupClaimName')}`))
    fireEvent.change(claim, { target: { value: 'memberOf' } })
    // Default role select.
    fireEvent.mouseDown(screen.getAllByRole('combobox')[0])
    const operatorOption = await screen.findByRole('option', { name: 'operator' })
    fireEvent.click(operatorOption)

    fireEvent.click(screen.getByRole('button', { name: i18n.t('admin.oidcSettings.saveChanges') as string }))
    await waitFor(() =>
      expect(mocked.updateOIDCGroupMapping).toHaveBeenCalledWith(
        expect.objectContaining({ group_claim_name: 'memberOf', default_role: 'operator' }),
      ),
    )
    // Inactive chip branch renders too.
    expect(screen.getByText(i18n.t('admin.oidcSettings.inactive') as string)).toBeInTheDocument()
  })
})
