import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { api, apiClient, readCookie } from './api'
import { SCOPES_KEY, USER_KEY } from '../utils/authStorage'

// Spy on the shared axios instance rather than mocking the axios module — the
// api object is a flat map of thin wrappers over apiClient, so asserting the
// (method, url, body, config) tuple per call covers the contract.
let get: MockInstance
let post: MockInstance
let put: MockInstance
let del: MockInstance

function ok<T>(data: T, headers: Record<string, string> = {}) {
  return Promise.resolve({ data, headers })
}

beforeEach(() => {
  get = vi.spyOn(apiClient, 'get')
  post = vi.spyOn(apiClient, 'post')
  put = vi.spyOn(apiClient, 'put')
  del = vi.spyOn(apiClient, 'delete')
})

afterEach(() => {
  vi.restoreAllMocks()
  document.cookie = 'tsm_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
})

describe('readCookie', () => {
  it('reads a cookie by name', () => {
    document.cookie = 'tsm_csrf=abc123'
    expect(readCookie('tsm_csrf')).toBe('abc123')
  })

  it('decodes URI-encoded values', () => {
    document.cookie = `tsm_csrf=${encodeURIComponent('a+b/c=')}`
    expect(readCookie('tsm_csrf')).toBe('a+b/c=')
  })

  it('returns null when absent', () => {
    expect(readCookie('missing_cookie')).toBeNull()
  })
})

describe('interceptors', () => {
  type Handlers<T> = { handlers: T[] }
  const requestHandlers = () =>
    (apiClient.interceptors.request as unknown as Handlers<{
      fulfilled: (c: { method?: string; headers?: Record<string, string> }) => { headers?: Record<string, string> }
    }>).handlers
  const responseHandlers = () =>
    (apiClient.interceptors.response as unknown as Handlers<{
      rejected: (e: unknown) => Promise<unknown>
    }>).handlers

  it('attaches X-CSRF-Token on mutating requests when the cookie is set', () => {
    document.cookie = 'tsm_csrf=token-1'
    for (const method of ['post', 'put', 'patch', 'delete']) {
      const out = requestHandlers()[0].fulfilled({ method, headers: {} })
      expect(out.headers?.['X-CSRF-Token']).toBe('token-1')
    }
  })

  it('does not attach the header on GET or without the cookie', () => {
    document.cookie = 'tsm_csrf=token-1'
    const getOut = requestHandlers()[0].fulfilled({ method: 'get', headers: {} })
    expect(getOut.headers?.['X-CSRF-Token']).toBeUndefined()

    document.cookie = 'tsm_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    const postOut = requestHandlers()[0].fulfilled({ method: 'post', headers: {} })
    expect(postOut.headers?.['X-CSRF-Token']).toBeUndefined()
  })

  it('clears cached auth state on 401 and rejects', async () => {
    localStorage.setItem(USER_KEY, 'cached')
    localStorage.setItem(SCOPES_KEY, '["state:read"]')
    const err = { response: { status: 401 } }
    await expect(responseHandlers()[0].rejected(err)).rejects.toBe(err)
    expect(localStorage.getItem(USER_KEY)).toBeNull()
    expect(localStorage.getItem(SCOPES_KEY)).toBeNull()
  })

  it('leaves auth state alone on other errors', async () => {
    localStorage.setItem(USER_KEY, 'cached')
    const err = { response: { status: 500 } }
    await expect(responseHandlers()[0].rejected(err)).rejects.toBe(err)
    expect(localStorage.getItem(USER_KEY)).toBe('cached')
    localStorage.removeItem(USER_KEY)
  })
})

describe('system + dashboard', () => {
  it('getVersion', async () => {
    get.mockReturnValue(ok({ name: 'tsm', version: '1.0.0', build_date: 'now' }))
    const v = await api.getVersion()
    expect(get).toHaveBeenCalledWith('/api/v1/version')
    expect(v.version).toBe('1.0.0')
  })

  it('getHealth', async () => {
    get.mockReturnValue(ok({ status: 'ok' }))
    expect((await api.getHealth()).status).toBe('ok')
    expect(get).toHaveBeenCalledWith('/health')
  })

  it('getDashboardOverview default + forced refresh', async () => {
    get.mockReturnValue(ok({ sources: 1 }))
    await api.getDashboardOverview()
    expect(get).toHaveBeenCalledWith('/api/v1/dashboard/overview', { params: undefined })
    await api.getDashboardOverview(true)
    expect(get).toHaveBeenCalledWith('/api/v1/dashboard/overview', { params: { refresh: 'true' } })
  })
})

