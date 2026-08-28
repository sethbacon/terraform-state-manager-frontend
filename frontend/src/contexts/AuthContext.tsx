// Re-export the shared suite AuthProvider, injecting this app's backend contract.
// The provider is cookie/`/me`-driven and derives the role template from the
// primary membership — matching this app's previous behaviour. SESSION_WARNING_LEAD_MS
// and useAuth are re-exported so existing imports keep working.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ADMIN_SCOPE,
  AuthProvider as SuiteAuthProvider,
  useAuth,
  SESSION_WARNING_LEAD_MS,
  type SelectableOrganization,
} from '@4cloudguru/cloud-suite-ui'
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

// Supplies the organization directory a PLATFORM ADMINISTRATOR must choose from.
//
// # Why a platform administrator is offered anything at all
//
// tenantscope.Resolve returns Scope{PlatformAdmin: true} and returns BEFORE it
// reads memberships, so such a caller reaches every organization and carries
// none. ActingOrganization then refuses an unnamed write from them
// UNCONDITIONALLY -- not only when they reach several -- with "name the
// organization to act in via the X-Organization-Id header". The picker, which
// renders from the choice universe, had nothing to offer for exactly the caller
// the server always requires to choose: an administrator could neither create
// nor rotate an API key and the UI showed no control to fix it.
//
// # Why the predicate is "admin scope AND no memberships"
//
// /auth/me publishes no platform-admin flag, so the standing has to be derived.
// It is derivable exactly: reportedScopes emits `admin` only when this request
// actually carries it, and with no memberships the role-template union is empty,
// so the only remaining carrier is the platform_admins table. Admin scope with
// zero memberships therefore MEANS platform administrator -- and it is also
// precisely the deadlocked set, since a caller with memberships already has a
// universe to pick from.
//
// Everyone else is left alone, and deliberately: their memberships already are
// the set they may act in, and widening it would offer organizations the server
// refuses on every write. It also keeps a platform-wide identity read off every
// ordinary admin's page load.
//
// # It degrades to the previous behaviour, never to a blank picker
//
// A failed directory read clears the extra universe rather than surfacing an
// error: the caller is left exactly where they were before this bridge existed
// (memberships alone), which for an ordinary user is unchanged and for an
// administrator is the pre-existing refusal, not a new crash. The array is
// compared by the ids it holds, so handing the provider a fresh one re-resolves
// nothing that has not actually moved.
function PlatformAdminOrganizations({
  onChoices,
}: {
  onChoices: (organizations: SelectableOrganization[] | undefined) => void
}) {
  const { isAuthenticated, memberships, hasScope } = useAuth()
  const isPlatformAdmin = isAuthenticated && memberships.length === 0 && hasScope(ADMIN_SCOPE)

  useEffect(() => {
    if (!isPlatformAdmin) {
      // Covers sign-out and a demotion mid-session as well as the ordinary user:
      // an acting-organization universe must not outlive the standing that
      // justified it.
      onChoices(undefined)
      return
    }
    let live = true
    // An async body rather than a .catch chain, so a SYNCHRONOUS throw from the
    // call itself degrades too. A rejected promise is the expected failure, but
    // the effect must not be the thing that takes the tree down either way --
    // there is no error boundary between here and the app shell.
    const load = async () => {
      try {
        const orgs = await api.listAdminOrganizations()
        if (!live) return
        onChoices(
          orgs.map((o) => ({ organization_id: o.id, organization_name: o.display_name || o.name })),
        )
      } catch {
        if (live) onChoices(undefined)
      }
    }
    void load()
    return () => {
      live = false
    }
  }, [isPlatformAdmin, onChoices])

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
  // Lifted to the provider's own parent because the directory is a PROP of the
  // provider while the standing that decides whether to fetch it is INSIDE:
  // PlatformAdminOrganizations reads the resolved session and hands the answer
  // back up. The provider re-resolves the selection when the extra
  // organizations land, which they do after /me has already settled.
  const [selectableOrganizations, setSelectableOrganizations] = useState<
    SelectableOrganization[] | undefined
  >(undefined)
  // Identity-stable so the bridge's effect is driven by the caller's standing
  // and not by this component re-rendering.
  const handleChoices = useCallback((organizations: SelectableOrganization[] | undefined) => {
    setSelectableOrganizations(organizations)
  }, [])

  return (
    <SuiteAuthProvider
      api={api}
      onClearStorage={handleClearStorage}
      organizationStorageKey={ORGANIZATION_STORAGE_KEY}
      selectableOrganizations={selectableOrganizations}
    >
      <SessionExpiryBridge />
      <OrganizationBridge />
      <PlatformAdminOrganizations onChoices={handleChoices} />
      {children}
    </SuiteAuthProvider>
  )
}

export { useAuth, SESSION_WARNING_LEAD_MS }
