import axios from 'axios'
import { clearAuthStorage } from '../utils/authStorage'
import type { MeResponse } from '../types/auth'

/**
 * Runtime whitelabel theme config from the backend. All fields are optional so the
 * frontend gracefully falls back to built-in defaults when the endpoint is absent.
 */
export interface UIThemeConfig {
  product_name?: string
  primary_color?: string
  secondary_color_light?: string
  secondary_color_dark?: string
  logo_url?: string
  favicon_url?: string
  login_hero_url?: string
}

// Same-origin in dev (Vite proxies /api and /health to the backend) and in
// production (nginx proxies the same paths). withCredentials so the HttpOnly auth
// cookie is sent automatically. Sessions are cookie-only — the JWT is never read
// by JS, so there is no bearer token to attach.

/**
 * Default per-request ceiling. Without it a hung backend (or an external
 * state/CI backend it proxies to) leaves the request pending indefinitely — the
 * mutation's isPending stays true and the disabled-while-pending submit button
 * never recovers short of a page reload (#216). A finite timeout surfaces a
 * clear, recoverable error instead.
 */
export const DEFAULT_TIMEOUT_MS = 30_000

/**
 * Longer ceiling for operations that legitimately run long: reading/writing large
 * state blobs, transfers/migrations that proxy a full state between remote
 * backends, CI discovery/verification that reaches external providers, and
 * streamed exports. The backend itself caps /sources at 5 minutes, so this sits
 * at that ceiling rather than cutting a big-but-healthy operation short.
 */
export const HEAVY_TIMEOUT_MS = 5 * 60_000

// Path segments of the heavy operations above. Matching is by URL so it is
// applied in one place (the request interceptor) rather than per call site; a
// generous ceiling on an occasional fast match is harmless — it only bounds a
// genuine hang.
const HEAVY_OP_URL = /\/(state|analyze|reports|export|verify|discover|migrate|backup)(\/|$)/

/** The heavy ceiling when url is a long-running operation, else undefined (the default applies). */
export function heavyTimeoutForUrl(url: string | undefined): number | undefined {
  return url && HEAVY_OP_URL.test(url) ? HEAVY_TIMEOUT_MS : undefined
}

export const apiClient = axios.create({
  baseURL: '',
  timeout: DEFAULT_TIMEOUT_MS,
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
  // Grant the longer ceiling to heavy operations (large state data, transfers,
  // CI discovery, streamed exports); everything else keeps the default (#216).
  const heavy = heavyTimeoutForUrl(config.url)
  if (heavy) config.timeout = heavy
  return config
})

// Optional hook the auth layer registers to react to a 401. It is responsible
// for gating on whether a session was actually established, so this module can
// call it unconditionally without looping on the anonymous probes (the bootstrap
// /me call, the login page). See SessionExpiryBridge in contexts/AuthContext.
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

// On 401, drop any stale local auth state and notify the auth layer. Without the
// notification a 401 that happens AFTER mount (an expired or admin-revoked
// session) left the in-memory auth state authenticated, stranding the SPA in a
// logged-in-looking shell where every query 401s until a manual reload.
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthStorage()
      onUnauthorized?.()
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

/** Comparison operators for the dashboard's click-a-version state drill-down. */
export type VersionFilterOp = 'eq' | 'lt' | 'lte' | 'gt' | 'gte'

