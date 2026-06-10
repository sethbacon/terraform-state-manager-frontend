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
}

export interface AuthContextType {
  user: User | null
  allowedScopes: string[]
  isAuthenticated: boolean
  isLoading: boolean
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
