import { Fragment, useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import LoginIcon from '@mui/icons-material/Login'
import { useTranslation } from 'react-i18next'
import { api, type AuthProvider } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

// Simple t type avoids excessively-deep instantiation from the large i18next key union.
type SimpleTFunc = (key: string, options?: Record<string, unknown>) => string

function providerLabel(p: AuthProvider, t: SimpleTFunc): string {
  switch (p.type) {
    case 'oidc':
      return t('pages.login.signInWithSSO')
    case 'azuread':
      return t('pages.login.signInWithAzureAD')
    default:
      return t('pages.login.signInWith', { provider: p.name })
  }
}

function providerSx(p: AuthProvider): Record<string, unknown> | undefined {
  if (p.type === 'azuread') {
    return { backgroundColor: '#0078d4', '&:hover': { backgroundColor: '#106ebe' } }
  }
  return undefined
}

export default function LoginPage() {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading, login, devLogin, ldapLogin } = useAuth()
  const [providers, setProviders] = useState<AuthProvider[]>([])
  const [devMode, setDevMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // LDAP form state.
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [ldapBusy, setLdapBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .getProviders()
      .then((p) => {
        if (cancelled) return
        setProviders(p.providers)
        setDevMode(p.dev_mode)
      })
      .catch(() => {
        // Silently ignore — providers will be empty.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <CircularProgress aria-label={t('common.loading')} />
      </Box>
    )
  }
  if (isAuthenticated) {
    return <Navigate to="/admin" replace />
  }

  const ssoProviders = providers.filter((p) => p.type !== 'ldap')
  const hasLdap = providers.some((p) => p.type === 'ldap')
  const showNoProvidersAlert = !loading && providers.length === 0 && !devMode

  const handleProviderLogin = (p: AuthProvider) => {
    setError(null)
    // SAML targets a specific IdP via provider=saml:<id>; others use their type.
    login(p.type === 'saml' && p.id ? `saml:${p.id}` : p.type)
  }

  const handleDevLogin = async () => {
    setError(null)
    setBusy(true)
    try {
      await devLogin()
    } catch {
      setError(t('pages.login.devLoginFailed'))
    } finally {
      setBusy(false)
    }
  }

  const handleLdapSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLdapBusy(true)
    try {
      await ldapLogin(username, password)
    } catch {
      setError(t('pages.login.ldapError'))
    } finally {
      setLdapBusy(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ mx: 'auto' }}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <LoginIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              {t('app.name')}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              {t('pages.login.subtitle')}
            </Typography>
          </Box>

          <Stack spacing={2}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {showNoProvidersAlert && (
              <Alert severity="info" data-testid="no-providers-alert">
                {t('pages.login.noProviders')}
              </Alert>
            )}

            {devMode && (
              <>
                <Alert severity="info">{t('pages.login.devModeNotice')}</Alert>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  color="success"
                  disabled={busy}
                  onClick={handleDevLogin}
                  sx={{ py: 1.5 }}
                >
                  {busy ? <CircularProgress size={24} /> : t('pages.login.devLogin')}
                </Button>
                {(loading || providers.length > 0) && (
                  <Divider>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {t('pages.login.orUseProductionAuth')}
                    </Typography>
                  </Divider>
                )}
              </>
            )}

            {loading ? (
              <Stack spacing={1} data-testid="provider-loading">
                <Skeleton variant="rounded" height={48} />
                <Skeleton variant="rounded" height={48} />
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
                  <CircularProgress size={18} aria-label={t('pages.login.loadingProviders')} />
                </Box>
              </Stack>
            ) : (
              <>
                {ssoProviders.map((p, idx, visible) => (
                  <Fragment key={p.id ?? p.type}>
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      onClick={() => handleProviderLogin(p)}
                      sx={{ py: 1.5, ...(providerSx(p) ?? {}) }}
                    >
                      {providerLabel(p, t)}
                    </Button>
                    {idx < visible.length - 1 && (
                      <Divider>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {t('pages.login.or')}
                        </Typography>
                      </Divider>
                    )}
                  </Fragment>
                ))}

                {hasLdap && ssoProviders.length > 0 && (
                  <Divider>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {t('pages.login.orSignInWithLdap')}
                    </Typography>
                  </Divider>
                )}

                {hasLdap && (
                  <Box component="form" onSubmit={handleLdapSubmit}>
                    <Stack spacing={2}>
                      {ssoProviders.length === 0 && (
                        <Typography variant="subtitle2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                          {t('pages.login.signInWithLdap')}
                        </Typography>
                      )}
                      <TextField
                        label={t('pages.login.username')}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        fullWidth
                        autoComplete="username"
                        size="small"
                      />
                      <TextField
                        label={t('pages.login.password')}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        fullWidth
                        autoComplete="current-password"
                        size="small"
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        disabled={ldapBusy || !username || !password}
                        sx={{ py: 1.5 }}
                      >
                        {ldapBusy ? <CircularProgress size={24} /> : t('pages.login.signIn')}
                      </Button>
                    </Stack>
                  </Box>
                )}
              </>
            )}
          </Stack>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('pages.login.ssoInfo')}
              <br />
              {t('pages.login.ssoContact')}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}
