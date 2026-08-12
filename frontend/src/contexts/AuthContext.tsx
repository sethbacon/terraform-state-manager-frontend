// Re-export the shared suite AuthProvider, injecting this app's backend contract.
// The provider is cookie/`/me`-driven and derives the role template from the
// primary membership — matching this app's previous behaviour. SESSION_WARNING_LEAD_MS
// and useAuth are re-exported so existing imports keep working.
import { useEffect, useRef, type ReactNode } from 'react'
import { AuthProvider as SuiteAuthProvider, useAuth, SESSION_WARNING_LEAD_MS } from '@4cloudguru/cloud-suite-ui'
import { api, setUnauthorizedHandler } from '../services/api'
import { clearAuthStorage } from '../utils/authStorage'
import { queryClient } from '../queryClient'

// On sign-out, also drop the react-query cache so prior-user admin/query data does not
// linger in memory until a full page reload (a retention gap on shared/kiosk machines).
function handleClearStorage(): void {
  clearAuthStorage()
  queryClient.clear()
}

// Bridges the axios 401 interceptor to the auth state. A 401 that happens while
// the user IS authenticated (a mid-session expiry or admin revocation) triggers a
// logout, which resets the in-memory session so ProtectedRoute redirects to
// /login — instead of leaving the SPA in a broken authenticated shell where every
// query 401s. Gated on isAuthenticated so the expected anonymous 401s (the
// bootstrap /me probe, requests from the login page) are ignored and cannot loop.
function SessionExpiryBridge() {
  const { isAuthenticated, logout } = useAuth()
  const authedRef = useRef(isAuthenticated)
  authedRef.current = isAuthenticated
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (authedRef.current) logout()
    })
    return () => setUnauthorizedHandler(null)
  }, [logout])
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SuiteAuthProvider api={api} onClearStorage={handleClearStorage}>
      <SessionExpiryBridge />
      {children}
    </SuiteAuthProvider>
  )
}

export { useAuth, SESSION_WARNING_LEAD_MS }
