// setupApi wraps the first-run setup-wizard endpoints. The status endpoint is
// public; every mutating call carries the one-time token as
// "Authorization: SetupToken <token>" (the operator is not logged in during
// setup, so there is no session cookie).
import { apiClient } from './api'

export interface SetupStatus {
  setup_required: boolean
  setup_completed: boolean
  pending_feature_setup: boolean
  auth_method: string
  admin_configured: boolean
  oidc_configured: boolean
  ldap_configured: boolean
  sources_configured: boolean
  // identity_owned_externally is true when a sibling registry owns identity
  // (coupled). The wizard then hides the Owner and OIDC steps.
  identity_owned_externally: boolean
}

export interface OIDCForm {
  issuer_url: string
  client_id: string
  client_secret: string
  redirect_url?: string
  scopes?: string[]
}

export interface SourceForm {
  name: string
  type: string
  endpoint?: string
  config?: Record<string, unknown>
  credentials?: Record<string, unknown>
}

// Trim the operator-typed/pasted token once at the boundary so validation and
// every mutating call send the identical value — a token pasted with surrounding
// whitespace otherwise validates but fails the save calls (#241).
const tokenAuth = (token: string) => ({ headers: { Authorization: `SetupToken ${token.trim()}` } })

export const setupApi = {
  getStatus: async (): Promise<SetupStatus> =>
    (await apiClient.get<SetupStatus>('/api/v1/setup/status')).data,

  validateToken: async (token: string): Promise<{ valid: boolean }> =>
    (await apiClient.post<{ valid: boolean }>('/api/v1/setup/validate-token', {}, tokenAuth(token)))
      .data,

  configureOwner: async (token: string, email: string): Promise<void> => {
    await apiClient.post('/api/v1/setup/admin', { email }, tokenAuth(token))
  },

  testOIDC: async (token: string, form: OIDCForm): Promise<void> => {
    await apiClient.post('/api/v1/setup/oidc/test', form, tokenAuth(token))
  },

  saveOIDC: async (token: string, form: OIDCForm): Promise<void> => {
    await apiClient.post('/api/v1/setup/oidc', form, tokenAuth(token))
  },

  testSource: async (token: string, form: SourceForm): Promise<{ states: number }> =>
    (await apiClient.post<{ states: number }>('/api/v1/setup/sources/test', form, tokenAuth(token)))
      .data,

  saveSource: async (token: string, form: SourceForm): Promise<void> => {
    await apiClient.post('/api/v1/setup/sources', form, tokenAuth(token))
  },

  complete: async (token: string): Promise<void> => {
    await apiClient.post('/api/v1/setup/complete', {}, tokenAuth(token))
  },
}
