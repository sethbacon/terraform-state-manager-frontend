import axios from 'axios'
import { clearAuthStorage } from '../utils/authStorage'
import type { MeResponse } from '../types/auth'

// Same-origin in dev (Vite proxies /api and /health to the backend) and in
// production (nginx proxies the same paths). withCredentials so the HttpOnly auth
// cookie is sent automatically. Sessions are cookie-only — the JWT is never read
// by JS, so there is no bearer token to attach.
export const apiClient = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Read a non-HttpOnly cookie by name (used for the CSRF double-submit token).
// Exported for the Swagger UI request interceptor, which needs the same token.
export function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

// Echo the double-submit CSRF token on state-changing requests. The backend sets
// the readable tsm_csrf cookie alongside the auth cookie and requires the header
// to match it for cookie-authenticated mutations.
apiClient.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase()
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const csrf = readCookie('tsm_csrf')
    if (csrf) {
      config.headers = config.headers ?? {}
      config.headers['X-CSRF-Token'] = csrf
    }
  }
  return config
})

// On 401, drop any stale local auth state. Route guards handle the redirect, so we
// don't navigate here (avoids loops on anonymous probes like the initial /me call).
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthStorage()
    }
    return Promise.reject(error)
  },
)

export interface VersionInfo {
  name: string
  version: string
  build_date: string
}

export interface HealthInfo {
  status: string
}

export interface AuthProvider {
  type: string
  name: string
  /** Present for SAML: the IdP name, used to request that specific IdP. */
  id?: string
}

export interface ProvidersInfo {
  providers: AuthProvider[]
  dev_mode: boolean
}

export interface SSOGroupMapping {
  group: string
  organization: string
  role: string
}

export interface SSOLdapMapping {
  group_dn: string
  organization: string
  role: string
}

export interface SSOMtlsMapping {
  subject: string
  scopes: string[]
}

export interface SSOConfig {
  oidc: {
    enabled: boolean
    issuer_url: string
    group_claim_name: string
    default_role: string
    group_mappings: SSOGroupMapping[]
  }
  saml: {
    enabled: boolean
    entity_id: string
    acs_url: string
    allow_idp_initiated: boolean
    group_attribute_name: string
    default_role: string
    idps: string[]
    group_mappings: SSOGroupMapping[]
  }
  ldap: {
    enabled: boolean
    host: string
    use_tls: boolean
    start_tls: boolean
    base_dn: string
    default_role: string
    group_mappings: SSOLdapMapping[]
  }
  mtls: {
    enabled: boolean
    client_ca_file: string
    mappings: SSOMtlsMapping[]
  }
  scim: {
    enabled: boolean
  }
}

export interface Count {
  key: string
  count: number
}

export interface SourceSyncInfo {
  source_id: string
  name: string
  type: string
  /** False until the source's first sync cycle has completed. */
  synced: boolean
  last_sync_at?: string
  states_listed?: number
  states_stored?: number
  read_errors?: number
  last_error?: string
}

export interface DashboardOverview {
  sources: number
  states: number
  /** States visible in the backends' listings (>= states while a sync is catching up). */
  states_listed: number
  rum: number
  managed_resources: number
  data_sources: number
  total_resources: number
  providers: Count[]
  resource_types: Count[]
  terraform_versions: Count[]
  source_errors: number
  sync: SourceSyncInfo[]
  refreshed_at?: string
}

