// React Query key factory. Mirrors the registry frontend's pattern so query keys
// stay centralised and invalidation is predictable as domains are added.
export const queryKeys = {
  system: {
    version: ['system', 'version'] as const,
    health: ['system', 'health'] as const,
  },
  dashboard: {
    overview: () => ['dashboard', 'overview'] as const,
    overviewLanding: () => ['dashboard', 'overview', 'landing'] as const,
    statesByVersion: (version: string, op: string) =>
      ['dashboard', 'states-by-version', version, op] as const,
  },
  reports: {
    states: (filterKey: string) => ['reports', 'states', filterKey] as const,
  },
  admin: {
    stats: () => ['admin', 'stats'] as const,
    usersAll: ['admin', 'users'] as const,
    users: (params?: Record<string, unknown>) =>
      params ? (['admin', 'users', params] as const) : (['admin', 'users'] as const),
    organizations: () => ['admin', 'organizations'] as const,
    orgMembers: (orgId: string) => ['admin', 'organizations', orgId, 'members'] as const,
    roles: () => ['admin', 'roles'] as const,
    platformAdmins: () => ['admin', 'platform-admins'] as const,
    auditLogs: (params?: Record<string, unknown>) =>
      params ? (['admin', 'audit-logs', params] as const) : (['admin', 'audit-logs'] as const),
    sso: () => ['admin', 'sso'] as const,
    oidcConfig: () => ['admin', 'oidc', 'config'] as const,
    identityMappings: () => ['admin', 'identity-group-mappings'] as const,
    mtls: () => ['admin', 'mtls'] as const,
    notifications: () => ['admin', 'notifications'] as const,
    notificationsSMTP: () => ['admin', 'notifications', 'smtp-config'] as const,
    notificationsAPIKeyExpiry: () => ['admin', 'notifications', 'api-key-expiry'] as const,
    ciTemplates: () => ['admin', 'ci-templates'] as const,
    ciTemplate: (id: string) => ['admin', 'ci-templates', id] as const,
  },
  sources: {
    all: ['sources'] as const,
    list: () => ['sources', 'list'] as const,
    states: (id: string) => ['sources', id, 'states'] as const,
    analysis: (id: string, key: string) => ['sources', id, 'analysis', key] as const,
    resources: (id: string, key: string) => ['sources', id, 'resources', key] as const,
    outputs: (id: string, key: string) => ['sources', id, 'outputs', key] as const,
    raw: (id: string, key: string) => ['sources', id, 'raw', key] as const,
    backups: (id: string, key: string) => ['sources', id, 'backups', key] as const,
    history: (id: string, key: string) => ['sources', id, 'history', key] as const,
    modules: (id: string, key: string) => ['sources', id, 'modules', key] as const,
    modulesFreshness: (id: string, key: string) =>
      ['sources', id, 'modules', 'freshness', key] as const,
    locks: (id: string) => ['sources', id, 'locks'] as const,
    backupContent: (id: string, backupId: string) => ['sources', id, 'backup', backupId, 'content'] as const,
    backupDiff: (id: string, backupId: string) => ['sources', id, 'backup', backupId, 'diff'] as const,
    editDiff: (id: string, key: string) => ['sources', id, 'edit-diff', key] as const,
  },
  pipelines: {
    all: ['pipelines'] as const,
    list: () => ['pipelines', 'list'] as const,
  },
  ciSources: {
    all: ['ci-sources'] as const,
    list: () => ['ci-sources', 'list'] as const,
    pipelines: (id: string) => ['ci-sources', id, 'pipelines'] as const,
    repos: (id: string) => ['ci-sources', id, 'repos'] as const,
    workflows: (id: string, repo: string) => ['ci-sources', id, 'repos', repo, 'workflows'] as const,
    serviceConnections: (id: string) => ['ci-sources', id, 'service-connections'] as const,
    pr: (id: string, prId: number) => ['ci-sources', id, 'pr', prId] as const,
  },
  callbackPreflight: () => ['pipelines', 'callback-preflight'] as const,
  drift: {
    all: ['drift'] as const,
    runs: (page = 0, status = '', batchId = '') => ['drift', 'runs', page, status, batchId] as const,
    records: (params?: Record<string, unknown>) => ['drift', 'records', params ?? {}] as const,
    workflow: (provider: string, variant?: string) =>
      variant === undefined
        ? (['drift', 'workflow', provider] as const)
        : (['drift', 'workflow', provider, variant] as const),
    coverage: (sourceId: string) => ['drift', 'coverage', sourceId] as const,
    summary: () => ['drift', 'summary'] as const,
  },
  apiKeys: {
    all: ['apiKeys'] as const,
    list: () => ['apiKeys', 'list'] as const,
  },
  schedules: {
    all: ['schedules'] as const,
    list: () => ['schedules', 'list'] as const,
  },
  health: {
    all: ['health'] as const,
    runs: (page = 0, status = '') => ['health', 'runs', page, status] as const,
    workflow: (provider: string, variant?: string) =>
      variant === undefined
        ? (['health', 'workflow', provider] as const)
        : (['health', 'workflow', provider, variant] as const),
  },
  ui: {
    theme: () => ['ui', 'theme'] as const,
  },
  suite: {
    uiConfig: () => ['suite', 'ui-config'] as const,
  },
}