describe('admin identity', () => {
  it('getAdminStats / listAdminUsers / listAuditLogs pass params through', async () => {
    get.mockReturnValue(ok({ users: [], total: 0 }))
    await api.getAdminStats()
    expect(get).toHaveBeenCalledWith('/api/v1/admin/stats')
    await api.listAdminUsers({ page: 2, q: 'alice' })
    expect(get).toHaveBeenCalledWith('/api/v1/admin/users', { params: { page: 2, q: 'alice' } })
    await api.listAuditLogs({ action: 'user.create' })
    expect(get).toHaveBeenCalledWith('/api/v1/admin/audit-logs', { params: { action: 'user.create' } })
  })

  it('user CRUD hits the expected endpoints', async () => {
    post.mockReturnValue(ok({ id: 'u1' }))
    put.mockReturnValue(ok({ id: 'u1' }))
    del.mockReturnValue(ok(undefined))
    await api.createAdminUser({ email: 'a@b.c', name: 'A' })
    expect(post).toHaveBeenCalledWith('/api/v1/admin/users', { email: 'a@b.c', name: 'A' })
    await api.updateAdminUser('u1', { name: 'B' })
    expect(put).toHaveBeenCalledWith('/api/v1/admin/users/u1', { name: 'B' })
    await api.deleteAdminUser('u1')
    expect(del).toHaveBeenCalledWith('/api/v1/admin/users/u1')
  })

  it('membership + GDPR endpoints unwrap their envelopes', async () => {
    get.mockReturnValue(ok({ memberships: [{ organization_id: 'o1' }] }))
    const ms = await api.getAdminUserMemberships('u1')
    expect(get).toHaveBeenCalledWith('/api/v1/admin/users/u1/memberships')
    expect(ms).toHaveLength(1)

    const blob = new Blob(['{}'])
    get.mockReturnValue(ok(blob))
    const exp = await api.exportAdminUserData('u1')
    expect(get).toHaveBeenCalledWith('/api/v1/admin/users/u1/export', { responseType: 'blob' })
    expect(exp.filename).toBe('user-data-u1.json')

    post.mockReturnValue(ok({ message: 'erased' }))
    expect((await api.eraseAdminUser('u1')).message).toBe('erased')
    expect(post).toHaveBeenCalledWith('/api/v1/admin/users/u1/erase')
  })

  it('organization CRUD + membership endpoints', async () => {
    get.mockReturnValue(ok({ organizations: [{ id: 'o1' }] }))
    expect(await api.listAdminOrganizations()).toHaveLength(1)
    expect(get).toHaveBeenCalledWith('/api/v1/admin/organizations')

    post.mockReturnValue(ok({ id: 'o1' }))
    await api.createAdminOrganization({ name: 'n', display_name: 'N' })
    expect(post).toHaveBeenCalledWith('/api/v1/admin/organizations', { name: 'n', display_name: 'N' })

    put.mockReturnValue(ok({ id: 'o1' }))
    await api.updateAdminOrganization('o1', { display_name: 'M' })
    expect(put).toHaveBeenCalledWith('/api/v1/admin/organizations/o1', { display_name: 'M' })

    del.mockReturnValue(ok(undefined))
    await api.deleteAdminOrganization('o1')
    expect(del).toHaveBeenCalledWith('/api/v1/admin/organizations/o1')

    get.mockReturnValue(ok({ members: [] }))
    await api.listAdminOrgMembers('o1')
    expect(get).toHaveBeenCalledWith('/api/v1/admin/organizations/o1/members')

    post.mockReturnValue(ok(undefined))
    await api.addAdminOrgMember('o1', { user_id: 'u1' })
    expect(post).toHaveBeenCalledWith('/api/v1/admin/organizations/o1/members', { user_id: 'u1' })

    put.mockReturnValue(ok(undefined))
    await api.updateAdminOrgMember('o1', 'u1', { role_template_id: 'r1' })
    expect(put).toHaveBeenCalledWith('/api/v1/admin/organizations/o1/members/u1', { role_template_id: 'r1' })

    del.mockReturnValue(ok(undefined))
    await api.removeAdminOrgMember('o1', 'u1')
    expect(del).toHaveBeenCalledWith('/api/v1/admin/organizations/o1/members/u1')
  })

  it('roles + SSO/OIDC/mTLS reads', async () => {
    get.mockReturnValue(ok({ roles: [{ id: 'r1' }] }))
    expect(await api.listAdminRoles()).toHaveLength(1)
    expect(get).toHaveBeenCalledWith('/api/v1/admin/roles')

    get.mockReturnValue(ok({ oidc: {} }))
    await api.getSSOConfig()
    expect(get).toHaveBeenCalledWith('/api/v1/admin/sso')
    await api.getAdminOIDCConfig()
    expect(get).toHaveBeenCalledWith('/api/v1/admin/oidc/config')
    await api.getIdentityGroupMappings()
    expect(get).toHaveBeenCalledWith('/api/v1/admin/identity-group-mappings')
    await api.getMTLSConfig()
    expect(get).toHaveBeenCalledWith('/api/v1/admin/mtls')

    put.mockReturnValue(ok({}))
    const mapping = { group_claim_name: 'groups', default_role: 'viewer', group_mappings: [] }
    await api.updateOIDCGroupMapping(mapping)
    expect(put).toHaveBeenCalledWith('/api/v1/admin/oidc/group-mapping', mapping)
  })
})

