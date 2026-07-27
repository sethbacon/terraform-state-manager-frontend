/**
 * App router smoke tests: every lazy route resolves to its real page (all of
 * them already have dedicated suites), the unauthenticated shell redirects to
 * the login page, and unknown paths land on the not-found placeholder.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { useAuth } from './contexts/AuthContext'
import { api } from './services/api'
import i18n from './i18n'

vi.mock('./services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./services/api')>()
  const fns: Record<string, ReturnType<typeof vi.fn>> = {}
  // Pending promises keep every page in its loading state, where the page
  // header is already rendered — no per-page fixtures needed.
  for (const k of Object.keys(actual.api)) fns[k] = vi.fn(() => new Promise(() => { }))
  return { ...actual, api: fns }
})
vi.mock('./contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./contexts/AuthContext')>()
  const { AuthProvider: SuiteAuthProvider } = await import('@sethbacon/terraform-suite-ui')
  // SuiteLayout reads the package's own auth context, so back the provider with a
  // real package AuthProvider that resolves an authenticated admin. The app-level
  // useAuth (used by ProtectedRoute) stays mocked below.
  const authApi = {
    getCurrentUser: () =>
      Promise.resolve({
        user: { id: 'u1', email: 'alice@example.com', name: 'Alice' },
        memberships: [],
        allowed_scopes: ['admin'],
      }),
    login: () => { },
    devLogin: () => Promise.resolve(),
    ldapLogin: () => Promise.resolve(),
    logout: () => { },
    refreshToken: () => Promise.resolve({ expires_in: 3600 }),
  }
  return {
    ...actual,
    AuthProvider: ({ children }: { children: React.ReactNode }) => (
      <SuiteAuthProvider api={authApi}>{children}</SuiteAuthProvider>
    ),
    useAuth: vi.fn(),
  }
})
vi.mock('swagger-ui-react', () => ({ default: () => <div data-testid="swagger-ui" /> }))
vi.mock('swagger-ui-react/swagger-ui.css', () => ({}))

import App from './App'

const mockedUseAuth = vi.mocked(useAuth)
type AuthShape = ReturnType<typeof useAuth>

function authState(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'u1', email: 'alice@example.com', name: 'Alice' },
    allowedScopes: ['admin'],
    isAuthenticated: true,
    isLoading: false,
    sessionExpiresSoon: false,
    hasScope: () => true,
    login: vi.fn(),
    devLogin: vi.fn(),
    ldapLogin: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
    ...overrides,
  } as unknown as AuthShape
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockedUseAuth.mockReturnValue(authState())
  // A few pages render a full-page spinner with no header until their first
  // query resolves — give those resolved (empty) data.
  const m = vi.mocked(api)
  m.listSources.mockResolvedValue([] as never)
  m.listAdminRoles.mockResolvedValue([] as never)
  m.listAdminOrganizations.mockResolvedValue([] as never)
  m.getIdentityGroupMappings.mockResolvedValue({} as never)
  m.getAdminOIDCConfig.mockResolvedValue({
    provider_type: 'oidc',
    issuer_url: 'https://idp',
    client_id: 'tsm',
    is_active: true,
    group_claim_name: 'groups',
    default_role: 'viewer',
    group_mappings: [],
  } as never)
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() { }
      disconnect() { }
      unobserve() { }
    },
  )
})

const routes: Array<[path: string, textKey: string]> = [
  ['/', 'landing.heroTitle'],
  ['/sources', 'nav.sources'],
  ['/drift', 'nav.drift'],
  ['/version-lab', 'nav.versionLab'],
  ['/schedules', 'pages.schedules.title'],
  ['/reports', 'nav.reports'],
  ['/transfer', 'nav.transfer'],
  ['/api-docs', 'nav.apiDocs'],
  ['/admin', 'nav.admin.dashboard'],
  ['/admin/users', 'admin.users.pageSubtitle'],
  ['/admin/organizations', 'admin.organizations.pageSubtitle'],
  ['/admin/roles', 'admin.roles.title'],
  ['/admin/oidc', 'admin.oidcSettings.pageSubtitle'],
  ['/admin/mtls', 'mtls.pageSubtitle'],
  ['/admin/sso', 'pages.sso.title'],
  ['/admin/notifications', 'pages.notifications.title'],
  ['/admin/audit-logs', 'admin.auditLog.pageSubtitle'],
]

describe('App routing', () => {
  it.each(routes)('serves %s', async (path, textKey) => {
    window.history.replaceState({}, '', path)
    render(<App />)
    // findAll: page headers often repeat the nav-drawer item text.
    const hits = await screen.findAllByText(i18n.t(textKey) as string, {}, { timeout: 5000 })
    expect(hits.length).toBeGreaterThan(0)
  })

  it('redirects unauthenticated visitors to the login page', async () => {
    mockedUseAuth.mockReturnValue(authState({ user: null, isAuthenticated: false }))
    window.history.replaceState({}, '', '/sources')
    render(<App />)
    expect(await screen.findByText(i18n.t('pages.login.subtitle') as string)).toBeInTheDocument()
  })

  it('serves the public landing at / for anonymous visitors', async () => {
    mockedUseAuth.mockReturnValue(authState({ user: null, isAuthenticated: false }))
    window.history.replaceState({}, '', '/')
    render(<App />)
    expect(await screen.findByText(i18n.t('landing.heroTitle') as string)).toBeInTheDocument()
  })

  it('renders the not-found placeholder for unknown paths', async () => {
    window.history.replaceState({}, '', '/totally/unknown')
    render(<App />)
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
  })

  it('navigates between pages via the layout nav (route-focus path)', async () => {
    window.history.replaceState({}, '', '/')
    render(<App />)
    await screen.findAllByText(i18n.t('nav.dashboard') as string)
    const nav = screen.getAllByRole('navigation')[0]
    fireEvent.click(within(nav).getByText(i18n.t('nav.sources') as string))
    expect(
      await screen.findByText(i18n.t('pages.sources.empty') as string, {}, { timeout: 5000 }),
    ).toBeInTheDocument()
  })

  it('shows the insufficient-scope message when a non-admin opens an admin route', async () => {
    // A signed-in user WITHOUT the admin scope: the route-level ProtectedRoute
    // guard renders the clean insufficient-scope message instead of mounting the
    // admin page shell (#230, #237).
    mockedUseAuth.mockReturnValue(
      authState({ allowedScopes: ['state:read'], hasScope: (s: string) => s !== 'admin' }),
    )
    window.history.replaceState({}, '', '/admin/users')
    render(<App />)
    expect(
      await screen.findByText(i18n.t('auth.insufficientTitle') as string, {}, { timeout: 5000 }),
    ).toBeInTheDocument()
    // The admin page's own data call must never fire when the scope gate blocks it.
    expect(vi.mocked(api).listAdminUsers).not.toHaveBeenCalled()
  })

  it('lets a scoped non-admin reach a route they hold the scope for', async () => {
    mockedUseAuth.mockReturnValue(
      authState({ allowedScopes: ['state:read'], hasScope: (s: string) => s === 'state:read' }),
    )
    window.history.replaceState({}, '', '/sources')
    render(<App />)
    expect(
      await screen.findByText(i18n.t('pages.sources.empty') as string, {}, { timeout: 5000 }),
    ).toBeInTheDocument()
  })
})
