export interface User {
  id: string;
  email: string;
  name: string;
  oidc_sub?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role_template_id?: string;
  role_template_name?: string;
  created_at: string;
  updated_at: string;
}

export interface RoleTemplate {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  scopes: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface APIKey {
  id: string;
  user_id: string;
  organization_id?: string;
  name: string;
  description?: string;
  key_prefix: string;
  scopes: string[];
  expires_at?: string;
  last_used_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface APIKeyCreateResponse {
  api_key: APIKey;
  raw_key: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  organization_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface OIDCConfig {
  id: string;
  provider_name: string;
  issuer_url: string;
  client_id: string;
  scopes?: string[];
  group_claim_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  updated_at: string;
}

export interface SetupStatus {
  completed: boolean;
  current_step?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
  };
}

export interface DashboardStats {
  total_users: number;
  total_organizations: number;
  total_api_keys: number;
  recent_audit_events: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  scopes: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
}
