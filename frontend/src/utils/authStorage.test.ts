import { beforeEach, describe, expect, it } from 'vitest'
import { SCOPES_KEY, USER_KEY, clearAuthStorage } from './authStorage'

describe('clearAuthStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('removes the cached user and scopes', () => {
    localStorage.setItem(USER_KEY, '{"id":"u1"}')
    localStorage.setItem(SCOPES_KEY, '["state:read"]')
    clearAuthStorage()
    expect(localStorage.getItem(USER_KEY)).toBeNull()
    expect(localStorage.getItem(SCOPES_KEY)).toBeNull()
  })

  it('leaves unrelated keys untouched', () => {
    localStorage.setItem('i18nextLng', 'en')
    clearAuthStorage()
    expect(localStorage.getItem('i18nextLng')).toBe('en')
  })

  it('is a no-op when nothing is cached', () => {
    expect(() => clearAuthStorage()).not.toThrow()
  })
})