/** One state file matching a Terraform-version filter, with enough identity to deep-link into Sources. */
export interface VersionStateRef {
  source_id: string
  source_name: string
  state_key: string
  terraform_version: string
  rum: number
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

export interface TestSourceConfigInput {
  type: string
  config: Record<string, unknown>
  credentials?: Record<string, unknown>
  /** When set with blank credentials, the stored source's credentials are reused
   * (the edit-dialog "blank = keep existing" contract). */
  source_id?: string
}

export interface ResourceSummary {
  module: string
  mode: string
  type: string
  name: string
  provider: string
  instances: number
  // Per-instance index keys (for_each strings / count numbers) so a single
  // instance can be targeted for rm/mv. Omitted for un-indexed singletons.
  instance_keys?: (string | number)[]
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

// ModuleFreshness reports, per captured module, how the locked version compares
// to the latest version the sibling registry publishes. Kept separate from
// StateModule (which stays stable). status drives the freshness badge:
//   up_to_date | behind | constraint_only (no locked version) |
//   no_registry (no active sibling, or a different registry) | unknown.
export interface ModuleFreshness {
  module_source: string
  registry_host: string
  current: string | null
  latest: string | null
  status: 'up_to_date' | 'behind' | 'constraint_only' | 'no_registry' | 'unknown'
}

export type ReportFormat = 'json' | 'md' | 'csv'

/**
 * Filters for the Reports state query and export. Every field is optional and
 * the set is AND-combined server-side; the same filters drive both the live
 * preview and the export so they always agree.
 */
export interface ReportFilters {
  sourceIds?: string[]
  q?: string
  version?: string
  op?: VersionFilterOp
  provider?: string
  resourceType?: string
  rumMin?: number
  rumMax?: number
  managedMin?: number
  managedMax?: number
  dataMin?: number
  dataMax?: number
  totalMin?: number
  totalMax?: number
  sizeMin?: number
  sizeMax?: number
}

/** One analyzed state file in the Reports table (scalar columns + deep-link identity). */
export interface ReportStateRow {
  source_id: string
  source_name: string
  source_type: string
  state_key: string
  terraform_version: string
  serial: number
  size: number
  rum: number
  managed_resources: number
  data_sources: number
  total_resources: number
  analyzed_at: string
}

/** Totals across the full filter match (independent of the preview row cap). */
export interface ReportSummary {
  matched: number
  rum: number
  managed_resources: number
  data_sources: number
  total_resources: number
}

export interface ReportStatesResult {
  total: number
  /** True when more states matched than the preview returned; export for the full set. */
  truncated: boolean
  summary: ReportSummary
  states: ReportStateRow[]
}

export interface Backup {
  id: string
  source_id: string
  state_key: string
  serial: number | null
  created_by: string
  created_at: string
}

// Restore preview: resources restoring a backup would re-create (added), drop
// (removed), or alter (changed) vs the current state. changed is an
// instance-count/key approximation, flagged by approximate_changed.
export interface BackupDiff {
  key: string
  backup_serial: number | null
  current_serial: number | null
  added: ResourceSummary[]
  removed: ResourceSummary[]
  changed: ResourceSummary[]
  approximate_changed: boolean
}

// Edit preview: what saving a draft would add/remove/change vs the current state.
export interface EditDiff {
  key: string
  draft_serial: number | null
  current_serial: number | null
  added: ResourceSummary[]
  removed: ResourceSummary[]
  changed: ResourceSummary[]
  approximate_changed: boolean
}

// An app-level advisory lock currently held on a state key. Age judgement
// (vs the backend's 15-minute stale TTL) is up to the caller.
export interface StateLock {
  id: string
  source_id: string
  state_key: string
  actor: string
  acquired_at: string
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

// Edits an existing connection. The provider is immutable; the token is rotated
// only when a non-empty value is supplied (omit to keep the stored credential).
export interface UpdatePipelineInput {
  name: string
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
  /** 'pat' (personal access token) or 'app' (Entra app for ADO, GitHub App for GitHub). */
  auth_method: string
  has_token: boolean
  tenant_id?: string | null
  client_id?: string | null
  has_client_secret: boolean
  github_app_id?: string | null
  github_installation_id?: string | null
  has_app_private_key: boolean
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

// One changed resource in a drift summary: its address, the plan actions, and
// (optionally) the changed attributes. The runner masks any value terraform
// marked sensitive to "(sensitive)", so no secrets reach TSM.
export interface DriftAttrChange {
  name: string
  before: string | null
  after: string | null
}

export interface DriftSummaryItem {
  address: string
  actions: string[]
  attrs?: DriftAttrChange[]
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
  summary?: DriftSummaryItem[]
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
  summary?: DriftSummaryItem[]
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
  total: number
}

export interface ListDriftRecordsParams {
  statuses?: string[]
  sourceId?: string
  severity?: string
  page?: number
  perPage?: number
  startDate?: string
  endDate?: string
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

// Shared SMTP relay configuration backing every "email" notification channel.
// Mirrors terraform-registry's admin notifications SMTP config shape for parity.
export interface NotificationsSMTPConfig {
  host: string
  port: number
  username: string
  from: string
  use_tls: boolean
  password_configured: boolean
}

export interface NotificationsSMTPConfigInput {
  host: string
  port: number
  username: string
  password: string
  from: string
  use_tls: boolean
}

export interface NotificationsTestEmailRequest {
  recipients: string[]
  subject?: string
}

export interface NotificationsTestEmailResult {
  success: boolean
  message: string
}

// API-key-expiry notification settings. Mirrors terraform-registry's
// equivalent fields (folded into its combined notifications config) for
// parity; here it is a dedicated endpoint.
export interface NotificationsAPIKeyExpiryConfig {
  enabled: boolean
  api_key_expiring: boolean
  api_key_expiry_warning_days: number
  api_key_expiry_check_interval_hours: number
}

export interface NotificationsAPIKeyExpiryConfigInput {
  api_key_expiring: boolean
  api_key_expiry_warning_days: number
  api_key_expiry_check_interval_hours: number
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

/**
 * Serializes Reports filters into query params shared by the preview and export
 * requests. Exported for unit testing the mapping (repeatable source_id, the
 * version/op pairing, and only-set numeric bounds).
 */
export function reportFilterParams(f: ReportFilters): URLSearchParams {
  const p = new URLSearchParams()
  for (const id of f.sourceIds ?? []) p.append('source_id', id)
  if (f.q) p.set('q', f.q)
  if (f.version) {
    p.set('version', f.version)
    if (f.op) p.set('op', f.op)
  }
  if (f.provider) p.set('provider', f.provider)
  if (f.resourceType) p.set('resource_type', f.resourceType)
  const num = (k: string, v?: number) => {
    if (v !== undefined && v !== null && Number.isFinite(v)) p.set(k, String(v))
  }
  num('rum_min', f.rumMin)
  num('rum_max', f.rumMax)
  num('managed_min', f.managedMin)
  num('managed_max', f.managedMax)
  num('data_min', f.dataMin)
  num('data_max', f.dataMax)
  num('total_min', f.totalMin)
  num('total_max', f.totalMax)
  num('size_min', f.sizeMin)
  num('size_max', f.sizeMax)
  return p
}

/**
 * Reconciles the persistent analysis store via the CSRF-protected POST endpoint.
 * Reconciling re-reads state from every selected backend, so it must not ride on
 * a replayable GET. Scopes to the given source ids when provided, else the whole
 * fleet. See #215.
 */
async function reconcileStore(sourceIds?: string[]): Promise<void> {
  const body = sourceIds && sourceIds.length > 0 ? { source_ids: sourceIds } : {}
  await apiClient.post('/api/v1/reconcile', body)
}

export const api = {
  getVersion: async (): Promise<VersionInfo> => (await apiClient.get<VersionInfo>('/api/v1/version')).data,
  getHealth: async (): Promise<HealthInfo> => (await apiClient.get<HealthInfo>('/health')).data,
  // Runtime whitelabel theme; null when the backend hasn't implemented the endpoint.
  getUITheme: async (): Promise<UIThemeConfig | null> => {
    try {
      return (await apiClient.get<UIThemeConfig>('/api/v1/ui/theme')).data
    } catch {
      return null
    }
  },
  // Admin: persist the whitelabel theme. An empty object clears all overrides.
  updateUITheme: async (theme: UIThemeConfig): Promise<UIThemeConfig> =>
    (await apiClient.put<UIThemeConfig>('/api/v1/admin/ui/theme', theme)).data,
  // Reconcile the analysis store (CSRF-protected POST), optionally scoped. #215.
  reconcile: (sourceIds?: string[]): Promise<void> => reconcileStore(sourceIds),
  getDashboardOverview: async (refresh = false): Promise<DashboardOverview> => {
    // A refresh reconciles the store first via the CSRF-safe POST, then reads it;
    // the GET no longer triggers a reconcile (#215).
    if (refresh) await reconcileStore()
    return (await apiClient.get<DashboardOverview>('/api/v1/dashboard/overview')).data
  },
  // State files matching a Terraform version (op: eq default, or lt/lte/gt/gte for a semver range).
  listStatesByVersion: async (version: string, op: VersionFilterOp = 'eq'): Promise<VersionStateRef[]> =>
    (
      await apiClient.get<{ states: VersionStateRef[] }>('/api/v1/dashboard/states-by-version', {
        params: { version, op },
      })
    ).data.states,

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
  // Server-side export: walks every matching page (the list endpoint caps
  // pages at 200 rows), so the extract is complete rather than one page.
  exportAuditLogs: async (format: 'csv' | 'json', filters?: AuditLogFilters): Promise<Blob> =>
    (
      await apiClient.get<Blob>('/api/v1/admin/audit-logs/export', {
        params: { format, ...filters },
        responseType: 'blob',
      })
    ).data,
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
  // Test an UNSAVED source configuration (add/edit dialogs) before persisting.
  testSourceConfig: async (input: TestSourceConfigInput): Promise<SourceTestResult> =>
    (await apiClient.post<SourceTestResult>('/api/v1/sources/test', input)).data,
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
  listStateModuleFreshness: async (id: string, key?: string): Promise<ModuleFreshness[]> =>
    (
      await apiClient.get<{ modules: ModuleFreshness[] }>(`/api/v1/sources/${id}/modules/freshness`, {
        params: key ? { key } : {},
      })
    ).data.modules,
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
  // Downloads the raw .tfstate file itself (not an analysis report) to disk.
  downloadRawState: async (id: string, key: string): Promise<void> => {
    const res = await apiClient.get(`/api/v1/sources/${id}/state/raw`, {
      params: { key },
      responseType: 'blob',
    })
    const disposition = res.headers['content-disposition'] as string | undefined
    const match = disposition?.match(/filename="?([^"]+)"?/)
    // Fall back to the state key's basename, ensuring a .tfstate suffix.
    const base = key.split(/[\\/]/).pop() || 'terraform'
    const fallback = base.endsWith('.tfstate') ? base : `${base}.tfstate`
    const filename = match ? match[1] : fallback
    const url = URL.createObjectURL(res.data as Blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  },
  // Reports: cross-fleet state query (live preview) and multi-format export.
  listReportStates: async (filters: ReportFilters, refresh = false): Promise<ReportStatesResult> => {
    const params = reportFilterParams(filters)
    // A refresh reconciles first (scoped to the selected sources) via the CSRF-safe
    // POST, then reads the store; the GET no longer reconciles (#215).
    if (refresh) await reconcileStore(filters.sourceIds)
    return (await apiClient.get<ReportStatesResult>('/api/v1/reports/states', { params })).data
  },
  downloadStatesReport: async (filters: ReportFilters, format: ReportFormat): Promise<void> => {
    const params = reportFilterParams(filters)
    params.set('format', format)
    const res = await apiClient.get('/api/v1/reports/states/export', { params, responseType: 'blob' })
    const disposition = res.headers['content-disposition'] as string | undefined
    const match = disposition?.match(/filename="?([^"]+)"?/)
    const filename = match ? match[1] : `terraform-state-report.${format}`
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
  // Admin-only: delete the live state object. The backend takes a final
  // recoverable backup first and refuses while the state is locked. purge=true
  // also drops the saved backups (unrecoverable).
  deleteState: async (
    id: string,
    key: string,
    purge = false,
  ): Promise<{ status: string; key: string; purged: boolean; backup_id?: string }> =>
    (
      await apiClient.post(
        `/api/v1/sources/${id}/state/operations`,
        { op: 'delete', key, ...(purge ? { purge: true } : {}) },
        { params: { key } },
      )
    ).data,
  listBackups: async (id: string, key: string): Promise<Backup[]> =>
    (await apiClient.get<{ backups: Backup[] }>(`/api/v1/sources/${id}/state/backups`, { params: { key } })).data
      .backups,
  restoreBackup: async (id: string, backupId: string, key: string): Promise<void> => {
    await apiClient.post(`/api/v1/sources/${id}/state/backups/${backupId}/restore`, null, { params: { key } })
  },
  // The stored backup's full state JSON, returned raw (list responses omit it).
  getBackupContent: async (id: string, backupId: string): Promise<string> =>
    (
      await apiClient.get<string>(`/api/v1/sources/${id}/state/backups/${backupId}`, {
        responseType: 'text',
        transformResponse: [(d) => d], // keep the exact stored bytes, no JSON parse
      })
    ).data,
  // Restore preview: what restoring the backup would add/remove/change vs the
  // current state. "changed" is an instance-count/key approximation.
  getBackupDiff: async (id: string, backupId: string): Promise<BackupDiff> =>
    (await apiClient.get<BackupDiff>(`/api/v1/sources/${id}/state/backups/${backupId}/diff`)).data,
  // Edit preview: what saving `content` (the draft) would add/remove/change vs the
  // current state. Read-only (no lock, no write); "changed" is an approximation. #214.
  getEditDiff: async (id: string, key: string, content: string): Promise<EditDiff> =>
    (
      await apiClient.post<EditDiff>(`/api/v1/sources/${id}/state/diff`, content, {
        params: { key },
        headers: { 'Content-Type': 'application/json' },
      })
    ).data,
  listStateLocks: async (id: string): Promise<StateLock[]> =>
    (await apiClient.get<{ locks: StateLock[] }>(`/api/v1/sources/${id}/state/locks`)).data.locks,
  // Admin-only: release the app-level advisory lock on a key regardless of
  // holder. Native backend locks are unaffected.
  forceUnlock: async (id: string, key: string): Promise<{ released: boolean }> =>
    (await apiClient.delete<{ released: boolean }>(`/api/v1/sources/${id}/state/lock`, { params: { key } })).data,

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
  updatePipeline: async (id: string, input: UpdatePipelineInput): Promise<PipelineConnection> =>
    (await apiClient.put<PipelineConnection>(`/api/v1/pipelines/${id}`, input)).data,
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
    auth_method?: 'pat' | 'app'
    token?: string
    tenant_id?: string
    client_id?: string
    client_secret?: string
    github_app_id?: string
    github_installation_id?: string
    app_private_key?: string
  }): Promise<CISource> => (await apiClient.post<CISource>('/api/v1/ci-sources', input)).data,
  verifyCISource: async (id: string): Promise<{ ok: boolean; error?: string }> =>
    (await apiClient.post<{ ok: boolean; error?: string }>(`/api/v1/ci-sources/${id}/verify`, {})).data,
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
  listDriftRuns: async (
    params?: { limit?: number; offset?: number; status?: string },
  ): Promise<{ runs: DriftRun[]; total: number }> => {
    const q = new URLSearchParams()
    if (params?.limit != null) q.set('limit', String(params.limit))
    if (params?.offset != null) q.set('offset', String(params.offset))
    if (params?.status) q.set('status', params.status)
    const qs = q.toString()
    const data = (await apiClient.get<{ runs: DriftRun[]; total?: number }>(`/api/v1/drift/runs${qs ? `?${qs}` : ''}`))
      .data
    return { runs: data.runs, total: data.total ?? data.runs.length }
  },
  createDriftRun: async (input: CreateDriftRunInput): Promise<DriftRun> =>
    (await apiClient.post<DriftRun>('/api/v1/drift/runs', input)).data,
  listDriftRecords: async (params?: ListDriftRecordsParams): Promise<DriftRecordsResponse> =>
    (
      await apiClient.get<DriftRecordsResponse>('/api/v1/drift/records', {
        params: {
          status: params?.statuses?.length ? params.statuses.join(',') : undefined,
          source_id: params?.sourceId || undefined,
          severity: params?.severity || undefined,
          page: params?.page,
          per_page: params?.perPage,
          start_date: params?.startDate,
          end_date: params?.endDate,
        },
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

  // Shared SMTP relay settings (admin) — backs every "email" channel.
  getNotificationsSMTPConfig: async (): Promise<NotificationsSMTPConfig> =>
    (await apiClient.get<NotificationsSMTPConfig>('/api/v1/notifications/smtp-config')).data,
  saveNotificationsSMTPConfig: async (
    input: NotificationsSMTPConfigInput,
  ): Promise<NotificationsSMTPConfig> =>
    (await apiClient.put<NotificationsSMTPConfig>('/api/v1/notifications/smtp-config', input)).data,
  sendNotificationsTestEmail: async (
    input: NotificationsTestEmailRequest,
  ): Promise<NotificationsTestEmailResult> =>
    (await apiClient.post<NotificationsTestEmailResult>('/api/v1/notifications/test-email', input)).data,
  getAPIKeyExpiryConfig: async (): Promise<NotificationsAPIKeyExpiryConfig> =>
    (await apiClient.get<NotificationsAPIKeyExpiryConfig>('/api/v1/notifications/api-key-expiry')).data,
  saveAPIKeyExpiryConfig: async (
    input: NotificationsAPIKeyExpiryConfigInput,
  ): Promise<NotificationsAPIKeyExpiryConfig> =>
    (await apiClient.put<NotificationsAPIKeyExpiryConfig>('/api/v1/notifications/api-key-expiry', input)).data,
  getDriftWorkflow: async (provider: string, profile = 'default'): Promise<string> =>
    (
      await apiClient.get<string>('/api/v1/drift/workflow', {
        params: { provider, profile },
        responseType: 'text',
        transformResponse: (d) => d as string,
      })
    ).data,

  // Version lab (Phase 4)
  listHealthRuns: async (
    params?: { limit?: number; offset?: number; status?: string },
  ): Promise<{ runs: HealthRun[]; total: number }> => {
    const q = new URLSearchParams()
    if (params?.limit != null) q.set('limit', String(params.limit))
    if (params?.offset != null) q.set('offset', String(params.offset))
    if (params?.status) q.set('status', params.status)
    const qs = q.toString()
    const { data } = await apiClient.get<{ runs: HealthRun[]; total: number }>(
      `/api/v1/health-lab/runs${qs ? `?${qs}` : ''}`,
    )
    return { runs: data.runs, total: data.total ?? data.runs.length }
  },
  createHealthRun: async (input: CreateHealthRunInput): Promise<HealthRun> =>
    (await apiClient.post<HealthRun>('/api/v1/health-lab/runs', input)).data,
  getHealthWorkflow: async (provider: string, profile = 'default'): Promise<string> =>
    (
      await apiClient.get<string>('/api/v1/health-lab/workflow', {
        params: { provider, profile },
        responseType: 'text',
        transformResponse: (d) => d as string,
      })
    ).data,

  // CI workflow templates (admin: operator edit/add/replace of drift/version-lab YAML)
  listCITemplates: async (): Promise<CITemplate[]> =>
    (await apiClient.get<{ templates: CITemplate[] }>('/api/v1/admin/ci/templates')).data.templates,
  createCITemplate: async (input: CITemplateInput): Promise<CITemplate> =>
    (await apiClient.post<CITemplate>('/api/v1/admin/ci/templates', input)).data,
  updateCITemplate: async (id: string, input: CITemplateEdit): Promise<CITemplate> =>
    (await apiClient.put<CITemplate>(`/api/v1/admin/ci/templates/${id}`, input)).data,
  deleteCITemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/ci/templates/${id}`)
  },
}

/** A stored, operator-managed CI workflow template, keyed by (provider, kind, profile). */
export interface CITemplate {
  id: string
  provider: string
  kind: string
  profile: string
  name: string
  description: string
  content: string
  is_builtin: boolean
  created_at: string
  updated_at: string
}

export interface CITemplateInput {
  provider: string
  kind: string
  profile: string
  name: string
  description?: string
  content: string
}

/** The editable fields of a template; the (provider, kind, profile) key is immutable. */
export type CITemplateEdit = Pick<CITemplate, 'name' | 'description' | 'content'>
