export interface User {
  id: string
  email: string
  name: string
  username?: string
  oidc_sub?: string
  role_template_id?: string
  role_template_name?: string
  role_template_display_name?: string
  is_active?: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
  memberships?: UserMembership[]
}

export interface RoleTemplateInfo {
  id?: string
  name: string
  display_name: string
  scopes?: string[]
}

export interface RoleTemplate {
  id: string
  name: string
  display_name: string
  description?: string
  scopes: string[]
  is_system: boolean
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  display_name: string
  description?: string
  idp_type?: string | null
  idp_name?: string | null
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  organization_id: string
  user_id: string
  role_template_id?: string
  created_at: string
}

export interface OrganizationMemberWithUser {
  organization_id: string
  user_id: string
  role_template_id?: string
  role_template_name?: string
  role_template_display_name?: string
  role_template_scopes?: string[]
  created_at: string
  user_name: string
  user_email: string
}

export interface UserMembership {
  organization_id: string
  organization_name: string
  role_template_id?: string
  role_template_name?: string
  role_template_display_name?: string
  role_template_scopes?: string[]
  role_template?: RoleTemplateInfo
  created_at: string
}

export interface APIKey {
  id: string
  user_id?: string
  user_name?: string
  organization_id: string
  name: string
  description?: string
  key_prefix: string
  scopes: string[]
  expires_at?: string
  last_used_at?: string
  is_active?: boolean
  created_at: string
}

export interface APIKeyCreateResponse {
  api_key: APIKey
  raw_key: string
}

export interface RotateAPIKeyResponse {
  new_key: {
    id: string
    name: string
    key: string
    key_prefix: string
    scopes: string[]
    expires_at?: string
    created_at: string
  }
  old_key_status: string
  old_expires_at?: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  user_email: string | null
  user_name: string | null
  organization_id: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  metadata: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface AuditLogListResponse {
  logs: AuditLog[]
  pagination: PaginationMeta
}

export interface PaginationMeta {
  page: number
  per_page: number
  total: number
  total_pages?: number
}

export interface OIDCConfigInput {
  name?: string
  provider_type: 'generic_oidc' | 'azuread'
  issuer_url: string
  client_id: string
  client_secret: string
  redirect_url: string
  scopes?: string[]
  extra_config?: Record<string, string>
}

export interface OIDCGroupMapping {
  group: string
  organization: string
  role: string
}

export interface OIDCGroupMappingInput {
  group_claim_name: string
  group_mappings: OIDCGroupMapping[]
  default_role: string
}

export interface OIDCConfigResponse {
  id: string
  name: string
  provider_type: string
  issuer_url: string
  client_id: string
  redirect_url: string
  scopes: string[]
  is_active: boolean
  group_claim_name?: string
  group_mappings?: OIDCGroupMapping[]
  default_role?: string
  created_at: string
  updated_at: string
}

export interface SetupStatus {
  completed: boolean
  current_step?: string
}

export interface SetupValidateTokenResponse {
  valid: boolean
  message: string
}

export interface SetupTestResult {
  success: boolean
  message: string
  issuer?: string
}

export interface ConfigureAdminInput {
  email: string
}

export interface ConfigureAdminResponse {
  message: string
  email: string
  organization: string
  role: string
}

export interface CompleteSetupResponse {
  message: string
  setup_completed: boolean
}

export interface DashboardStats {
  total_users: number
  total_organizations: number
  total_api_keys: number
  recent_audit_events: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

export interface AuthState {
  user: User | null
  roleTemplate: RoleTemplateInfo | null
  allowedScopes: string[]
  memberships?: UserMembership[]
  isAuthenticated: boolean
  isLoading: boolean
  sessionExpiresAt: Date | null
  sessionExpiresSoon: boolean
}

export interface AuthContextType {
  user: User | null
  roleTemplate: RoleTemplateInfo | null
  allowedScopes: string[]
  isAuthenticated: boolean
  isLoading: boolean
  sessionExpiresAt: Date | null
  sessionExpiresSoon: boolean
  hasScope: (scope: string) => boolean
  login: (userOrProvider: User | 'oidc' | 'azuread') => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
  setToken: (token: string) => void
}

// ---- Whitelabel / UI theme ----

/**
 * Runtime white-label theme configuration returned by GET /api/v1/ui/theme.
 * The backend always responds with a populated default, so `product_name`,
 * `primary_color`, and `secondary_color_{light,dark}` are present in practice.
 * Override fields (logos, hero) may be absent or null. The frontend also keeps
 * a built-in default so it can render even when the request fails entirely.
 */
export interface UIThemeConfig {
  /** Display name for the product, e.g. "Acme Terraform State Manager" */
  product_name?: string
  /** Primary brand colour as a hex string, e.g. "#5C4EE5" */
  primary_color?: string
  /** Secondary brand colour for light mode as a hex string */
  secondary_color_light?: string
  /** Secondary brand colour for dark mode as a hex string */
  secondary_color_dark?: string
  /** URL to the logo image shown in the sidebar/app header (null = use default) */
  logo_url?: string | null
  /** URL to a custom favicon (overrides the default) */
  favicon_url?: string | null
  /** URL to the hero image on the login page (null = no hero) */
  login_hero_url?: string | null
  /** RFC3339 timestamp of the last theme update */
  updated_at?: string
}
