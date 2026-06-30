/**
 * Round 3 of secondary-path coverage: Escape-key dialog closes, pagination
 * handlers, and the keyboard shortcut for the command palette — the handlers
 * the primary suites bypass by clicking Cancel buttons.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from '../components/Layout'
import { AuthProvider, type AuthApi } from '@sethbacon/terraform-suite-ui'
import { AppThemeProvider } from '../contexts/ThemeContext'
import { HelpProvider, useHelp } from '../contexts/HelpContext'
import UsersPage from './admin/UsersPage'
import AuditLogPage from './admin/AuditLogPage'
import GroupMappingsPage from './admin/GroupMappingsPage'
import VersionLabPage from './VersionLabPage'
import SchedulesPage from './SchedulesPage'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { queryKeys } from '../services/queryKeys'
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

function renderWith(el: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{el}</QueryClientProvider>)
}

function escapeDialog(dialog: HTMLElement) {
  fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' })
}

// SuiteLayout reads the package's own useAuth, so the Layout render paths need a
// real package AuthProvider (the app-level useAuth mock does not reach it).
function layoutAuthApi(): AuthApi {
  return {
    getCurrentUser: vi.fn().mockResolvedValue({
      user: { id: 'u1', email: 'alice@example.com', name: 'Alice' },
      memberships: [],
      allowed_scopes: ['admin'],
    }),
    login: vi.fn(),
    devLogin: vi.fn().mockResolvedValue(undefined),
    ldapLogin: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    refreshToken: vi.fn().mockResolvedValue({ expires_in: 3600 }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockedUseAuth.mockReturnValue({
    user: { id: 'u1', email: 'alice@example.com', name: 'Alice' },
    isAuthenticated: true,
    isLoading: false,
    sessionExpiresSoon: false,
    hasScope: () => true,
    logout: vi.fn(),
    refreshSession: vi.fn(),
  } as unknown as AuthShape)
})

describe('Layout keyboard and dismiss paths', () => {
  function renderLayout() {
    mocked.getVersion.mockResolvedValue({
      name: 'tsm',
      version: '1.0.0',
      build_date: '2026-06-11T00:00:00Z',
    } as never)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
      <QueryClientProvider client={client}>
        <AppThemeProvider>
          <AuthProvider api={layoutAuthApi()}>
            <HelpProvider>
              <MemoryRouter initialEntries={['/']}>
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/" element={<div>home outlet</div>} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </HelpProvider>
          </AuthProvider>
        </AppThemeProvider>
      </QueryClientProvider>,
    )
  }

  it('opens the command palette with Ctrl+K and dismisses it with Escape', async () => {
    renderLayout()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const palette = await screen.findByTestId('command-palette')
    escapeDialog(palette)
    await waitFor(() => expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument())
  })

  it('dismisses the settings, support, and account menus with Escape', async () => {
    renderLayout()
    const labels = [
      i18n.t('settings.title') as string,
      i18n.t('support.title') as string,
      i18n.t('header.account', { defaultValue: 'Account' }) as string,
    ]
    for (const label of labels) {
      fireEvent.click(await screen.findByLabelText(label))
      const menu = await screen.findByRole('menu')
      escapeDialog(menu)
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    }
  })

  it('dismisses the about dialog with Escape', async () => {
    renderLayout()
    fireEvent.click(screen.getByLabelText(i18n.t('support.title') as string))
    fireEvent.click(await screen.findByText(i18n.t('about.title') as string))
    const dialog = await screen.findByRole('dialog')
    escapeDialog(dialog)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('falls back to defaults when the persisted nav-group state is corrupted', () => {
    localStorage.setItem('tsm-nav-groups-open', 'not-json{')
    renderLayout()
    // The JSON.parse in the openGroups initializer throws; the catch falls back
    // to defaults and the shell still renders.
    expect(screen.getByText('home outlet')).toBeInTheDocument()
  })

  it('renders the temporary drawer on mobile viewports', async () => {
    const original = window.matchMedia
    // Force the md-down breakpoint so Layout takes its mobile branch (AppBar menu
    // button + temporary Drawer).
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: !query.includes('min-width'), // mobile: useMediaQuery(up('md')) is false
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia
    try {
      renderLayout()
      // The mobile AppBar menu button toggles the temporary drawer.
      fireEvent.click(
        screen.getByLabelText(i18n.t('nav.toggle', { defaultValue: 'Toggle navigation' }) as string),
      )
      expect(
        await screen.findByRole('link', { name: i18n.t('nav.dashboard') as string }),
      ).toBeInTheDocument()
    } finally {
      window.matchMedia = original
    }
  })
})

describe('UsersPage pagination and erase confirm', () => {
  const users = Array.from({ length: 30 }, (_, i) => ({
    id: `u${i}`,
    email: `user${i}@example.com`,
    name: `User ${i}`,
    created_at: '2026-06-01T00:00:00Z',
    memberships: [],
  }))

  beforeEach(() => {
    mocked.listAdminUsers.mockResolvedValue({ users: users.slice(0, 25), total: 30 } as never)
    mocked.listAdminOrganizations.mockResolvedValue([] as never)
    mocked.listAdminRoles.mockResolvedValue([] as never)
    mocked.eraseAdminUser.mockResolvedValue({} as never)
  })

  it('pages forward and resizes the page', async () => {
    renderWith(<UsersPage />)
    await screen.findByText('user0@example.com')

    fireEvent.click(screen.getByLabelText(/go to next page/i))
    await waitFor(() => expect(mocked.listAdminUsers.mock.calls.length).toBeGreaterThan(1))

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /rows per page/i }))
    fireEvent.click(await screen.findByRole('option', { name: '50' }))
    await waitFor(() => expect(mocked.listAdminUsers.mock.calls.length).toBeGreaterThan(2))
  })

  it('erases a user after the typed email confirmation, and Escape dismisses', async () => {
    renderWith(<UsersPage />)
    await screen.findByText('user0@example.com')

    fireEvent.click(screen.getAllByLabelText(i18n.t('admin.users.ariaErase') as string)[0])
    let dialog = await screen.findByRole('dialog')
    escapeDialog(dialog)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    fireEvent.click(screen.getAllByLabelText(i18n.t('admin.users.ariaErase') as string)[0])
    dialog = await screen.findByRole('dialog')
    const confirmButton = within(dialog).getByRole('button', {
      name: i18n.t('admin.users.erase') as string,
    })
    // Guard branch: click while the typed text does not match.
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'nope' } })
    expect(confirmButton).toBeDisabled()
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: 'user0@example.com' },
    })
    fireEvent.click(confirmButton)
    await waitFor(() => expect(mocked.eraseAdminUser).toHaveBeenCalledWith('u0'))
  })
})

describe('VersionLabPage workflow dialog', () => {
  beforeEach(() => {
    mocked.listPipelines.mockResolvedValue([] as never)
    mocked.listHealthRuns.mockResolvedValue([] as never)
    mocked.getHealthWorkflow.mockResolvedValue('name: health\non: schedule' as never)
  })

  it('switches the workflow provider and dismisses with Escape', async () => {
    renderWith(<VersionLabPage />)
    await screen.findByText(i18n.t('pages.versionLab.noRuns') as string)

    fireEvent.click(screen.getByRole('button', { name: i18n.t('actions.workflowTemplate') as string }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText(/name: health/)

    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[0])
    fireEvent.click(await screen.findByRole('option', { name: /Azure DevOps/ }))
    await waitFor(() => expect(mocked.getHealthWorkflow).toHaveBeenCalledWith('azure_devops', 'default'))

    // Switch the template style to the suite variant.
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[1])
    fireEvent.click(await screen.findByRole('option', { name: i18n.t('common.templateSuite') as string }))
    await waitFor(() => expect(mocked.getHealthWorkflow).toHaveBeenCalledWith('azure_devops', 'suite'))

    escapeDialog(dialog)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('SchedulesPage switch and Escape dismiss', () => {
  it('toggles the enabled switch and dismisses the dialog with Escape', async () => {
    mocked.listSchedules.mockResolvedValue([] as never)
    mocked.listPipelines.mockResolvedValue([] as never)
    renderWith(<SchedulesPage />)
    await screen.findByText(i18n.t('pages.schedules.noSchedules') as string)

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.schedules.add') as string }))
    const dialog = await screen.findByRole('dialog')
    const toggle = within(dialog).getByRole('switch')
    expect(toggle).toBeChecked()
    fireEvent.click(toggle)
    expect(toggle).not.toBeChecked()

    escapeDialog(dialog)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('GroupMappingsPage mapping removal', () => {
  beforeEach(() => {
    mocked.getAdminOIDCConfig.mockResolvedValue({
      provider_type: 'oidc',
      issuer_url: 'https://idp',
      client_id: 'tsm',
      is_active: true,
      group_claim_name: 'groups',
      default_role: 'viewer',
      group_mappings: [{ group: 'platform', organization: 'default', role: 'editor' }],
    } as never)
    mocked.getIdentityGroupMappings.mockResolvedValue({} as never)
    mocked.listAdminOrganizations.mockResolvedValue([] as never)
    mocked.listAdminRoles.mockResolvedValue([] as never)
  })

  it('removes a mapping via the confirm dialog after an Escape dismissal', async () => {
    renderWith(<GroupMappingsPage />)
    await screen.findByText('platform')

    fireEvent.click(screen.getByLabelText(i18n.t('admin.oidcSettings.ariaDelete') as string))
    let dialog = await screen.findByRole('dialog')
    escapeDialog(dialog)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('platform')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(i18n.t('admin.oidcSettings.ariaDelete') as string))
    dialog = await screen.findByRole('dialog')
    fireEvent.click(
      within(dialog).getByRole('button', { name: i18n.t('admin.oidcSettings.remove') as string }),
    )
    await waitFor(() => expect(screen.queryByText('platform')).not.toBeInTheDocument())
  })
})

describe('AuditLogPage detail dialog and action filter', () => {
  it('opens a row detail dialog, dismisses with Escape, and filters by action', async () => {
    mocked.listAuditLogs.mockResolvedValue({
      logs: [
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
      ],
      total: 1,
    } as never)
    renderWith(<AuditLogPage />)

    fireEvent.click(await screen.findByText('state.edit'))
    const dialog = await screen.findByRole('dialog')
    escapeDialog(dialog)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const action = screen.getByLabelText(new RegExp(`^${i18n.t('admin.auditLog.labelAction')}`))
    fireEvent.change(action, { target: { value: 'state.' } })
    expect((action as HTMLInputElement).value).toBe('state.')
  })
})

describe('queryKeys factories', () => {
  it('builds stable admin and source keys', () => {
    expect(queryKeys.admin.ciTemplate('ci1')).toEqual(['admin', 'ci-templates', 'ci1'])
    expect(queryKeys.sources.analysis('s1', 'k1')).toEqual(['sources', 's1', 'analysis', 'k1'])
  })
})

describe('HelpContext storage fallback', () => {
  it('defaults to closed when reading persisted state throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    try {
      let open: boolean | undefined
      function Probe() {
        open = useHelp().helpOpen
        return null
      }
      render(
        <HelpProvider>
          <Probe />
        </HelpProvider>,
      )
      expect(open).toBe(false)
    } finally {
      spy.mockRestore()
    }
  })
})
