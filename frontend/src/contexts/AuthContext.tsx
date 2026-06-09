import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../services/api'
import { clearAuthStorage } from '../utils/authStorage'
import type { AuthContextType, MeResponse, User } from '../types/auth'

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
  const [allowedScopes, setAllowedScopes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const applyMe = useCallback((me: MeResponse) => {
    setUser(me.user)
    setAllowedScopes(me.allowed_scopes ?? [])
  }, [])

  const loadUser = useCallback(async () => {
    try {
      applyMe(await api.getCurrentUser())
    } catch {
      setUser(null)
      setAllowedScopes([])
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

  const logout = useCallback(() => {
    setUser(null)
    setAllowedScopes([])
    clearAuthStorage()
    api.logout()
  }, [])

  const hasScope = useCallback((scope: string) => scopeSatisfied(allowedScopes, scope), [allowedScopes])

  const value: AuthContextType = {
    user,
    allowedScopes,
    isAuthenticated: user !== null,
    isLoading,
    login,
    devLogin,
    logout,
    hasScope,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
