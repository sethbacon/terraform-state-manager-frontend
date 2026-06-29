// Re-export the shared suite AuthProvider, injecting this app's backend contract.
// The provider is cookie/`/me`-driven and derives the role template from the
// primary membership — matching this app's previous behaviour. SESSION_WARNING_LEAD_MS
// and useAuth are re-exported so existing imports keep working.
import type { ReactNode } from 'react'
import { AuthProvider as SuiteAuthProvider, useAuth, SESSION_WARNING_LEAD_MS } from '@sethbacon/terraform-suite-ui'
import { api } from '../services/api'
import { clearAuthStorage } from '../utils/authStorage'

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SuiteAuthProvider api={api} onClearStorage={clearAuthStorage}>
      {children}
    </SuiteAuthProvider>
  )
}

export { useAuth, SESSION_WARNING_LEAD_MS }
