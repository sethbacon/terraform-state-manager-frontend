export interface User {
  id: string
  email: string
  name: string
}

export interface Membership {
  organization_id: string
  organization_name: string
  role_template_name?: string | null
  role_template_scopes?: string[]
}

export interface MeResponse {
  user: User
  memberships: Membership[]
  allowed_scopes: string[]
  session_expires_at?: string
  /**
   * Remaining session lifetime in seconds, measured by the backend as it built the response.
   *
   * Preferred by the shared AuthProvider over `session_expires_at` whenever present, because the
   * absolute instant has to be compared against this browser's clock and is therefore wrong by
   * exactly whatever skew exists between the two. A duration the backend measures and the browser
   * applies shares no clock at all (4cloudguru/cloud-suite-ui#181).
   *
   * Passed straight through: this app hands `api` to SuiteAuthProvider directly, so widening the
   * type here is all that is needed for the provider to see it.
   */
  session_expires_in?: number
}

/** Primary role template summary. Mirrors the registry frontend's shape. */
export interface RoleTemplateInfo {
  id?: string
  name: string
  display_name: string
  scopes?: string[]
}

export interface AuthContextType {
  user: User | null
  roleTemplate: RoleTemplateInfo | null
  allowedScopes: string[]
  isAuthenticated: boolean
  isLoading: boolean
  /** Absolute session expiry, or null when unknown. */
  sessionExpiresAt: Date | null
  /** True once the session is within the expiry-warning window. */
  sessionExpiresSoon: boolean
  login: (provider?: string) => void
  devLogin: () => Promise<void>
  ldapLogin: (username: string, password: string) => Promise<void>
  logout: () => void
  /** Rotate the session cookie via POST /auth/refresh; logs out on failure. */
  refreshSession: () => Promise<void>
  hasScope: (scope: string) => boolean
}
