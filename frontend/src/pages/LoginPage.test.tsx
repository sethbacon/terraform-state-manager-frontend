import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LoginPage from './LoginPage'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import i18n from '../i18n'

vi.mock('../services/api', () => ({
  api: { getProviders: vi.fn() },
}))
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockedApi = vi.mocked(api)
const mockedUseAuth = vi.mocked(useAuth)
type AuthShape = ReturnType<typeof useAuth>

function authState(overrides: Record<string, unknown> = {}) {
  return {
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    devLogin: vi.fn().mockResolvedValue(undefined),
    ldapLogin: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as AuthShape
}

// Typed access to a mocked auth method without sprinkling casts through the tests.
function authFn(state: AuthShape, key: 'login' | 'devLogin' | 'ldapLogin') {
  return (state as unknown as Record<string, ReturnType<typeof vi.fn>>)[key]
}

const label = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts) as string

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>home page</div>} />
        <Route path="/admin" element={<div>dashboard page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedApi.getProviders.mockResolvedValue({ providers: [], dev_mode: false })
})

describe('LoginPage', () => {
  it('shows a spinner while the session resolves', () => {
    mockedUseAuth.mockReturnValue(authState({ isLoading: true }))
    renderLogin()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('redirects authenticated users to the dashboard', () => {
    mockedUseAuth.mockReturnValue(authState({ isAuthenticated: true }))
    renderLogin()
    expect(screen.getByText('dashboard page')).toBeInTheDocument()
  })

  it('shows a skeleton while providers load', () => {
    mockedUseAuth.mockReturnValue(authState())
    mockedApi.getProviders.mockReturnValue(new Promise(() => {})) // never resolves
    renderLogin()
    expect(screen.getByTestId('provider-loading')).toBeInTheDocument()
  })

  it('renders an SSO button per provider and starts the right flow', async () => {
    const state = authState()
    mockedUseAuth.mockReturnValue(state)
    mockedApi.getProviders.mockResolvedValue({
      providers: [
        { type: 'oidc', name: 'Keycloak' },
        { type: 'saml', name: 'Okta', id: 'okta' },
      ],
      dev_mode: false,
    })
    renderLogin()

    // OIDC renders as the generic "Sign in with SSO" label, not the provider name.
    const oidcBtn = await screen.findByRole('button', { name: label('pages.login.signInWithSSO') })
    fireEvent.click(oidcBtn)
    expect(authFn(state, 'login')).toHaveBeenCalledWith('oidc')

    // SAML keeps the provider name and targets the IdP by id.
    fireEvent.click(screen.getByRole('button', { name: label('pages.login.signInWith', { provider: 'Okta' }) }))
    expect(authFn(state, 'login')).toHaveBeenCalledWith('saml:okta')
  })

  it('labels Azure AD distinctly and shows an OR divider between providers', async () => {
    const state = authState()
    mockedUseAuth.mockReturnValue(state)
    mockedApi.getProviders.mockResolvedValue({
      providers: [
        { type: 'oidc', name: 'Keycloak' },
        { type: 'azuread', name: 'Microsoft' },
      ],
      dev_mode: false,
    })
    renderLogin()

    const azureBtn = await screen.findByRole('button', { name: label('pages.login.signInWithAzureAD') })
    expect(screen.getByRole('button', { name: label('pages.login.signInWithSSO') })).toBeInTheDocument()
    expect(screen.getByText(label('pages.login.or'))).toBeInTheDocument()

    fireEvent.click(azureBtn)
    expect(authFn(state, 'login')).toHaveBeenCalledWith('azuread')
  })

  it('submits LDAP credentials and surfaces failures', async () => {
    const ldapLogin = vi.fn().mockRejectedValue(new Error('bad creds'))
    mockedUseAuth.mockReturnValue(authState({ ldapLogin }))
    mockedApi.getProviders.mockResolvedValue({
      providers: [{ type: 'ldap', name: 'Corporate LDAP' }],
      dev_mode: false,
    })
    renderLogin()

    const username = await screen.findByLabelText(new RegExp(label('pages.login.username')))
    fireEvent.change(username, { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText(new RegExp(label('pages.login.password'))), {
      target: { value: 'secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: label('pages.login.signIn') }))

    await waitFor(() => expect(ldapLogin).toHaveBeenCalledWith('alice', 'secret'))
    expect(await screen.findByText(label('pages.login.ldapError'))).toBeInTheDocument()
  })

  it('shows an LDAP divider and form alongside SSO', async () => {
    mockedUseAuth.mockReturnValue(authState())
    mockedApi.getProviders.mockResolvedValue({
      providers: [
        { type: 'oidc', name: 'Keycloak' },
        { type: 'ldap', name: 'Corporate LDAP' },
      ],
      dev_mode: false,
    })
    renderLogin()

    expect(await screen.findByRole('button', { name: label('pages.login.signInWithSSO') })).toBeInTheDocument()
    expect(screen.getByText(label('pages.login.orSignInWithLdap'))).toBeInTheDocument()
    expect(screen.getByLabelText(new RegExp(label('pages.login.username')))).toBeInTheDocument()
  })

  it('explains when no providers are configured', async () => {
    mockedUseAuth.mockReturnValue(authState())
    renderLogin()
    const alert = await screen.findByTestId('no-providers-alert')
    expect(alert).toHaveTextContent(label('pages.login.noProviders'))
  })

  it('shows the single sign-on info footer', async () => {
    mockedUseAuth.mockReturnValue(authState())
    renderLogin()
    expect(await screen.findByText(/single sign-on for authentication/i)).toBeInTheDocument()
  })

  it('offers the dev login in dev mode and shows the production-auth divider with providers', async () => {
    const state = authState()
    mockedUseAuth.mockReturnValue(state)
    mockedApi.getProviders.mockResolvedValue({
      providers: [{ type: 'oidc', name: 'Keycloak' }],
      dev_mode: true,
    })
    renderLogin()

    const devBtn = await screen.findByRole('button', { name: label('pages.login.devLogin') })
    expect(screen.getByText(label('pages.login.orUseProductionAuth'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: label('pages.login.signInWithSSO') })).toBeInTheDocument()

    fireEvent.click(devBtn)
    await waitFor(() => expect(authFn(state, 'devLogin')).toHaveBeenCalled())
  })

  it('surfaces dev login failures', async () => {
    const devLogin = vi.fn().mockRejectedValue(new Error('boom'))
    mockedUseAuth.mockReturnValue(authState({ devLogin }))
    mockedApi.getProviders.mockResolvedValue({ providers: [], dev_mode: true })
    renderLogin()

    fireEvent.click(await screen.findByRole('button', { name: label('pages.login.devLogin') }))
    expect(await screen.findByText(label('pages.login.devLoginFailed'))).toBeInTheDocument()
  })
})
