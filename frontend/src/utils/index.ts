import { AVAILABLE_SCOPES } from '@/types/rbac'

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'

export function getScopeInfo(scope: string): { label: string; description: string } {
  const found = AVAILABLE_SCOPES.find((s) => s.value === scope)
  if (found) return { label: found.label, description: found.description }
  return { label: scope, description: scope }
}

const SCOPE_COLOR_MAP: Record<string, ChipColor> = {
  admin: 'error',
  'states:write': 'warning',
  'workspaces:manage': 'warning',
  'sources:manage': 'warning',
  'users:write': 'warning',
  'organizations:write': 'warning',
  'api_keys:manage': 'warning',
  'analysis:manage': 'secondary',
}

export function getScopeColor(scope: string): ChipColor {
  return SCOPE_COLOR_MAP[scope] ?? 'default'
}

export { getErrorMessage, getErrorStatus } from './errors'
export { REGISTRY_SEGMENT_RE } from './registrySegment'