export interface AdminUserMembership {
  organization_id?: string
  organization_name?: string
  role_template_id?: string | null
  role_template_name?: string | null
  role_template_display_name?: string | null
}
export interface AdminUser {
  id: string
  email: string
  name: string
  oidc_sub?: string | null
  created_at: string
  memberships?: AdminUserMembership[]
}
export interface AdminOrganization {
  id: string
  name: string
  display_name: string
  idp_type?: string | null
  idp_name?: string | null
  created_at: string
}
export interface OrgMemberWithUser {
  organization_id: string
  user_id: string
  role_template_id?: string | null
  role_template_name?: string | null
  role_template_display_name?: string | null
  user_name: string
  user_email: string
  created_at: string
}
export interface RoleTemplate {
  id: string
  name: string
  display_name: string
  description?: string | null
  scopes: string[]
  is_system: boolean
  created_at: string
  updated_at: string
}
export interface AuditLogEntry {
  id: string
  action: string
  resource_type?: string | null
  resource_id?: string | null
  organization_id?: string | null
  user_id?: string | null
  metadata?: Record<string, unknown> | null
  ip_address?: string | null
  created_at: string
  user_email?: string | null
  user_name?: string | null
}
export interface AuditLogFilters {
  page?: number
  per_page?: number
  action?: string
  resource_type?: string
  user_email?: string
  start_date?: string
  end_date?: string
}
export interface AdminStats {
  users: number
  organizations: number
  roles: number
}
export interface OIDCGroupMapping {
  group: string
  organization: string
  role: string
}
export interface OIDCConfigResponse {
  provider_type: string
  issuer_url: string
  client_id: string
  is_active: boolean
  group_claim_name: string
  default_role: string
  group_mappings: OIDCGroupMapping[]
}
export interface IdentityGroupMappings {
  saml?: {
    group_attribute_name: string
    default_role: string
    group_mappings: OIDCGroupMapping[]
  }
  ldap?: {
    default_role: string
    group_mappings: { group_dn: string; organization: string; role: string }[]
  }
}
export interface MTLSConfigResponse {
  enabled: boolean
  client_ca_file: string
  mappings: { subject: string; scopes: string[] }[]
}

