import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { api } from '../services/api'
import { clearAuthStorage } from '../utils/authStorage'
import type { AuthContextType, MeResponse, RoleTemplateInfo, User } from '../types/auth'

/** How long before session expiry the warning Snackbar appears. */
export const SESSION_WARNING_LEAD_MS = 2 * 60 * 1000

// setTimeout delays beyond 2^31-1 ms overflow and fire immediately; skip
// scheduling for sessions that long (the warning is pointless weeks out anyway).
const MAX_TIMEOUT_MS = 2 ** 31 - 1

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

// hasScope mirrors the backend's check: the "admin" wildcard grants everything.
function scopeSatisfied(scopes: string[], scope: string): boolean {
  return scopes.includes('admin') || scopes.includes(scope)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [roleTemplate, setRoleTemplate] = useState<RoleTemplateInfo | null>(null)
  const [allowedScopes, setAllowedScopes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null)
  const [sessionExpiresSoon, setSessionExpiresSoon] = useState(false)
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Arm the expiry-warning timer to fire SESSION_WARNING_LEAD_MS before the
  // session lapses. The expiry comes from /me (session_expires_at) or from a
  // refresh response (expires_in) — the cookie itself is HttpOnly and unreadable.
  const scheduleSessionWarning = useCallback((expiresAt: Date) => {
    if (warnTimer.current) clearTimeout(warnTimer.current)
    setSessionExpiresAt(expiresAt)
    setSessionExpiresSoon(false)
    const delay = expiresAt.getTime() - Date.now() - SESSION_WARNING_LEAD_MS
    if (delay > MAX_TIMEOUT_MS) return
    if (delay <= 0) {
      setSessionExpiresSoon(true)
      return
    }
    warnTimer.current = setTimeout(() => setSessionExpiresSoon(true), delay)
  }, [])

  useEffect(
    () => () => {
      if (warnTimer.current) clearTimeout(warnTimer.current)
    },
    [],
  )

  const applyMe = useCallback(
    (me: MeResponse) => {
      setUser(me.user)
      setAllowedScopes(me.allowed_scopes ?? [])
      // Surface the primary org's role template so the context shape matches the
      // registry frontend. The TSM /me payload carries it on the membership.
      const primary = me.memberships?.find((m) => m.role_template_name)
      setRoleTemplate(
        primary?.role_template_name
          ? {
            name: primary.role_template_name,
            display_name: primary.role_template_name,
            scopes: primary.role_template_scopes,
          }
          : null,
      )
      if (me.session_expires_at) scheduleSessionWarning(new Date(me.session_expires_at))
    },
    [scheduleSessionWarning],
  )

  const loadUser = useCallback(async () => {
    try {
      applyMe(await api.getCurrentUser())
    } catch {
      setUser(null)
      setRoleTemplate(null)
      setAllowedScopes([])
      setSessionExpiresAt(null)
    }
  }, [applyMe])

  // On mount, resolve the session from the HttpOnly auth cookie via /me.
  useEffect(() => {
    loadUser().finally(() => setIsLoading(false))
  }, [loadUser])

  const login = useCallback((provider = 'oidc') => {
    api.login(provider)
  }, [])

  const devLogin = useCallback(async () => {
    // The dev login sets the HttpOnly session cookie; resolve the user from it.
    await api.devLogin()
    await loadUser()
  }, [loadUser])

  const ldapLogin = useCallback(
    async (username: string, password: string) => {
      // Like devLogin, the LDAP login sets the cookie; resolve the user from it.
      await api.ldapLogin(username, password)
      await loadUser()
    },
    [loadUser],
  )

  const logout = useCallback(() => {
    if (warnTimer.current) clearTimeout(warnTimer.current)
    setSessionExpiresSoon(false)
    setSessionExpiresAt(null)
    setUser(null)
    setRoleTemplate(null)
    setAllowedScopes([])
    clearAuthStorage()
    api.logout()
  }, [])

  // Rotate the session cookie before it lapses. On success the backend re-sets
  // the HttpOnly cookie and returns the new TTL; on failure the session is
  // unrecoverable, so sign out cleanly rather than letting requests start 401ing.
  const refreshSession = useCallback(async () => {
    try {
      const { expires_in } = await api.refreshToken()
      scheduleSessionWarning(new Date(Date.now() + expires_in * 1000))
    } catch {
      logout()
    }
  }, [scheduleSessionWarning, logout])

  const hasScope = useCallback((scope: string) => scopeSatisfied(allowedScopes, scope), [allowedScopes])

  const value: AuthContextType = {
    user,
    roleTemplate,
    allowedScopes,
    isAuthenticated: user !== null,
    isLoading,
    sessionExpiresAt,
    sessionExpiresSoon,
    login,
    devLogin,
    ldapLogin,
    logout,
    refreshSession,
    hasScope,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
