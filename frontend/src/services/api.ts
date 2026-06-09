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
function readCookie(name: string): string | null {
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

export interface ProvidersInfo {
  providers: { type: string; name: string }[]
  dev_mode: boolean
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

export interface ResourceSummary {
  module: string
  mode: string
  type: string
  name: string
  provider: string
  instances: number
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

  // Auth
  getProviders: async (): Promise<ProvidersInfo> => (await apiClient.get<ProvidersInfo>('/api/v1/auth/providers')).data,
  getCurrentUser: async (): Promise<MeResponse> => (await apiClient.get<MeResponse>('/api/v1/auth/me')).data,
  refreshToken: async (): Promise<{ expires_in: number }> =>
    (await apiClient.post<{ expires_in: number }>('/api/v1/auth/refresh')).data,
  devLogin: async (): Promise<{ expires_in: number }> =>
    (await apiClient.post<{ expires_in: number }>('/api/v1/dev/login')).data,
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
  listDriftRuns: async (): Promise<DriftRun[]> =>
    (await apiClient.get<{ runs: DriftRun[] }>('/api/v1/drift/runs')).data.runs,
  createDriftRun: async (input: CreateDriftRunInput): Promise<DriftRun> =>
    (await apiClient.post<DriftRun>('/api/v1/drift/runs', input)).data,
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
