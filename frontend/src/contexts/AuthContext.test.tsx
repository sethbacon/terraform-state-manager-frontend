import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import { api } from '../services/api'
import { USER_KEY } from '../utils/authStorage'

// Captures the handler the SessionExpiryBridge registers with the api module, so
// a test can invoke it as the 401 interceptor would.
const unauth = vi.hoisted(() => ({ handler: null as (() => void) | null }))
// Hoisted for the same reason unauth is: vi.mock's factory runs before module
// scope, so a plain const would be in the temporal dead zone when it is read.
const acting = vi.hoisted(() => ({ value: null as string | null, calls: [] as (string | null)[] }))

vi.mock('../services/api', () => ({
  api: {
    getCurrentUser: vi.fn(),
    devLogin: vi.fn(),
    ldapLogin: vi.fn(),
    refreshToken: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    // Read by the platform-admin organization bridge. Present here because the
    // admin-wildcard case below is a session with the `admin` scope and no
    // memberships -- which is exactly the standing the bridge acts on -- so
    // omitting it would exercise the failure path while looking like the
    // ordinary one.
    listAdminOrganizations: vi.fn(),
  },
  setUnauthorizedHandler: vi.fn((h: (() => void) | null) => {
    unauth.handler = h
  }),
  setActingOrganization: vi.fn((organizationId: string | null) => {
    acting.value = organizationId
    acting.calls.push(organizationId)
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
  acting.value = null
  acting.calls.length = 0
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

  it('keeps a session whose server expiry is already past, treating it as clock skew', async () => {
    // @4cloudguru/cloud-suite-ui 0.11.1 (4cloudguru/cloud-suite-ui#178) changed this again, and
    // reversed the 0.8.1 behaviour this test used to pin. Failing closed here was a hard lockout:
    // the instant comes from the SERVER and was compared against the CLIENT's clock, so a browser
    // ahead of the server by more than the session's remaining lifetime ended the session on
    // EVERY /me. The user could never get past login, with nothing on screen to explain it.
    //
    // A 200 from /me is the server asserting the session is live, so it outranks our unsynchronised
    // clock; a genuinely expired session 401s and is failed closed by the error path instead. The
    // library now schedules nothing and warns. sessionExpiresSoon staying false is still the point
    // -- what changed is that authentication survives.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mocked.getCurrentUser.mockResolvedValue({
      ...me,
      session_expires_at: new Date(Date.now() - 1000).toISOString(),
    } as Awaited<ReturnType<typeof api.getCurrentUser>>)
    const { result } = await renderAuth()
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))
    expect(result.current.user).not.toBeNull()
    expect(result.current.sessionExpiresSoon).toBe(false)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('clock'))
    warn.mockRestore()
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

  // --- the acting-organization bridge ---------------------------------------

  // The api client must learn the organization from the PROVIDER, not from
  // storage. The provider re-derives the selection against the memberships the
  // server returned and discards one the user no longer holds; reading the raw
  // key in the api module would resend an organization already rejected, and
  // every write would be refused with no visible cause.
  it('pushes the resolved organization to the api client', async () => {
    mocked.getCurrentUser.mockResolvedValue({
      ...me,
      memberships: [{ organization_id: 'org-only', organization_name: 'Only' }],
    } as Awaited<ReturnType<typeof api.getCurrentUser>>)

    await renderAuth()
    await waitFor(() => expect(acting.value).toBe('org-only'))
  })

  // A caller who belongs to several and has not chosen has nothing to send, and
  // the backend refuses an unnamed write in exactly that case. Null must reach
  // the api client rather than leaving a previous value in place.
  it('pushes null when there are several organizations and no choice', async () => {
    mocked.getCurrentUser.mockResolvedValue({
      ...me,
      memberships: [
        { organization_id: 'a', organization_name: 'A' },
        { organization_id: 'b', organization_name: 'B' },
      ],
    } as Awaited<ReturnType<typeof api.getCurrentUser>>)

    await renderAuth()
    expect(acting.value).toBeNull()
  })

  // A stale organization outliving its session is the one value that must not be
  // inherited by whoever signs in next.
  it('clears the organization when the provider unmounts', async () => {
    mocked.getCurrentUser.mockResolvedValue({
      ...me,
      memberships: [{ organization_id: 'org-only', organization_name: 'Only' }],
    } as Awaited<ReturnType<typeof api.getCurrentUser>>)

    const { unmount } = await renderAuth()
    await waitFor(() => expect(acting.value).toBe('org-only'))

    unmount()
    expect(acting.value).toBeNull()
  })
})

// The remembered organization is wired through the app's own provider, so it is
// asserted here rather than in Layout.test.tsx — that harness renders the
// PACKAGE provider directly and would be testing the library, not this wiring.
describe('remembered organization', () => {
  const TWO = [
    { organization_id: 'aaaaaaaa-0000-4000-8000-000000000001', organization_name: 'Alpha' },
    { organization_id: 'bbbbbbbb-0000-4000-8000-000000000002', organization_name: 'Beta' },
  ]

  it('restores a remembered choice that still matches a membership', async () => {
    window.localStorage.setItem('tsm.organization', TWO[1].organization_id)
    mocked.getCurrentUser.mockResolvedValue({ ...me, memberships: TWO })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.currentOrganizationId).toBe(TWO[1].organization_id))
    // ...and it reaches the API client, which is what puts it on the wire.
    await waitFor(() => expect(acting.value).toBe(TWO[1].organization_id))
  })

  it('discards a remembered value that is not one of the memberships', async () => {
    // The stored value is a HINT, never an authority: it outlives the session
    // that wrote it and the user can edit it, so it selects a membership only
    // when the server just returned that membership.
    window.localStorage.setItem('tsm.organization', 'cccccccc-0000-4000-8000-000000000003')
    mocked.getCurrentUser.mockResolvedValue({ ...me, memberships: TWO })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))
    // Two memberships and no valid hint means no choice has been made, so
    // nothing is claimed on the wire and the backend will ask for one.
    expect(result.current.currentOrganizationId).toBeNull()
  })
})
