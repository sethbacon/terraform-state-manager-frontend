import { useState } from 'react'
import { Alert, Button, CircularProgress, Snackbar, Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAuth, SESSION_WARNING_LEAD_MS } from '../contexts/AuthContext'

/**
 * Persistent warning Snackbar shown when the session is within the warning
 * window (SESSION_WARNING_LEAD_MS before expiry), offering refresh or sign-out.
 * Mounted once in Layout so it appears on every authenticated page.
 */
export default function SessionExpiryWarning() {
  const { t } = useTranslation()
  const { isAuthenticated, sessionExpiresSoon, refreshSession, logout } = useAuth()
  const [refreshing, setRefreshing] = useState(false)

  if (!isAuthenticated || !sessionExpiresSoon) return null

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshSession()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <Snackbar open anchorOrigin={{ vertical: 'top', horizontal: 'center' }} data-testid="session-expiry-warning">
      <Alert
        severity="warning"
        variant="filled"
        sx={{ width: '100%', alignItems: 'center' }}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              color="inherit"
              size="small"
              onClick={handleRefresh}
              disabled={refreshing}
              startIcon={refreshing ? <CircularProgress size={14} color="inherit" /> : undefined}
            >
              {t('session.refresh')}
            </Button>
            <Button color="inherit" size="small" onClick={logout}>
              {t('auth.signOut')}
            </Button>
          </Stack>
        }
      >
        {t('session.expiresSoon', { minutes: Math.round(SESSION_WARNING_LEAD_MS / 60000) })}
      </Alert>
    </Snackbar>
  )
}
