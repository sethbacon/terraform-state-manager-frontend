// React Query key factory. Mirrors the registry frontend's pattern so query keys
// stay centralised and invalidation is predictable as domains are added.
export const queryKeys = {
  system: {
    version: ['system', 'version'] as const,
    health: ['system', 'health'] as const,
  },
  dashboard: {
    overview: () => ['dashboard', 'overview'] as const,
  },
  admin: {
    stats: () => ['admin', 'stats'] as const,
    users: () => ['admin', 'users'] as const,
    organizations: () => ['admin', 'organizations'] as const,
    roles: () => ['admin', 'roles'] as const,
    auditLogs: () => ['admin', 'audit-logs'] as const,
    sso: () => ['admin', 'sso'] as const,
    notifications: () => ['admin', 'notifications'] as const,
  },
  sources: {
    all: ['sources'] as const,
    list: () => ['sources', 'list'] as const,
    states: (id: string) => ['sources', id, 'states'] as const,
    analysis: (id: string, key: string) => ['sources', id, 'analysis', key] as const,
    resources: (id: string, key: string) => ['sources', id, 'resources', key] as const,
    raw: (id: string, key: string) => ['sources', id, 'raw', key] as const,
    backups: (id: string, key: string) => ['sources', id, 'backups', key] as const,
  },
  pipelines: {
    all: ['pipelines'] as const,
    list: () => ['pipelines', 'list'] as const,
  },
  drift: {
    all: ['drift'] as const,
    runs: () => ['drift', 'runs'] as const,
  },
  schedules: {
    all: ['schedules'] as const,
    list: () => ['schedules', 'list'] as const,
  },
  health: {
    all: ['health'] as const,
    runs: () => ['health', 'runs'] as const,
  },
}