describe('auth', () => {
  it('reads providers and the current user', async () => {
    get.mockReturnValue(ok({ providers: [], dev_mode: true }))
    await api.getProviders()
    expect(get).toHaveBeenCalledWith('/api/v1/auth/providers')
    await api.getCurrentUser()
    expect(get).toHaveBeenCalledWith('/api/v1/auth/me')
  })

  it('refresh, dev login, and LDAP login post to the expected endpoints', async () => {
    post.mockReturnValue(ok({ expires_in: 3600 }))
    expect((await api.refreshToken()).expires_in).toBe(3600)
    expect(post).toHaveBeenCalledWith('/api/v1/auth/refresh')
    await api.devLogin()
    expect(post).toHaveBeenCalledWith('/api/v1/dev/login')
    await api.ldapLogin('alice', 'secret')
    expect(post).toHaveBeenCalledWith('/api/v1/auth/ldap/login', { username: 'alice', password: 'secret' })
  })
})

describe('sources + state read plane', () => {
  it('listSources / createSource / deleteSource', async () => {
    get.mockReturnValue(ok({ sources: [{ id: 's1' }] }))
    expect(await api.listSources()).toHaveLength(1)
    expect(get).toHaveBeenCalledWith('/api/v1/sources')

    post.mockReturnValue(ok({ id: 's1' }))
    const input = { name: 'demo', type: 'local', config: {} }
    await api.createSource(input as Parameters<typeof api.createSource>[0])
    expect(post).toHaveBeenCalledWith('/api/v1/sources', input)

    del.mockReturnValue(ok(undefined))
    await api.deleteSource('s1')
    expect(del).toHaveBeenCalledWith('/api/v1/sources/s1')
  })

  it('state reads pass the key as a query param', async () => {
    get.mockReturnValue(ok({ states: [] }))
    await api.listStates('s1')
    expect(get).toHaveBeenCalledWith('/api/v1/sources/s1/states')

    get.mockReturnValue(ok({ rum: 18 }))
    await api.analyzeState('s1', 'k.tfstate')
    expect(get).toHaveBeenCalledWith('/api/v1/sources/s1/state/analysis', { params: { key: 'k.tfstate' } })

    get.mockReturnValue(ok({ resources: [] }))
    await api.listStateResources('s1', 'k.tfstate')
    expect(get).toHaveBeenCalledWith('/api/v1/sources/s1/state/resources', { params: { key: 'k.tfstate' } })
  })

  it('getRawState requests text without JSON parsing', async () => {
    get.mockReturnValue(ok('{"version":4}'))
    const raw = await api.getRawState('s1', 'k')
    expect(raw).toBe('{"version":4}')
    const [url, config] = get.mock.calls[0]
    expect(url).toBe('/api/v1/sources/s1/state/raw')
    expect(config.responseType).toBe('text')
    expect(config.params).toEqual({ key: 'k' })
  })

  it('analyzeUpload posts raw content as JSON', async () => {
    post.mockReturnValue(ok({ analysis: {}, resources: [] }))
    await api.analyzeUpload('{"version":4}')
    expect(post).toHaveBeenCalledWith('/api/v1/analyze', '{"version":4}', {
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('downloadReport derives the filename from Content-Disposition and clicks a link', async () => {
    const createObjectURL = vi.fn(() => 'blob:fake')
    const revokeObjectURL = vi.fn()
    // Subclass URL (rather than Object.create) so it stays constructable: the
    // anchor's link.click() triggers happy-dom navigation that calls `new URL`
    // on a microtask; a non-constructable stub leaks an unhandled TypeError that
    // fails the run under --coverage.
    vi.stubGlobal('URL', Object.assign(class extends URL { }, { createObjectURL, revokeObjectURL }))

    get.mockReturnValue(ok(new Blob(['x']), { 'content-disposition': 'attachment; filename="report.pdf"' }))
    await api.downloadReport('s1', 'k', 'pdf' as Parameters<typeof api.downloadReport>[2])

    expect(get).toHaveBeenCalledWith('/api/v1/sources/s1/state/report', {
      params: { key: 'k', format: 'pdf' },
      responseType: 'blob',
    })
    expect(createObjectURL).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake')
    vi.unstubAllGlobals()
  })
})

describe('edit + transfer planes', () => {
  it('editState puts raw content with optional force', async () => {
    put.mockReturnValue(ok({ status: 'ok', serial: 2 }))
    await api.editState('s1', 'k', '{}')
    expect(put).toHaveBeenCalledWith('/api/v1/sources/s1/state/raw', '{}', {
      params: { key: 'k' },
      headers: { 'Content-Type': 'application/json' },
    })
    await api.editState('s1', 'k', '{}', true)
    expect(put).toHaveBeenLastCalledWith('/api/v1/sources/s1/state/raw', '{}', {
      params: { key: 'k', force: 'true' },
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('stateOperation posts rm and mv payloads', async () => {
    post.mockReturnValue(ok({ status: 'ok', op: 'rm', backup_id: 'b', serial: 3 }))
    await api.stateOperation('s1', 'k', 'rm', 'aws_instance.web')
    expect(post).toHaveBeenCalledWith(
      '/api/v1/sources/s1/state/operations',
      { op: 'rm', address: 'aws_instance.web' },
      { params: { key: 'k' } },
    )
    await api.stateOperation('s1', 'k', 'mv', 'a.b', 'a.c')
    expect(post).toHaveBeenLastCalledWith(
      '/api/v1/sources/s1/state/operations',
      { op: 'mv', address: 'a.b', to: 'a.c' },
      { params: { key: 'k' } },
    )
  })

  it('backups list/restore', async () => {
    get.mockReturnValue(ok({ backups: [] }))
    await api.listBackups('s1', 'k')
    expect(get).toHaveBeenCalledWith('/api/v1/sources/s1/state/backups', { params: { key: 'k' } })

    post.mockReturnValue(ok(undefined))
    await api.restoreBackup('s1', 'b1', 'k')
    expect(post).toHaveBeenCalledWith('/api/v1/sources/s1/state/backups/b1/restore', null, { params: { key: 'k' } })
  })

  it('backupToSource / migrateToSource carry target + decommission', async () => {
    post.mockReturnValue(ok({ mode: 'backup', status: 'success' }))
    await api.backupToSource('s1', 'k', 's2', 'k2')
    expect(post).toHaveBeenCalledWith(
      '/api/v1/sources/s1/state/backup',
      { target_source_id: 's2', target_key: 'k2' },
      { params: { key: 'k' } },
    )
    await api.migrateToSource('s1', 'k', 's2', 'k2', true)
    expect(post).toHaveBeenLastCalledWith(
      '/api/v1/sources/s1/state/migrate',
      { target_source_id: 's2', target_key: 'k2', decommission: true },
      { params: { key: 'k' } },
    )
  })
})

describe('pipelines + CI sources', () => {
  it('pipeline CRUD', async () => {
    get.mockReturnValue(ok({ pipelines: [] }))
    await api.listPipelines()
    expect(get).toHaveBeenCalledWith('/api/v1/pipelines')

    post.mockReturnValue(ok({ id: 'p1' }))
    await api.createPipeline({ name: 'n' } as Parameters<typeof api.createPipeline>[0])
    expect(post).toHaveBeenCalledWith('/api/v1/pipelines', { name: 'n' })

    del.mockReturnValue(ok(undefined))
    await api.deletePipeline('p1')
    expect(del).toHaveBeenCalledWith('/api/v1/pipelines/p1')
  })

  it('CI source CRUD + discovery URL-encodes repo identifiers', async () => {
    get.mockReturnValue(ok({ ci_sources: [] }))
    await api.listCISources()
    expect(get).toHaveBeenCalledWith('/api/v1/ci-sources')

    post.mockReturnValue(ok({ id: 'c1' }))
    await api.createCISource({ name: 'n', provider: 'github', organization: 'o', token: 't' })
    expect(post).toHaveBeenCalledWith('/api/v1/ci-sources', { name: 'n', provider: 'github', organization: 'o', token: 't' })

    del.mockReturnValue(ok(undefined))
    await api.deleteCISource('c1')
    expect(del).toHaveBeenCalledWith('/api/v1/ci-sources/c1')

    get.mockReturnValue(ok({ pipelines: [] }))
    await api.listCISourcePipelines('c1')
    expect(get).toHaveBeenCalledWith('/api/v1/ci-sources/c1/pipelines')

    get.mockReturnValue(ok({ repos: [] }))
    await api.listCISourceRepos('c1')
    expect(get).toHaveBeenCalledWith('/api/v1/ci-sources/c1/repos')

    get.mockReturnValue(ok({ workflows: [] }))
    await api.listCISourceWorkflows('c1', 'org/repo name')
    expect(get).toHaveBeenCalledWith('/api/v1/ci-sources/c1/repos/org%2Frepo%20name/workflows')

    get.mockReturnValue(ok({ service_connections: [] }))
    await api.listCISourceServiceConnections('c1')
    expect(get).toHaveBeenCalledWith('/api/v1/ci-sources/c1/service-connections')

    post.mockReturnValue(ok({ pipeline: { id: 9 } }))
    await api.createCISourcePipeline('c1', 'repo/id', { name: 'TSM Drift' })
    expect(post).toHaveBeenCalledWith('/api/v1/ci-sources/c1/repos/repo%2Fid/pipelines', { name: 'TSM Drift' })
  })

  it('workflow setup, PR state, and callback preflight', async () => {
    post.mockReturnValue(ok({ status: 'pr_opened' }))
    const files = [{ kind: 'drift' as const, content: 'yaml' }]
    await api.setupCISourceWorkflow('c1', 'org/repo', files)
    expect(post).toHaveBeenCalledWith('/api/v1/ci-sources/c1/repos/org%2Frepo/workflow-setup', { files })

    get.mockReturnValue(ok({ state: 'merged' }))
    expect((await api.getCISourcePRState('c1', 'org/repo', 42)).state).toBe('merged')
    expect(get).toHaveBeenCalledWith('/api/v1/ci-sources/c1/repos/org%2Frepo/prs/42')

    get.mockReturnValue(ok({ likely_unreachable: false }))
    await api.getCallbackPreflight()
    expect(get).toHaveBeenCalledWith('/api/v1/pipelines/callback-preflight')
  })

  it('drift records, state history, and API keys', async () => {
    get.mockReturnValue(ok({ records: [], counts: {} }))
    await api.listDriftRecords(['open', 'acknowledged'])
    expect(get).toHaveBeenCalledWith('/api/v1/drift/records', { params: { status: 'open,acknowledged' } })
    await api.listDriftRecords()
    expect(get).toHaveBeenCalledWith('/api/v1/drift/records', { params: undefined })

    post.mockReturnValue(ok({ id: 'rec1' }))
    await api.acknowledgeDriftRecord('rec1', 'expected')
    expect(post).toHaveBeenCalledWith('/api/v1/drift/records/rec1/acknowledge', { note: 'expected' })
    await api.resolveDriftRecord('rec1')
    expect(post).toHaveBeenCalledWith('/api/v1/drift/records/rec1/resolve')

    get.mockReturnValue(ok({ history: [] }))
    await api.getStateHistory('s1', 'app.tfstate')
    expect(get).toHaveBeenCalledWith('/api/v1/sources/s1/state/history', { params: { key: 'app.tfstate' } })

    get.mockReturnValue(ok({ keys: [] }))
    await api.listAPIKeys()
    expect(get).toHaveBeenCalledWith('/api/v1/apikeys')
    post.mockReturnValue(ok({ key: 'tsm_x', api_key: { id: 'k1' } }))
    await api.createAPIKey({ name: 'k', scopes: ['state:read'] })
    expect(post).toHaveBeenCalledWith('/api/v1/apikeys', { name: 'k', scopes: ['state:read'] })
    await api.rotateAPIKey('k1', 24)
    expect(post).toHaveBeenCalledWith('/api/v1/apikeys/k1/rotate', { grace_period_hours: 24 })
    put.mockReturnValue(ok({ id: 'k1' }))
    await api.updateAPIKey('k1', { name: 'r', scopes: ['state:read'] })
    expect(put).toHaveBeenCalledWith('/api/v1/apikeys/k1', { name: 'r', scopes: ['state:read'] })
    del.mockReturnValue(ok(undefined))
    await api.deleteAPIKey('k1')
    expect(del).toHaveBeenCalledWith('/api/v1/apikeys/k1')
  })

  it('drift + health runs and workflow templates', async () => {
    get.mockReturnValue(ok({ runs: [] }))
    await api.listDriftRuns()
    expect(get).toHaveBeenCalledWith('/api/v1/drift/runs')
    await api.listHealthRuns()
    expect(get).toHaveBeenCalledWith('/api/v1/health-lab/runs')

    post.mockReturnValue(ok({ id: 'r1' }))
    await api.createDriftRun({ pipeline_connection_id: 'p1' } as Parameters<typeof api.createDriftRun>[0])
    expect(post).toHaveBeenCalledWith('/api/v1/drift/runs', { pipeline_connection_id: 'p1' })
    await api.createHealthRun({ pipeline_connection_id: 'p1' } as Parameters<typeof api.createHealthRun>[0])
    expect(post).toHaveBeenCalledWith('/api/v1/health-lab/runs', { pipeline_connection_id: 'p1' })

    get.mockReturnValue(ok('yaml: content'))
    expect(await api.getDriftWorkflow('azuredevops')).toBe('yaml: content')
    let [url, config] = get.mock.calls.slice(-1)[0] as [string, { params: unknown; responseType: string }]
    expect(url).toBe('/api/v1/drift/workflow')
    expect(config.params).toEqual({ provider: 'azuredevops', profile: 'default' })
    expect(config.responseType).toBe('text')

    expect(await api.getHealthWorkflow('github')).toBe('yaml: content')
      ;[url, config] = get.mock.calls.slice(-1)[0] as [string, { params: unknown; responseType: string }]
    expect(url).toBe('/api/v1/health-lab/workflow')
    expect(config.params).toEqual({ provider: 'github', profile: 'default' })
  })

  it('CI workflow template CRUD hits the expected endpoints', async () => {
    get.mockReturnValue(ok({ templates: [{ id: 't1' }] }))
    expect(await api.listCITemplates()).toEqual([{ id: 't1' }])
    expect(get).toHaveBeenCalledWith('/api/v1/admin/ci/templates')

    post.mockReturnValue(ok({ id: 't2' }))
    await api.createCITemplate({ provider: 'azure_devops', kind: 'drift', profile: 'p', name: 'n', content: 'c' })
    expect(post).toHaveBeenCalledWith('/api/v1/admin/ci/templates', {
      provider: 'azure_devops',
      kind: 'drift',
      profile: 'p',
      name: 'n',
      content: 'c',
    })

    put.mockReturnValue(ok({ id: 't2' }))
    await api.updateCITemplate('t2', { name: 'n2', description: 'd', content: 'c2' })
    expect(put).toHaveBeenCalledWith('/api/v1/admin/ci/templates/t2', { name: 'n2', description: 'd', content: 'c2' })

    del.mockReturnValue(ok({}))
    await api.deleteCITemplate('t2')
    expect(del).toHaveBeenCalledWith('/api/v1/admin/ci/templates/t2')
  })

  it('report states query + multi-format export', async () => {
    get.mockReturnValue(ok({ total: 0, truncated: false, summary: {}, states: [] }))
    await api.listReportStates({ q: 'prod', sourceIds: ['a', 'b'] })
    const listCall = get.mock.calls.slice(-1)[0] as [string, { params: URLSearchParams }]
    expect(listCall[0]).toBe('/api/v1/reports/states')
    expect(listCall[1].params.get('q')).toBe('prod')
    expect(listCall[1].params.getAll('source_id')).toEqual(['a', 'b'])

    const createObjectURL = vi.fn(() => 'blob:fake')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL, revokeObjectURL }))
    get.mockReturnValue(ok(new Blob(['x']), { 'content-disposition': 'attachment; filename="states.csv"' }))
    await api.downloadStatesReport({ q: 'p' }, 'csv')
    const dlCall = get.mock.calls.slice(-1)[0] as [string, { params: URLSearchParams; responseType: string }]
    expect(dlCall[0]).toBe('/api/v1/reports/states/export')
    expect(dlCall[1].params.get('format')).toBe('csv')
    expect(dlCall[1].responseType).toBe('blob')
    expect(createObjectURL).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake')
    vi.unstubAllGlobals()
  })
})

describe('schedules + notifications', () => {
  it('schedule CRUD + run', async () => {
    get.mockReturnValue(ok({ schedules: [] }))
    await api.listSchedules()
    expect(get).toHaveBeenCalledWith('/api/v1/schedules')

    post.mockReturnValue(ok({ id: 'sc1' }))
    await api.createSchedule({ name: 'n' } as Parameters<typeof api.createSchedule>[0])
    expect(post).toHaveBeenCalledWith('/api/v1/schedules', { name: 'n' })

    put.mockReturnValue(ok({ id: 'sc1' }))
    await api.updateSchedule('sc1', { name: 'm' } as Parameters<typeof api.updateSchedule>[1])
    expect(put).toHaveBeenCalledWith('/api/v1/schedules/sc1', { name: 'm' })

    del.mockReturnValue(ok(undefined))
    await api.deleteSchedule('sc1')
    expect(del).toHaveBeenCalledWith('/api/v1/schedules/sc1')

    post.mockReturnValue(ok({ id: 'sc1' }))
    await api.runSchedule('sc1')
    expect(post).toHaveBeenCalledWith('/api/v1/schedules/sc1/run')
  })

  it('notification channel CRUD + test', async () => {
    get.mockReturnValue(ok({ channels: [] }))
    await api.listNotificationChannels()
    expect(get).toHaveBeenCalledWith('/api/v1/notifications/channels')

    post.mockReturnValue(ok({ id: 'n1' }))
    await api.createNotificationChannel({ name: 'n' } as Parameters<typeof api.createNotificationChannel>[0])
    expect(post).toHaveBeenCalledWith('/api/v1/notifications/channels', { name: 'n' })

    put.mockReturnValue(ok({ id: 'n1' }))
    await api.updateNotificationChannel('n1', { name: 'm' } as Parameters<typeof api.updateNotificationChannel>[1])
    expect(put).toHaveBeenCalledWith('/api/v1/notifications/channels/n1', { name: 'm' })

    del.mockReturnValue(ok(undefined))
    await api.deleteNotificationChannel('n1')
    expect(del).toHaveBeenCalledWith('/api/v1/notifications/channels/n1')

    post.mockReturnValue(ok({ status: 'sent' }))
    expect((await api.testNotificationChannel('n1')).status).toBe('sent')
    expect(post).toHaveBeenCalledWith('/api/v1/notifications/channels/n1/test')
  })
})
