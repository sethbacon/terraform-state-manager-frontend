import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, type AuthApi } from '@4cloudguru/cloud-suite-ui'
import Layout from './Layout'
import { AppThemeProvider } from '../contexts/ThemeContext'
import { HelpProvider } from '../contexts/HelpContext'
import i18n from '../i18n'

// Only `getVersion` is needed by the rendered tree (the About dialog); auth is
// driven through the package AuthProvider below, not the app's services/api.
vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>()
  return {
    ...actual,
    api: {
      getVersion: vi
        .fn()
        .mockResolvedValue({ name: 'tsm', version: '1.0.0', build_date: 'unknown' }),
    },
  }
})

const tt = (key: string) => i18n.t(key) as string
const accountLabel = i18n.t('header.account', { defaultValue: 'Account' }) as string

// SuiteLayout consumes the package's own useAuth, so drive auth state through a
// real package AuthProvider with a mock backend contract.
function makeAuthApi(
  scopes: string[] = ['admin'],
  memberships: Array<{ organization_id: string; organization_name: string }> = [],
): AuthApi {
  return {
    getCurrentUser: vi.fn().mockResolvedValue({
      user: { id: 'u1', email: 'alice@example.com', name: 'Alice' },
      memberships,
      allowed_scopes: scopes,
    }),
    login: vi.fn(),
    devLogin: vi.fn().mockResolvedValue(undefined),
    ldapLogin: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    refreshToken: vi.fn().mockResolvedValue({ expires_in: 3600 }),
  }
}

function renderLayout(authApi: AuthApi = makeAuthApi()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <AppThemeProvider>
        <AuthProvider api={authApi}>
          <HelpProvider>
            <MemoryRouter initialEntries={['/']}>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<div>home outlet</div>} />
                  <Route path="/sources" element={<div>sources outlet</div>} />
                </Route>
              </Routes>
            </MemoryRouter>
          </HelpProvider>
        </AuthProvider>
      </AppThemeProvider>
    </QueryClientProvider>,
  )
  return authApi
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  void i18n.changeLanguage('en')
  // Desktop layout so the permanent drawer (and its nav) is rendered: SuiteLayout
  // keys off useMediaQuery(up('md')), which uses a min-width media query.
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('min-width'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

describe('Layout', () => {
  it('renders the shell with scope-filtered navigation and the outlet', async () => {
    renderLayout(makeAuthApi(['admin']))
    expect(screen.getByText('home outlet')).toBeInTheDocument()
    const nav = screen.getAllByRole('navigation')[0]
    expect(await within(nav).findByText(tt('nav.sources'))).toBeInTheDocument()
    expect(within(nav).getByText(tt('nav.admin.users'))).toBeInTheDocument()
  })

  it('hides nav items the user lacks scopes for', async () => {
    renderLayout(makeAuthApi(['state:read']))
    const nav = screen.getAllByRole('navigation')[0]
    // state:read grants Sources; admin pages stay hidden.
    expect(await within(nav).findByText(tt('nav.sources'))).toBeInTheDocument()
    await waitFor(() =>
      expect(within(nav).queryByText(tt('nav.admin.users'))).not.toBeInTheDocument(),
    )
  })

  it('collapses and expands nav groups, persisting the preference', async () => {
    renderLayout()
    const nav = screen.getAllByRole('navigation')[0]
    const groupHeader = await within(nav).findByText(tt('nav.groups.identity'))

    fireEvent.click(groupHeader)
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('tsm-nav-groups-open') ?? '{}').identity).toBe(false),
    )
    fireEvent.click(groupHeader)
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('tsm-nav-groups-open') ?? '{}').identity).toBe(true),
    )
  })

  it('navigates via nav links', async () => {
    renderLayout()
    const nav = screen.getAllByRole('navigation')[0]
    fireEvent.click(await within(nav).findByText(tt('nav.sources')))
    expect(await screen.findByText('sources outlet')).toBeInTheDocument()
  })

  it('toggles the theme from the settings menu', async () => {
    renderLayout()
    fireEvent.click(screen.getByLabelText(tt('settings.title')))
    // The theme toggle is the first item in the combined settings menu.
    const items = await screen.findAllByRole('menuitem')
    fireEvent.click(items[0])
    await waitFor(() => expect(localStorage.getItem('tsm-theme')).toBeTruthy())
  })

  it('switches the locale from the settings menu', async () => {
    renderLayout()
    fireEvent.click(screen.getByLabelText(tt('settings.title')))
    fireEvent.click(await screen.findByText('Deutsch'))
    await waitFor(() => expect(i18n.language).toBe('de'))
  })

  it('opens context help and the about dialog from the support menu', async () => {
    renderLayout()
    fireEvent.click(screen.getByLabelText(tt('support.title')))
    fireEvent.click(await screen.findByText(tt('support.contextHelp')))
    await waitFor(() => expect(localStorage.getItem('tsm-help-panel-open')).toBe('true'))

    fireEvent.click(screen.getByLabelText(tt('support.title')))
    fireEvent.click(await screen.findByText(tt('about.title')))
    expect(await screen.findByText(tt('about.versionsHeading'))).toBeInTheDocument()
  })

  it('signs out from the account menu', async () => {
    const authApi = renderLayout()
    fireEvent.click(await screen.findByLabelText(accountLabel))
    expect(await screen.findByText('Alice')).toBeInTheDocument()
    fireEvent.click(screen.getByText(tt('auth.signOut')))
    expect(authApi.logout).toHaveBeenCalled()
  })

  it('opens the command palette from the top bar and navigates', async () => {
    renderLayout()
    fireEvent.click(screen.getByLabelText(tt('commandPalette.openButton')))
    const palette = await screen.findByTestId('command-palette')

    const input = within(palette).getByTestId('command-palette-input')
    fireEvent.change(input, { target: { value: 'sources' } })
    fireEvent.click(await within(palette).findByText(tt('nav.sources')))
    expect(await screen.findByText('sources outlet')).toBeInTheDocument()
  })
})

// The organization picker is mounted in the app bar. These two tests exist
// because the failure they guard is SILENT: with the picker absent, a caller who
// belongs to several organizations resolves to no acting organization, sends no
// X-Organization-Id header, and every stamped write is refused by the backend
// with "name the organization to act in" — which the client then has no way to
// comply with. Nothing throws, and a single-organization deployment looks fine.
describe('Layout organization picker', () => {
  const TWO = [
    { organization_id: 'aaaaaaaa-0000-4000-8000-000000000001', organization_name: 'Alpha' },
    { organization_id: 'bbbbbbbb-0000-4000-8000-000000000002', organization_name: 'Beta' },
  ]

  it('offers the picker to a caller who belongs to several organizations', async () => {
    renderLayout(makeAuthApi(['admin'], TWO))
    expect(
      await screen.findByLabelText(tt('organization.pickerTooltip')),
    ).toBeInTheDocument()
  })

  it('shows no picker to a caller who belongs to one organization', async () => {
    renderLayout(makeAuthApi(['admin'], [TWO[0]]))
    // Wait for the shell to settle so this is an assertion about the resolved
    // tree rather than about a render that has not happened yet.
    expect(await screen.findByText('home outlet')).toBeInTheDocument()
    expect(screen.queryByLabelText(tt('organization.pickerTooltip'))).toBeNull()
  })

})
