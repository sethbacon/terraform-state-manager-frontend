export const queryKeys = {
  dashboard: {
    _def: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard._def, 'stats'] as const,
  },
  users: {
    _def: ['users'] as const,
    list: (params?: { page?: number; perPage?: number; search?: string }) =>
      [...queryKeys.users._def, 'list', params] as const,
    detail: (id: string) => [...queryKeys.users._def, 'detail', id] as const,
    memberships: (userId: string) => [...queryKeys.users._def, 'memberships', userId] as const,
  },
  organizations: {
    _def: ['organizations'] as const,
    list: (params?: { page?: number; perPage?: number; search?: string }) =>
      [...queryKeys.organizations._def, 'list', params] as const,
    detail: (id: string) => [...queryKeys.organizations._def, 'detail', id] as const,
    members: (orgId: string) => [...queryKeys.organizations._def, 'members', orgId] as const,
  },
  apiKeys: {
    _def: ['apiKeys'] as const,
    list: (organizationId?: string) => [...queryKeys.apiKeys._def, 'list', organizationId] as const,
    memberships: (userId: string) => [...queryKeys.apiKeys._def, 'memberships', userId] as const,
  },
  roles: {
    _def: ['roles'] as const,
    list: () => [...queryKeys.roles._def, 'list'] as const,
  },
  auditLogs: {
    _def: ['auditLogs'] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.auditLogs._def, 'list', params] as const,
  },
  oidcConfig: {
    _def: ['oidcConfig'] as const,
    get: () => [...queryKeys.oidcConfig._def, 'get'] as const,
  },
  sources: {
    _def: ['sources'] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.sources._def, 'list', params] as const,
    detail: (id: string) => [...queryKeys.sources._def, 'detail', id] as const,
  },
  analysis: {
    _def: ['analysis'] as const,
    runs: (params?: Record<string, unknown>) =>
      [...queryKeys.analysis._def, 'runs', params] as const,
    detail: (id: string) => [...queryKeys.analysis._def, 'detail', id] as const,
    results: (id: string) => [...queryKeys.analysis._def, 'results', id] as const,
    summary: () => [...queryKeys.analysis._def, 'summary'] as const,
  },
  backups: {
    _def: ['backups'] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.backups._def, 'list', params] as const,
    detail: (id: string) => [...queryKeys.backups._def, 'detail', id] as const,
  },
  reports: {
    _def: ['reports'] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.reports._def, 'list', params] as const,
    detail: (id: string) => [...queryKeys.reports._def, 'detail', id] as const,
  },
} as const
