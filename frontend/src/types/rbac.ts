export interface ScopeDefinition {
  value: string
  label: string
  description: string
}

export const AVAILABLE_SCOPES: ScopeDefinition[] = [
  { value: 'states:read', label: 'States Read', description: 'View state files' },
  { value: 'states:write', label: 'States Write', description: 'Create and update state files' },
  { value: 'workspaces:read', label: 'Workspaces Read', description: 'View workspaces' },
  { value: 'workspaces:manage', label: 'Workspaces Manage', description: 'Create and manage workspaces' },
  { value: 'sources:read', label: 'Sources Read', description: 'View sources' },
  { value: 'sources:manage', label: 'Sources Manage', description: 'Create and manage sources' },
  { value: 'users:read', label: 'Users Read', description: 'View user accounts' },
  { value: 'users:write', label: 'Users Write', description: 'Create and manage user accounts' },
  { value: 'organizations:read', label: 'Organizations Read', description: 'View organizations' },
  { value: 'organizations:write', label: 'Organizations Write', description: 'Create and manage organizations' },
  { value: 'api_keys:manage', label: 'API Keys Manage', description: 'Create and manage API keys' },
  { value: 'audit:read', label: 'Audit Read', description: 'View audit logs' },
  { value: 'admin', label: 'Admin', description: 'Full administrative access' },
  { value: 'analysis:read', label: 'Analysis Read', description: 'View analysis results' },
  { value: 'analysis:manage', label: 'Analysis Manage', description: 'Run and manage analysis' },
]
