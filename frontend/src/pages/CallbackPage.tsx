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
export default function CallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const err = params.get('error_description') || params.get('error')
    if (err) {
      setError(err)
      setTimeout(() => navigate('/login', { replace: true }), 3000)
      return
    }

    // Full reload so AuthProvider re-resolves the session from the cookie.
    window.location.replace('/')
  }, [navigate, params])

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <CircularProgress />
          <Typography color="text.secondary">{t('auth.completingSignIn')}</Typography>
        </Stack>
      )}
    </Box>
  )
}
