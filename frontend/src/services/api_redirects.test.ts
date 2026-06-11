import { describe, expect, it } from 'vitest'
import { api } from './api'

// login/logout leave the SPA via full-page redirects.
describe('api auth redirects', () => {
  it('login navigates to the provider login endpoint', () => {
    api.login('ldap')
    expect(window.location.href).toContain('/api/v1/auth/login?provider=ldap')
  })

  it('logout navigates to the logout endpoint', () => {
    api.logout()
    expect(window.location.href).toContain('/api/v1/auth/logout')
  })
})