export interface StateSource {
  id: string
  name: string
  type: string
  endpoint: string
  config: Record<string, unknown>
  scope: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface OutputSummary {
  name: string
  type: string
  sensitive: boolean
  /** Absent when sensitive: the backend redacts the value server-side. */
  value?: unknown
}

export interface StateRef {
  key: string
  name: string
  size: number
  last_modified?: string
}

export interface AnalysisCount {
  key: string
  count: number
}

export interface StateAnalysis {
  terraform_version: string
  format_version: number
  serial: number
  lineage: string
  total_resources: number
  managed_resources: number
  data_sources: number
  null_resources: number
  rum: number
  resource_types: AnalysisCount[]
  providers: AnalysisCount[]
  modules: AnalysisCount[]
}

export interface AnalysisResult {
  key: string
  size: number
  last_modified?: string
  analysis: StateAnalysis
}

export interface CreateSourceInput {
  name: string
  type: string
  config: Record<string, unknown>
  credentials?: Record<string, unknown>
}

export interface UpdateSourceInput {
  name: string
  config: Record<string, unknown>
  /** Omit to keep the stored credentials; the type cannot change. */
  credentials?: Record<string, unknown>
}

export interface SourceTestResult {
  status: 'ok' | 'failed'
  states?: number
  error?: string
}

export interface ResourceSummary {
  module: string
  mode: string
  type: string
  name: string
  provider: string
  instances: number
}

// StateModule is one registry module a state calls, captured from an ingested
// plan. module_version is null when only a version constraint is known (no
// lockfile); registry_host is the host the cross-app join keys on.
export interface StateModule {
  source_id: string
  state_key: string
  module_source: string
  module_version: string | null
  registry_host: string
  observed_at: string
}

export type ReportFormat = 'json' | 'md' | 'csv'

export interface Backup {
  id: string
  source_id: string
  state_key: string
  serial: number | null
  created_by: string
  created_at: string
}

export interface TransferResult {
  id: string
  mode: string
  source_id: string
  source_key: string
  target_source_id: string
  target_key: string
  status: string
  verified: boolean | null
  decommissioned: boolean
  detail: string
  created_at: string
}

export interface PipelineConnection {
  id: string
  name: string
  provider: string
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreatePipelineInput {
  name: string
  provider: string
  config: Record<string, unknown>
  token?: string
}

// CI sources: org-level CI credentials (ADO org/project or GitHub owner) that
// pipeline connections can be created from by selection.
export interface CISource {
  id: string
  name: string
  provider: string
  organization: string
  project?: string | null
  has_token: boolean
  created_at: string
  updated_at: string
}
export interface CIPipelineRef {
  id: number
  name: string
  folder?: string
}
export interface CIRepoRef {
  /** Repository id (Azure DevOps only — required by pipeline creation). */
  id?: string
  name: string
  default_branch?: string
}
export interface CIServiceConnectionRef {
  id: string
  name: string
  type?: string
}
export interface CallbackPreflight {
  callback_base: string
  likely_unreachable: boolean
}
export interface CIWorkflowSetupResult {
  status: 'exists' | 'pr_created'
  branch?: string
  pr_id?: number
  pr_url?: string
}
export interface CIWorkflowRef {
  id: number
  name: string
  file: string
}

export interface DriftRun {
  id: string
  pipeline_connection_id: string | null
  source_id: string | null
  state_key: string
  repo_ref: string
  working_dir: string
  status: string
  added: number | null
  changed: number | null
  destroyed: number | null
  drifted: boolean | null
  summary?: { address: string; actions: string[] }[]
  detail: string
  actor: string
  created_at: string
  updated_at: string
}

export interface CreateDriftRunInput {
  pipeline_connection_id: string
  source_id?: string
  state_key?: string
  repo_ref?: string
  working_dir?: string
}

// APIKey is a stored key (never the secret; key_prefix identifies it).
export interface APIKey {
  id: string
  user_id?: string
  organization_id: string
  name: string
  description?: string
  key_prefix: string
  scopes: string[]
  expires_at?: string
  last_used_at?: string
  created_at: string
  user_name?: string
}

export interface APIKeyInput {
  name: string
  description?: string
  scopes: string[]
  expires_at?: string // RFC3339; omit for never
}

// CreateAPIKeyResponse carries the plaintext secret — shown exactly once.
export interface CreateAPIKeyResponse {
  key: string
  api_key: APIKey
}

// One snapshot from the append-only per-state analysis history (statesync
// appends a row whenever it observes the state changed).
export interface StateAnalysisSnapshot {
  source_id: string
  state_key: string
  version_marker: string
  size: number
  terraform_version: string
  serial: number
  lineage: string
  rum: number
  managed_resources: number
  data_sources: number
  total_resources: number
  providers: Record<string, number> | null
  resource_types: Record<string, number> | null
  analyzed_at: string
}

export interface DriftRecord {
  id: string
  source_id: string | null
  state_key: string
  pipeline_connection_id: string | null
  last_run_id: string | null
  origin: 'run' | 'ingest'
  severity: 'critical' | 'warning'
  added: number
  changed: number
  destroyed: number
  summary?: { address: string; actions: string[] }[]
  status: 'open' | 'acknowledged' | 'resolved'
  acknowledged_by: string
  acknowledged_at: string | null
  ack_note: string
  resolved_at: string | null
  external_ref?: string
  detections: number
  first_detected_at: string
  last_detected_at: string
}

export interface DriftRecordsResponse {
  records: DriftRecord[]
  counts: Record<string, number>
}

export interface ScheduleTargetConfig {
  pipeline_connection_id: string
  source_id?: string
  state_key?: string
  repo_ref?: string
  working_dir?: string
}

export interface Schedule {
  id: string
  name: string
  cron_expr: string
  target_type: string
  target_config: ScheduleTargetConfig
  enabled: boolean
  last_run_at: string | null
  next_run_at: string | null
  last_run_id: string | null
  last_status: string | null
  created_at: string
  updated_at: string
}

export interface ScheduleInput {
  name: string
  cron_expr: string
  target_type: string
  target_config: ScheduleTargetConfig
  enabled: boolean
}

export interface NotificationChannel {
  id: string
  name: string
  type: string
  has_target: boolean
  events: string[]
  enabled: boolean
  last_status: string | null
  last_error: string | null
  last_sent_at: string | null
  created_at: string
  updated_at: string
}

export interface NotificationChannelInput {
  name: string
  type: string
  target?: string
  events: string[]
  enabled: boolean
}

export interface HealthRun {
  id: string
  pipeline_connection_id: string | null
  repo_ref: string
  working_dir: string
  terraform_version: string
  provider_versions: Record<string, string>
  registry_host: string
  status: string
  init_ok: boolean | null
  plan_ok: boolean | null
  success: boolean | null
  detail: string
  actor: string
  created_at: string
  updated_at: string
}

export interface CreateHealthRunInput {
  pipeline_connection_id: string
  repo_ref?: string
  working_dir?: string
  terraform_version?: string
  provider_versions?: Record<string, string>
  module_versions?: Record<string, string>
  registry_host?: string
}

export const api = {
  getVersion: async (): Promise<VersionInfo> => (await apiClient.get<VersionInfo>('/api/v1/version')).data,
  getHealth: async (): Promise<HealthInfo> => (await apiClient.get<HealthInfo>('/health')).data,
  getDashboardOverview: async (refresh = false): Promise<DashboardOverview> =>
    (
      await apiClient.get<DashboardOverview>('/api/v1/dashboard/overview', {
        params: refresh ? { refresh: 'true' } : undefined,
      })
    ).data,

  // Identity management (admin scope)
  getAdminStats: async (): Promise<AdminStats> => (await apiClient.get<AdminStats>('/api/v1/admin/stats')).data,
  listAdminUsers: async (params?: { page?: number; per_page?: number; q?: string }): Promise<{ users: AdminUser[]; total: number }> =>
    (await apiClient.get<{ users: AdminUser[]; total: number }>('/api/v1/admin/users', { params })).data,
  createAdminUser: async (input: { email: string; name: string }): Promise<AdminUser> =>
    (await apiClient.post<AdminUser>('/api/v1/admin/users', input)).data,
  updateAdminUser: async (id: string, input: { name: string }): Promise<AdminUser> =>
    (await apiClient.put<AdminUser>(`/api/v1/admin/users/${id}`, input)).data,
  deleteAdminUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/users/${id}`)
  },
  getAdminUserMemberships: async (id: string): Promise<AdminUserMembership[]> =>
    (await apiClient.get<{ memberships: AdminUserMembership[] }>(`/api/v1/admin/users/${id}/memberships`)).data
      .memberships,
  // GDPR Articles 15/20 — returns the export blob plus its download filename.
  exportAdminUserData: async (id: string): Promise<{ blob: Blob; filename: string }> => {
    const res = await apiClient.get(`/api/v1/admin/users/${id}/export`, { responseType: 'blob' })
    return { blob: res.data as Blob, filename: `user-data-${id}.json` }
  },
  // GDPR Article 17 — anonymize PII, revoke access.
  eraseAdminUser: async (id: string): Promise<{ message?: string }> =>
    (await apiClient.post<{ message?: string }>(`/api/v1/admin/users/${id}/erase`)).data,
  listAdminOrganizations: async (): Promise<AdminOrganization[]> =>
    (await apiClient.get<{ organizations: AdminOrganization[] }>('/api/v1/admin/organizations')).data.organizations,
  createAdminOrganization: async (input: { name: string; display_name: string }): Promise<AdminOrganization> =>
    (await apiClient.post<AdminOrganization>('/api/v1/admin/organizations', input)).data,
  updateAdminOrganization: async (
    id: string,
    input: { name?: string; display_name?: string; idp_type?: string | null; idp_name?: string | null },
  ): Promise<AdminOrganization> =>
    (await apiClient.put<AdminOrganization>(`/api/v1/admin/organizations/${id}`, input)).data,
  deleteAdminOrganization: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/organizations/${id}`)
  },
  listAdminOrgMembers: async (orgId: string): Promise<OrgMemberWithUser[]> =>
    (await apiClient.get<{ members: OrgMemberWithUser[] }>(`/api/v1/admin/organizations/${orgId}/members`)).data
      .members,
  addAdminOrgMember: async (orgId: string, input: { user_id: string; role_template_id?: string }): Promise<void> => {
    await apiClient.post(`/api/v1/admin/organizations/${orgId}/members`, input)
  },
  updateAdminOrgMember: async (
    orgId: string,
    userId: string,
    input: { role_template_id?: string },
  ): Promise<void> => {
    await apiClient.put(`/api/v1/admin/organizations/${orgId}/members/${userId}`, input)
  },
  removeAdminOrgMember: async (orgId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/organizations/${orgId}/members/${userId}`)
  },
  listAdminRoles: async (): Promise<RoleTemplate[]> =>
    (await apiClient.get<{ roles: RoleTemplate[] }>('/api/v1/admin/roles')).data.roles,
  listAuditLogs: async (params?: AuditLogFilters): Promise<{ logs: AuditLogEntry[]; total: number }> =>
    (await apiClient.get<{ logs: AuditLogEntry[]; total: number }>('/api/v1/admin/audit-logs', { params })).data,
  getSSOConfig: async (): Promise<SSOConfig> =>
    (await apiClient.get<SSOConfig>('/api/v1/admin/sso')).data,
  getAdminOIDCConfig: async (): Promise<OIDCConfigResponse> =>
    (await apiClient.get<OIDCConfigResponse>('/api/v1/admin/oidc/config')).data,
  updateOIDCGroupMapping: async (input: {
    group_claim_name: string
    default_role: string
    group_mappings: OIDCGroupMapping[]
  }): Promise<OIDCConfigResponse> =>
    (await apiClient.put<OIDCConfigResponse>('/api/v1/admin/oidc/group-mapping', input)).data,
  getIdentityGroupMappings: async (): Promise<IdentityGroupMappings> =>
    (await apiClient.get<IdentityGroupMappings>('/api/v1/admin/identity-group-mappings')).data,
  getMTLSConfig: async (): Promise<MTLSConfigResponse> =>
    (await apiClient.get<MTLSConfigResponse>('/api/v1/admin/mtls')).data,

  // Auth
  getProviders: async (): Promise<ProvidersInfo> => (await apiClient.get<ProvidersInfo>('/api/v1/auth/providers')).data,
  getCurrentUser: async (): Promise<MeResponse> => (await apiClient.get<MeResponse>('/api/v1/auth/me')).data,
  refreshToken: async (): Promise<{ expires_in: number }> =>
    (await apiClient.post<{ expires_in: number }>('/api/v1/auth/refresh')).data,
  devLogin: async (): Promise<{ expires_in: number }> =>
    (await apiClient.post<{ expires_in: number }>('/api/v1/dev/login')).data,
  // LDAP search-bind login; sets the HttpOnly session cookie like the OIDC flow.
  ldapLogin: async (username: string, password: string): Promise<{ expires_in: number }> =>
    (await apiClient.post<{ expires_in: number }>('/api/v1/auth/ldap/login', { username, password })).data,
  // Full-page redirects (OAuth + logout leave the SPA).
  login: (provider = 'oidc'): void => {
    window.location.href = `/api/v1/auth/login?provider=${encodeURIComponent(provider)}`
  },
  logout: (): void => {
    window.location.href = '/api/v1/auth/logout'
  },

  // State sources (Phase 1 read plane)
  listSources: async (): Promise<StateSource[]> =>
    (await apiClient.get<{ sources: StateSource[] }>('/api/v1/sources')).data.sources,
  updateSource: async (id: string, input: UpdateSourceInput): Promise<StateSource> =>
    (await apiClient.put<StateSource>(`/api/v1/sources/${id}`, input)).data,
  testSource: async (id: string): Promise<SourceTestResult> =>
    (await apiClient.post<SourceTestResult>(`/api/v1/sources/${id}/test`)).data,
  createSource: async (input: CreateSourceInput): Promise<StateSource> =>
    (await apiClient.post<StateSource>('/api/v1/sources', input)).data,
  deleteSource: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/sources/${id}`)
  },
  listStates: async (id: string): Promise<StateRef[]> =>
    (await apiClient.get<{ states: StateRef[] }>(`/api/v1/sources/${id}/states`)).data.states,
  analyzeState: async (id: string, key: string): Promise<AnalysisResult> =>
    (await apiClient.get<AnalysisResult>(`/api/v1/sources/${id}/state/analysis`, { params: { key } })).data,
  listStateResources: async (id: string, key: string): Promise<ResourceSummary[]> =>
    (await apiClient.get<{ resources: ResourceSummary[] }>(`/api/v1/sources/${id}/state/resources`, { params: { key } }))
      .data.resources,
  listStateModules: async (id: string, key?: string): Promise<StateModule[]> =>
    (await apiClient.get<{ modules: StateModule[] }>(`/api/v1/sources/${id}/modules`, { params: key ? { key } : {} }))
      .data.modules,
  listStateOutputs: async (id: string, key: string): Promise<OutputSummary[]> =>
    (await apiClient.get<{ outputs: OutputSummary[] }>(`/api/v1/sources/${id}/state/outputs`, { params: { key } }))
      .data.outputs,
  getStateHistory: async (id: string, key: string): Promise<StateAnalysisSnapshot[]> =>
    (
      await apiClient.get<{ history: StateAnalysisSnapshot[] }>(`/api/v1/sources/${id}/state/history`, {
        params: { key },
      })
    ).data.history,
  getRawState: async (id: string, key: string): Promise<string> =>
    (
      await apiClient.get<string>(`/api/v1/sources/${id}/state/raw`, {
        params: { key },
        responseType: 'text',
        transformResponse: (d) => d as string,
      })
    ).data,
  downloadReport: async (id: string, key: string, format: ReportFormat): Promise<void> => {
    const res = await apiClient.get(`/api/v1/sources/${id}/state/report`, {
      params: { key, format },
      responseType: 'blob',
    })
    const disposition = res.headers['content-disposition'] as string | undefined
    const match = disposition?.match(/filename="?([^"]+)"?/)
    const filename = match ? match[1] : `analysis.${format}`
    const url = URL.createObjectURL(res.data as Blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  },
  analyzeUpload: async (content: string): Promise<{ analysis: StateAnalysis; resources: ResourceSummary[] }> =>
    (await apiClient.post('/api/v1/analyze', content, { headers: { 'Content-Type': 'application/json' } })).data,

  // Edit plane (Phase 2)
  editState: async (
    id: string,
    key: string,
    content: string,
    force = false,
  ): Promise<{ status: string; backup_id?: string; serial: number }> =>
    (
      await apiClient.put(`/api/v1/sources/${id}/state/raw`, content, {
        params: { key, ...(force ? { force: 'true' } : {}) },
        headers: { 'Content-Type': 'application/json' },
      })
    ).data,
  stateOperation: async (
    id: string,
    key: string,
    op: 'rm' | 'mv',
    address: string,
    to?: string,
  ): Promise<{ status: string; op: string; backup_id: string; serial: number }> =>
    (
      await apiClient.post(
        `/api/v1/sources/${id}/state/operations`,
        { op, address, ...(to ? { to } : {}) },
        { params: { key } },
      )
    ).data,
  listBackups: async (id: string, key: string): Promise<Backup[]> =>
    (await apiClient.get<{ backups: Backup[] }>(`/api/v1/sources/${id}/state/backups`, { params: { key } })).data
      .backups,
  restoreBackup: async (id: string, backupId: string, key: string): Promise<void> => {
    await apiClient.post(`/api/v1/sources/${id}/state/backups/${backupId}/restore`, null, { params: { key } })
  },

  // Transfer plane (Phase 2)
  backupToSource: async (
    id: string,
    key: string,
    targetSourceId: string,
    targetKey: string,
  ): Promise<TransferResult> =>
    (
      await apiClient.post(
        `/api/v1/sources/${id}/state/backup`,
        { target_source_id: targetSourceId, target_key: targetKey },
        { params: { key } },
      )
    ).data,
  migrateToSource: async (
    id: string,
    key: string,
    targetSourceId: string,
    targetKey: string,
    decommission: boolean,
  ): Promise<TransferResult> =>
    (
      await apiClient.post(
        `/api/v1/sources/${id}/state/migrate`,
        { target_source_id: targetSourceId, target_key: targetKey, decommission },
        { params: { key } },
      )
    ).data,

  // Drift plane (Phase 3)
  listPipelines: async (): Promise<PipelineConnection[]> =>
    (await apiClient.get<{ pipelines: PipelineConnection[] }>('/api/v1/pipelines')).data.pipelines,
  createPipeline: async (input: CreatePipelineInput): Promise<PipelineConnection> =>
    (await apiClient.post<PipelineConnection>('/api/v1/pipelines', input)).data,
  deletePipeline: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/pipelines/${id}`)
  },
  // CI sources + discovery
  listCISources: async (): Promise<CISource[]> =>
    (await apiClient.get<{ ci_sources: CISource[] }>('/api/v1/ci-sources')).data.ci_sources,
  createCISource: async (input: {
    name: string
    provider: string
    organization: string
    project?: string
    token: string
  }): Promise<CISource> => (await apiClient.post<CISource>('/api/v1/ci-sources', input)).data,
  deleteCISource: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/ci-sources/${id}`)
  },
  listCISourcePipelines: async (id: string): Promise<CIPipelineRef[]> =>
    (await apiClient.get<{ pipelines: CIPipelineRef[] }>(`/api/v1/ci-sources/${id}/pipelines`)).data.pipelines,
  listCISourceRepos: async (id: string): Promise<CIRepoRef[]> =>
    (await apiClient.get<{ repos: CIRepoRef[] }>(`/api/v1/ci-sources/${id}/repos`)).data.repos,
  listCISourceWorkflows: async (id: string, repo: string): Promise<CIWorkflowRef[]> =>
    (
      await apiClient.get<{ workflows: CIWorkflowRef[] }>(
        `/api/v1/ci-sources/${id}/repos/${encodeURIComponent(repo)}/workflows`,
      )
    ).data.workflows,
  listCISourceServiceConnections: async (id: string): Promise<CIServiceConnectionRef[]> =>
    (await apiClient.get<{ service_connections: CIServiceConnectionRef[] }>(`/api/v1/ci-sources/${id}/service-connections`))
      .data.service_connections,
  createCISourcePipeline: async (
    id: string,
    repoId: string,
    input: { name: string; yaml_path?: string },
  ): Promise<CIPipelineRef> =>
    (
      await apiClient.post<{ pipeline: CIPipelineRef }>(
        `/api/v1/ci-sources/${id}/repos/${encodeURIComponent(repoId)}/pipelines`,
        input,
      )
    ).data.pipeline,
  getCallbackPreflight: async (): Promise<CallbackPreflight> =>
    (await apiClient.get<CallbackPreflight>('/api/v1/pipelines/callback-preflight')).data,
  setupCISourceWorkflow: async (
    id: string,
    repo: string,
    files: { kind: 'drift' | 'versionlab'; content: string }[],
  ): Promise<CIWorkflowSetupResult> =>
    (
      await apiClient.post<CIWorkflowSetupResult>(
        `/api/v1/ci-sources/${id}/repos/${encodeURIComponent(repo)}/workflow-setup`,
        { files },
      )
    ).data,
  getCISourcePRState: async (id: string, repo: string, pr: number): Promise<{ state: 'open' | 'merged' | 'closed' }> =>
    (
      await apiClient.get<{ state: 'open' | 'merged' | 'closed' }>(
        `/api/v1/ci-sources/${id}/repos/${encodeURIComponent(repo)}/prs/${pr}`,
      )
    ).data,
  listDriftRuns: async (): Promise<DriftRun[]> =>
    (await apiClient.get<{ runs: DriftRun[] }>('/api/v1/drift/runs')).data.runs,
  createDriftRun: async (input: CreateDriftRunInput): Promise<DriftRun> =>
    (await apiClient.post<DriftRun>('/api/v1/drift/runs', input)).data,
  listDriftRecords: async (statuses?: string[]): Promise<DriftRecordsResponse> =>
    (
      await apiClient.get<DriftRecordsResponse>('/api/v1/drift/records', {
        params: statuses?.length ? { status: statuses.join(',') } : undefined,
      })
    ).data,
  acknowledgeDriftRecord: async (id: string, note: string): Promise<DriftRecord> =>
    (await apiClient.post<DriftRecord>(`/api/v1/drift/records/${id}/acknowledge`, { note })).data,
  resolveDriftRecord: async (id: string): Promise<DriftRecord> =>
    (await apiClient.post<DriftRecord>(`/api/v1/drift/records/${id}/resolve`)).data,

  // Schedules
  listSchedules: async (): Promise<Schedule[]> =>
    (await apiClient.get<{ schedules: Schedule[] }>('/api/v1/schedules')).data.schedules,
  createSchedule: async (input: ScheduleInput): Promise<Schedule> =>
    (await apiClient.post<Schedule>('/api/v1/schedules', input)).data,
  updateSchedule: async (id: string, input: ScheduleInput): Promise<Schedule> =>
    (await apiClient.put<Schedule>(`/api/v1/schedules/${id}`, input)).data,
  deleteSchedule: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/schedules/${id}`)
  },
  runSchedule: async (id: string): Promise<Schedule> =>
    (await apiClient.post<Schedule>(`/api/v1/schedules/${id}/run`)).data,

  // API keys (self-service; admins see all)
  listAPIKeys: async (): Promise<APIKey[]> =>
    (await apiClient.get<{ keys: APIKey[] }>('/api/v1/apikeys')).data.keys,
  createAPIKey: async (input: APIKeyInput): Promise<CreateAPIKeyResponse> =>
    (await apiClient.post<CreateAPIKeyResponse>('/api/v1/apikeys', input)).data,
  updateAPIKey: async (id: string, input: APIKeyInput): Promise<APIKey> =>
    (await apiClient.put<APIKey>(`/api/v1/apikeys/${id}`, input)).data,
  deleteAPIKey: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/apikeys/${id}`)
  },
  rotateAPIKey: async (id: string, gracePeriodHours: number): Promise<CreateAPIKeyResponse> =>
    (
      await apiClient.post<CreateAPIKeyResponse>(`/api/v1/apikeys/${id}/rotate`, {
        grace_period_hours: gracePeriodHours,
      })
    ).data,

  // Notification channels (admin)
  listNotificationChannels: async (): Promise<NotificationChannel[]> =>
    (await apiClient.get<{ channels: NotificationChannel[] }>('/api/v1/notifications/channels')).data.channels,
  createNotificationChannel: async (input: NotificationChannelInput): Promise<NotificationChannel> =>
    (await apiClient.post<NotificationChannel>('/api/v1/notifications/channels', input)).data,
  updateNotificationChannel: async (id: string, input: NotificationChannelInput): Promise<NotificationChannel> =>
    (await apiClient.put<NotificationChannel>(`/api/v1/notifications/channels/${id}`, input)).data,
  deleteNotificationChannel: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/notifications/channels/${id}`)
  },
  testNotificationChannel: async (id: string): Promise<{ status: string }> =>
    (await apiClient.post<{ status: string }>(`/api/v1/notifications/channels/${id}/test`)).data,
  getDriftWorkflow: async (provider: string): Promise<string> =>
    (
      await apiClient.get<string>('/api/v1/drift/workflow', {
        params: { provider },
        responseType: 'text',
        transformResponse: (d) => d as string,
      })
    ).data,

  // Version lab (Phase 4)
  listHealthRuns: async (): Promise<HealthRun[]> =>
    (await apiClient.get<{ runs: HealthRun[] }>('/api/v1/health-lab/runs')).data.runs,
  createHealthRun: async (input: CreateHealthRunInput): Promise<HealthRun> =>
    (await apiClient.post<HealthRun>('/api/v1/health-lab/runs', input)).data,
  getHealthWorkflow: async (provider: string): Promise<string> =>
    (
      await apiClient.get<string>('/api/v1/health-lab/workflow', {
        params: { provider },
        responseType: 'text',
        transformResponse: (d) => d as string,
      })
    ).data,
}
