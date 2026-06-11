import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './Layout'
import { AppThemeProvider } from '../contexts/ThemeContext'
import { HelpProvider } from '../contexts/HelpContext'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import i18n from '../i18n'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>()
  return { ...actual, api: { getVersion: vi.fn() } }
})
vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../contexts/AuthContext')>()
  return { ...actual, useAuth: vi.fn() }
})

const mockedUseAuth = vi.mocked(useAuth)
type AuthShape = ReturnType<typeof useAuth>

function authState(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'u1', email: 'alice@example.com', name: 'Alice' },
    isAuthenticated: true,
    isLoading: false,
    sessionExpiresSoon: false,
    hasScope: () => true,
    logout: vi.fn(),
    refreshSession: vi.fn(),
    ...overrides,
  } as unknown as AuthShape
}

function renderLayout() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AppThemeProvider>
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
      </AppThemeProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockedUseAuth.mockReturnValue(authState())
  vi.mocked(api).getVersion.mockResolvedValue({ name: 'tsm', version: '1.0.0', build_date: 'unknown' })
})

describe('Layout', () => {
  it('renders the shell with scope-filtered navigation and the outlet', async () => {
    renderLayout()
    expect(screen.getByText('home outlet')).toBeInTheDocument()
    const nav = screen.getAllByRole('navigation')[0]
    expect(within(nav).getByText(i18n.t('nav.sources') as string)).toBeInTheDocument()
    expect(within(nav).getByText(i18n.t('nav.admin.users') as string)).toBeInTheDocument()
  })

  it('hides nav items the user lacks scopes for', () => {
    mockedUseAuth.mockReturnValue(authState({ hasScope: (s: string) => s !== 'admin' }))
    renderLayout()
    const nav = screen.getAllByRole('navigation')[0]
    expect(within(nav).getByText(i18n.t('nav.sources') as string)).toBeInTheDocument()
    expect(within(nav).queryByText(i18n.t('nav.admin.users') as string)).not.toBeInTheDocument()
  })

  it('collapses and expands nav groups, persisting the preference', async () => {
    renderLayout()
    const nav = screen.getAllByRole('navigation')[0]
    const groupHeader = within(nav).getByText(i18n.t('nav.groups.identity') as string)

    // happy-dom can't compute Collapse visibility; assert the persisted state.
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
    fireEvent.click(within(nav).getByText(i18n.t('nav.sources') as string))
    expect(await screen.findByText('sources outlet')).toBeInTheDocument()
  })

  it('toggles the theme from the settings menu', async () => {
    renderLayout()
    fireEvent.click(screen.getByLabelText(i18n.t('settings.title') as string))
    fireEvent.click(await screen.findByText(i18n.t('settings.themeDark') as string))
    expect(localStorage.getItem('tsm-theme')).toBe('dark')
  })

  it('switches the locale from the settings menu', async () => {
    renderLayout()
    fireEvent.click(screen.getByLabelText(i18n.t('settings.title') as string))
    fireEvent.click(await screen.findByText('Deutsch'))
    await waitFor(() => expect(i18n.language).toBe('de'))
    await i18n.changeLanguage('en') // restore for the rest of the suite
  })

  it('opens context help and the about dialog from the support menu', async () => {
    renderLayout()
    fireEvent.click(screen.getByLabelText(i18n.t('support.title') as string))
    fireEvent.click(await screen.findByText(i18n.t('support.contextHelp') as string))
    expect(localStorage.getItem('tsm-help-panel-open')).toBe('true')

    fireEvent.click(screen.getByLabelText(i18n.t('support.title') as string))
    fireEvent.click(await screen.findByText(i18n.t('about.title') as string))
    expect(await screen.findByText(i18n.t('about.versionsHeading') as string)).toBeInTheDocument()
  })

  it('signs out from the account menu', async () => {
    const state = authState()
    mockedUseAuth.mockReturnValue(state)
    renderLayout()

    fireEvent.click(screen.getByLabelText(i18n.t('auth.account') as string))
    expect(await screen.findByText('alice@example.com')).toBeInTheDocument()
    fireEvent.click(screen.getByText(i18n.t('auth.signOut') as string))
    expect((state as unknown as { logout: ReturnType<typeof vi.fn> }).logout).toHaveBeenCalled()
  })

  it('opens the command palette from the top bar and navigates', async () => {
    renderLayout()
    fireEvent.click(screen.getByLabelText(i18n.t('commandPalette.openButton') as string))
    const palette = await screen.findByTestId('command-palette')

    const input = within(palette).getByTestId('command-palette-input')
    fireEvent.change(input, { target: { value: 'sources' } })
    fireEvent.click(await within(palette).findByText(i18n.t('nav.sources') as string))
    expect(await screen.findByText('sources outlet')).toBeInTheDocument()
  })
})
