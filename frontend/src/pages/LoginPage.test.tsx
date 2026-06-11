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

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>home page</div>} />
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

  it('redirects authenticated users home', () => {
    mockedUseAuth.mockReturnValue(authState({ isAuthenticated: true }))
    renderLogin()
    expect(screen.getByText('home page')).toBeInTheDocument()
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

    const oidcBtn = await screen.findByRole('button', {
      name: i18n.t('pages.login.signInWith', { provider: 'Keycloak' }) as string,
    })
    fireEvent.click(oidcBtn)
    expect((state as unknown as { login: ReturnType<typeof vi.fn> }).login).toHaveBeenCalledWith('oidc')

    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('pages.login.signInWith', { provider: 'Okta' }) as string }),
    )
    expect((state as unknown as { login: ReturnType<typeof vi.fn> }).login).toHaveBeenCalledWith('saml:okta')
  })

  it('submits LDAP credentials and surfaces failures', async () => {
    const ldapLogin = vi.fn().mockRejectedValue(new Error('bad creds'))
    mockedUseAuth.mockReturnValue(authState({ ldapLogin }))
    mockedApi.getProviders.mockResolvedValue({
      providers: [{ type: 'ldap', name: 'Corporate LDAP' }],
      dev_mode: false,
    })
    renderLogin()

    const username = await screen.findByLabelText(new RegExp(i18n.t('pages.login.username') as string))
    fireEvent.change(username, { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText(new RegExp(i18n.t('pages.login.password') as string)), {
      target: { value: 'secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.login.signIn') as string }))

    await waitFor(() => expect(ldapLogin).toHaveBeenCalledWith('alice', 'secret'))
    expect(await screen.findByText(i18n.t('pages.login.ldapError') as string)).toBeInTheDocument()
  })

  it('explains when no providers are configured', async () => {
    mockedUseAuth.mockReturnValue(authState())
    renderLogin()
    expect(await screen.findByText(i18n.t('pages.login.noProviders') as string)).toBeInTheDocument()
  })

  it('offers the dev login in dev mode', async () => {
    const state = authState()
    mockedUseAuth.mockReturnValue(state)
    mockedApi.getProviders.mockResolvedValue({ providers: [], dev_mode: true })
    renderLogin()

    const devBtn = await screen.findByRole('button', { name: i18n.t('pages.login.devLogin') as string })
    fireEvent.click(devBtn)
    await waitFor(() =>
      expect((state as unknown as { devLogin: ReturnType<typeof vi.fn> }).devLogin).toHaveBeenCalled(),
    )
  })
})
