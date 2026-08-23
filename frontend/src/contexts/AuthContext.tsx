// Re-export the shared suite AuthProvider, injecting this app's backend contract.
// The provider is cookie/`/me`-driven and derives the role template from the
// primary membership — matching this app's previous behaviour. SESSION_WARNING_LEAD_MS
// and useAuth are re-exported so existing imports keep working.
import { useEffect, useRef, type ReactNode } from 'react'
import { AuthProvider as SuiteAuthProvider, useAuth, SESSION_WARNING_LEAD_MS } from '@4cloudguru/cloud-suite-ui'
import { api, setActingOrganization, setUnauthorizedHandler } from '../services/api'
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

// Keeps the api client's acting organization in step with the provider's.
//
// A bridge rather than the api module reading storage directly, because the
// PROVIDER is the only thing that knows whether a remembered choice is still
// valid — it re-derives the selection against the memberships the server
// returned and discards one the user no longer holds. The api module reading the
// raw key would resend an organization the provider had already rejected, and
// every write would be refused with no visible cause.
//
// Null is pushed through deliberately: a caller with several organizations who
// has not chosen has nothing to send, and the backend refuses an unnamed write
// in exactly that case. Clearing on unmount matters for the same reason a
// logout clears it — a stale organization outliving its session is the one
// value that must not be inherited by whoever signs in next.
function OrganizationBridge() {
  const { currentOrganizationId } = useAuth()
  useEffect(() => {
    setActingOrganization(currentOrganizationId)
    return () => setActingOrganization(null)
  }, [currentOrganizationId])
  return null
}

// Where the selected organization is remembered across reloads. Namespaced to
// this app rather than reusing the shared DEFAULT_ORGANIZATION_KEY: the suite
// apps are separate origins with separate onboarding, so a user may legitimately
// act in a different organization in each, and one shared key would make picking
// in one silently re-point the other.
//
// The stored value is a HINT and never an authority — the provider matches it
// against the memberships the server just returned and discards anything that
// does not match, so a hand-edited value or one left behind by a different user
// of the same browser is ignored rather than honoured.
const ORGANIZATION_STORAGE_KEY = 'tsm.organization'

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SuiteAuthProvider
      api={api}
      onClearStorage={handleClearStorage}
      organizationStorageKey={ORGANIZATION_STORAGE_KEY}
    >
      <SessionExpiryBridge />
      <OrganizationBridge />
      {children}
    </SuiteAuthProvider>
  )
}

export { useAuth, SESSION_WARNING_LEAD_MS }
