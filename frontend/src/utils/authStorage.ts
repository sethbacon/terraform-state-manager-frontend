// Centralised localStorage keys for non-secret cached auth state. The session JWT
// is NOT stored here — it lives only in the HttpOnly auth cookie, so it cannot be
// read or exfiltrated by JavaScript (XSS). clearAuthStorage drops any cached
// view state on logout / 401.
export const USER_KEY = 'tsm_user'
export const SCOPES_KEY = 'tsm_scopes'

export function clearAuthStorage(): void {
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(SCOPES_KEY)
}
