import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

/**
 * CallbackPage is the SPA landing page after the OIDC backend callback sets the
 * HttpOnly session cookie. Sessions are cookie-only — there is no token to move
 * into JS — so on success it simply reloads at the app root, where the
 * AuthProvider resolves the now-authenticated user via /me.
 */

// Standard OIDC / OAuth 2.0 error codes (RFC 6749 §4.1.2.1 + OIDC Core §3.1.2.6).
// Only a value from this fixed set is ever surfaced to the user; the attacker-
// controllable free-text error_description is never rendered (#227, #222).
const KNOWN_OIDC_ERRORS = new Set([
  'access_denied',
  'invalid_request',
  'unauthorized_client',
  'unsupported_response_type',
  'invalid_scope',
  'server_error',
  'temporarily_unavailable',
  'login_required',
  'consent_required',
  'interaction_required',
  'account_selection_required',
  'invalid_client',
  'invalid_grant',
  'invalid_token',
])

export default function CallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [failed, setFailed] = useState(false)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    // /auth/callback is a public route, so its query params are fully
    // attacker-controllable via a crafted link. Never render the free-text
    // error_description (content-spoofing vector, #227/#222); surface only the
    // constrained, whitelisted OIDC error CODE alongside an app-authored message.
    const rawCode = params.get('error')
    if (rawCode !== null || params.get('error_description') !== null) {
      setFailed(true)
      setErrorCode(rawCode && KNOWN_OIDC_ERRORS.has(rawCode) ? rawCode : null)
      setTimeout(() => navigate('/login', { replace: true }), 3000)
      return
    }

    // Full reload so AuthProvider re-resolves the session from the cookie.
    window.location.replace('/admin')
  }, [navigate, params])

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      {failed ? (
        <Alert severity="error">
          {t('auth.signInFailed')}
          {errorCode ? ` (${errorCode})` : ''}
        </Alert>
      ) : (
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <CircularProgress />
          <Typography color="text.secondary">{t('auth.completingSignIn')}</Typography>
        </Stack>
      )}
    </Box>
  )
}
