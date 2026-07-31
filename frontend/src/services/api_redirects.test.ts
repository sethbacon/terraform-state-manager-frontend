import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { api, apiClient } from './api'

// login leaves the SPA via a full-page redirect. Logout does NOT: it is a
// CSRF-protected POST whose response carries the destination (#274).
describe('api auth redirects', () => {
  it('login navigates to the provider login endpoint', () => {
    api.login('ldap')
    expect(window.location.href).toContain('/api/v1/auth/login?provider=ldap')
  })
})

describe('api logout', () => {
  beforeEach(() => {
    window.location.href = 'http://localhost/'
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // A GET logout is triggerable by a cross-site link, so it must be a POST —
  // apiClient's interceptor attaches the X-CSRF-Token double-submit header to
  // state-changing requests, which is what makes the forgery fail.
  it('POSTs to the logout endpoint rather than navigating to it', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: { redirect_url: 'https://idp.example.com/end-session' } })

    await api.logout()

    expect(post).toHaveBeenCalledWith('/api/v1/auth/logout')
  })

  // The backend answers 200 with the destination instead of a 302 because an
  // XHR cannot follow a cross-origin redirect to the IdP's end-session
  // endpoint. The SPA has to perform that navigation itself.
  it('navigates to the redirect_url returned by the backend', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { redirect_url: 'https://idp.example.com/end-session' },
    })

    await api.logout()

    expect(window.location.href).toBe('https://idp.example.com/end-session')
  })

  // Local session state is already cleared by the time this runs, so a failed
  // request must not strand the user on an authenticated-looking page. This
  // also covers the sibling registry backend, which answers 403 rather than 200
  // when the session cookie is already gone.
  // The app root, resolved against the test origin — assigning '/' to
  // location.href yields an absolute URL in the DOM.
  const APP_ROOT = 'http://localhost/'

  it('still leaves the app when the logout request fails', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('403'))

    await api.logout()

    expect(window.location.href).toBe(APP_ROOT)
  })

  it('falls back to the app root when the response carries no redirect_url', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} })

    await api.logout()

    expect(window.location.href).toBe(APP_ROOT)
  })
})
