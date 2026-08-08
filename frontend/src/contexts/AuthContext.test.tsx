import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import { api } from '../services/api'
import { USER_KEY } from '../utils/authStorage'

// Captures the handler the SessionExpiryBridge registers with the api module, so
// a test can invoke it as the 401 interceptor would.
const unauth = vi.hoisted(() => ({ handler: null as (() => void) | null }))

vi.mock('../services/api', () => ({
  api: {
    getCurrentUser: vi.fn(),
    devLogin: vi.fn(),
    ldapLogin: vi.fn(),
    refreshToken: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
  setUnauthorizedHandler: vi.fn((h: (() => void) | null) => {
    unauth.handler = h
  }),
}))

const mocked = vi.mocked(api)

const me = {
  user: { id: 'u1', email: 'a@b.c', name: 'Alice' },
  allowed_scopes: ['state:read'],
}

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>

async function renderAuth() {
  const utils = renderHook(() => useAuth(), { wrapper })
  await waitFor(() => expect(utils.result.current.isLoading).toBe(false))
  return utils
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AuthProvider', () => {
  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(/within an AuthProvider/)
  })

  it('resolves the session from /me on mount', async () => {
    mocked.getCurrentUser.mockResolvedValue(me as Awaited<ReturnType<typeof api.getCurrentUser>>)
    const { result } = await renderAuth()
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe('a@b.c')
    expect(result.current.allowedScopes).toEqual(['state:read'])
  })

  it('stays anonymous when /me fails', async () => {
    mocked.getCurrentUser.mockRejectedValue(new Error('401'))
    const { result } = await renderAuth()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.allowedScopes).toEqual([])
  })

  it('hasScope honours exact scopes and the admin wildcard', async () => {
    mocked.getCurrentUser.mockResolvedValue(me as Awaited<ReturnType<typeof api.getCurrentUser>>)
    const { result } = await renderAuth()
    expect(result.current.hasScope('state:read')).toBe(true)
    expect(result.current.hasScope('state:write')).toBe(false)

    mocked.getCurrentUser.mockResolvedValue({
      ...me,
      allowed_scopes: ['admin'],
    } as Awaited<ReturnType<typeof api.getCurrentUser>>)
    const admin = await renderAuth()
    expect(admin.result.current.hasScope('sources:manage')).toBe(true)
  })

  it('ends an already-expired session immediately rather than warning about it', async () => {
    // @sethbacon/terraform-suite-ui 0.8.1 changed this to fail closed: a session
    // already past its expiry when /me resolves is ENDED, not flagged with
    // sessionExpiresSoon. Warning about a session the client already knows is dead
    // leaves the UI rendered against it until the user acts on the warning, so the
    // assertion here is that authentication is gone -- sessionExpiresSoon staying
    // false is the point, not an omission.
    mocked.getCurrentUser.mockResolvedValue({
      ...me,
      session_expires_at: new Date(Date.now() - 1000).toISOString(),
    } as Awaited<ReturnType<typeof api.getCurrentUser>>)
    const { result } = await renderAuth()
    await waitFor(() => expect(result.current.isAuthenticated).toBe(false))
    expect(result.current.user).toBeNull()
    expect(result.current.allowedScopes).toEqual([])
    expect(result.current.sessionExpiresSoon).toBe(false)
  })

  it('devLogin sets the cookie then re-resolves the user', async () => {
    mocked.getCurrentUser.mockRejectedValueOnce(new Error('401'))
    mocked.devLogin.mockResolvedValue({ expires_in: 3600 })
    mocked.getCurrentUser.mockResolvedValue(me as Awaited<ReturnType<typeof api.getCurrentUser>>)

    const { result } = await renderAuth()
    expect(result.current.isAuthenticated).toBe(false)
    await act(() => result.current.devLogin())
    expect(mocked.devLogin).toHaveBeenCalled()
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('ldapLogin posts credentials then re-resolves the user', async () => {
    mocked.getCurrentUser.mockRejectedValueOnce(new Error('401'))
    mocked.ldapLogin.mockResolvedValue({ expires_in: 3600 })
    mocked.getCurrentUser.mockResolvedValue(me as Awaited<ReturnType<typeof api.getCurrentUser>>)

    const { result } = await renderAuth()
    await act(() => result.current.ldapLogin('alice', 'secret'))
    expect(mocked.ldapLogin).toHaveBeenCalledWith('alice', 'secret')
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('login delegates to the full-page OAuth redirect', async () => {
    mocked.getCurrentUser.mockRejectedValue(new Error('401'))
    const { result } = await renderAuth()
    act(() => result.current.login('saml'))
    expect(mocked.login).toHaveBeenCalledWith('saml')
  })

  it('logout clears local state and cached storage, then redirects', async () => {
    mocked.getCurrentUser.mockResolvedValue(me as Awaited<ReturnType<typeof api.getCurrentUser>>)
    localStorage.setItem(USER_KEY, 'cached')

    const { result } = await renderAuth()
    act(() => result.current.logout())

    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem(USER_KEY)).toBeNull()
    expect(mocked.logout).toHaveBeenCalled()
  })

  it('refreshSession failure signs the user out cleanly', async () => {
    mocked.getCurrentUser.mockResolvedValue(me as Awaited<ReturnType<typeof api.getCurrentUser>>)
    mocked.refreshToken.mockRejectedValue(new Error('expired'))

    const { result } = await renderAuth()
    await act(() => result.current.refreshSession())

    expect(result.current.isAuthenticated).toBe(false)
    expect(mocked.logout).toHaveBeenCalled()
  })

  it('refreshSession success keeps the session alive', async () => {
    mocked.getCurrentUser.mockResolvedValue(me as Awaited<ReturnType<typeof api.getCurrentUser>>)
    mocked.refreshToken.mockResolvedValue({ expires_in: 3600 })

    const { result } = await renderAuth()
    await act(() => result.current.refreshSession())

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.sessionExpiresSoon).toBe(false)
    expect(mocked.logout).not.toHaveBeenCalled()
  })

  it('a mid-session 401 while authenticated logs the user out', async () => {
    mocked.getCurrentUser.mockResolvedValue(me as Awaited<ReturnType<typeof api.getCurrentUser>>)
    const { result } = await renderAuth()
    expect(result.current.isAuthenticated).toBe(true)
    expect(unauth.handler).toBeTypeOf('function')

    // What the 401 interceptor does on an expired/revoked session mid-use.
    act(() => unauth.handler?.())
    expect(mocked.logout).toHaveBeenCalled()
  })

  it('a 401 while anonymous does not log out (no bootstrap loop)', async () => {
    mocked.getCurrentUser.mockRejectedValue(new Error('401'))
    const { result } = await renderAuth()
    expect(result.current.isAuthenticated).toBe(false)

    act(() => unauth.handler?.())
    expect(mocked.logout).not.toHaveBeenCalled()
  })
})
