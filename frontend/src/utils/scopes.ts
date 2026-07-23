/**
 * Shared scope display utilities used across admin pages (registry pattern,
 * adapted to this app's scope catalogue).
 */

export const AVAILABLE_SCOPES = [
  { value: 'state:read', label: 'State Read', description: 'Browse sources and read state files and analyses' },
  { value: 'state:write', label: 'State Write', description: 'Edit state (lock → backup → write → audit)' },
  { value: 'state:transfer', label: 'State Transfer', description: 'Back up or migrate state between sources' },
  { value: 'state:drift', label: 'State Drift', description: 'Dispatch drift-detection runs through CI' },
  { value: 'state:execute', label: 'State Execute', description: 'Dispatch version-lab runs through CI' },
  { value: 'sources:manage', label: 'Sources Manage', description: 'Create and manage state sources and schedules' },
  // NOTE: organizations:read / audit:read are identity-core scopes the sibling
  // registry honours, but this app gates every /admin route on the admin
  // wildcard and never defines or checks them standalone — so they are omitted
  // here rather than advertised as functional (they would grant nothing).
  { value: 'scim:provision', label: 'SCIM Provision', description: 'Provision users and groups via SCIM 2.0' },
  { value: 'admin', label: 'Admin', description: 'Full administrative access (grants every scope)' },
] as const

/** System role template names, in escalation order (drives sort + chip colors).
 * These are the roles this app actually seeds (bootstrap.go); there is no
 * "analyst" role here — that is a registry-only template. */
export const SYSTEM_ROLE_ORDER = ['viewer', 'operator', 'editor', 'admin']

/**
 * Look up a scope's metadata (label, description) from {@link AVAILABLE_SCOPES},
 * with a sensible fallback for unknown scopes.
 */
export function getScopeInfo(scopeValue: string) {
  return (
    AVAILABLE_SCOPES.find((s) => s.value === scopeValue) || {
      value: scopeValue,
      label: scopeValue,
      description: 'Unknown scope',
    }
  )
}

/** Return a MUI color token for a scope chip based on the scope's category. */
export function getScopeColor(
  scope: string,
): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' {
  if (scope === 'admin') return 'error'
  if (scope.includes(':write') || scope.includes(':manage') || scope.includes(':provision')) return 'warning'
  if (scope.includes(':read')) return 'success'
  return 'default'
}

/** Return a MUI color token for a role-template chip (registry pattern). */
export function getRoleTemplateColor(
  templateName?: string,
): 'error' | 'warning' | 'primary' | 'info' | 'success' | 'default' {
  switch (templateName) {
    case 'admin':
      return 'error'
    case 'editor':
      return 'warning'
    case 'operator':
      return 'primary'
    case 'viewer':
      return 'info'
    default:
      return 'default'
  }
}
