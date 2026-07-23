import { describe, expect, it } from 'vitest'
import { AVAILABLE_SCOPES, SYSTEM_ROLE_ORDER, getRoleTemplateColor, getScopeColor, getScopeInfo } from './scopes'

describe('AVAILABLE_SCOPES', () => {
  it('has unique values and non-empty labels/descriptions', () => {
    const values = AVAILABLE_SCOPES.map((s) => s.value)
    expect(new Set(values).size).toBe(values.length)
    for (const s of AVAILABLE_SCOPES) {
      expect(s.label).toBeTruthy()
      expect(s.description).toBeTruthy()
    }
  })

  it('includes the admin wildcard and core state scopes', () => {
    const values = AVAILABLE_SCOPES.map((s) => s.value)
    for (const required of ['admin', 'state:read', 'state:write', 'state:transfer', 'sources:manage']) {
      expect(values).toContain(required)
    }
  })
})

describe('getScopeInfo', () => {
  it('returns catalogue metadata for known scopes', () => {
    const info = getScopeInfo('state:read')
    expect(info.label).toBe('State Read')
  })

  it('falls back gracefully for unknown scopes', () => {
    const info = getScopeInfo('mystery:scope')
    expect(info.value).toBe('mystery:scope')
    expect(info.label).toBe('mystery:scope')
    expect(info.description).toBe('Unknown scope')
  })
})

describe('getScopeColor', () => {
  it.each([
    ['admin', 'error'],
    ['state:write', 'warning'],
    ['sources:manage', 'warning'],
    ['scim:provision', 'warning'],
    ['state:read', 'success'],
    ['audit:read', 'success'],
    ['something:else', 'default'],
  ])('%s → %s', (scope, color) => {
    expect(getScopeColor(scope)).toBe(color)
  })
})

describe('getRoleTemplateColor', () => {
  it.each([
    ['admin', 'error'],
    ['editor', 'warning'],
    ['operator', 'primary'],
    ['viewer', 'info'],
    // "analyst" is a registry-only template this app never seeds — no color.
    ['analyst', 'default'],
    ['custom-role', 'default'],
    [undefined, 'default'],
  ])('%s → %s', (name, color) => {
    expect(getRoleTemplateColor(name as string | undefined)).toBe(color)
  })

  it('covers every system role in the escalation order', () => {
    for (const role of SYSTEM_ROLE_ORDER) {
      expect(getRoleTemplateColor(role)).not.toBe('default')
    }
  })
})
