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
