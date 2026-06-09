import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import LoginIcon from '@mui/icons-material/Login'
import { useTranslation } from 'react-i18next'
import { api, type AuthProvider } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

function Centered({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      {children}
    </Box>
  )
}

export default function LoginPage() {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading, login, devLogin, ldapLogin } = useAuth()
  const [providers, setProviders] = useState<AuthProvider[]>([])
  const [devMode, setDevMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // LDAP form state.
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [ldapBusy, setLdapBusy] = useState(false)

  useEffect(() => {
    api
      .getProviders()
      .then((p) => {
        setProviders(p.providers)
        setDevMode(p.dev_mode)
      })
      .catch(() => {})
  }, [])

  if (isLoading) {
    return (
      <Centered>
        <CircularProgress />
      </Centered>
    )
  }
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  // SAML requests a specific IdP via provider=saml:<id>; OIDC uses its type.
  const ssoProviders = providers.filter((p) => p.type !== 'ldap')
  const hasLdap = providers.some((p) => p.type === 'ldap')

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
    <Centered>
      <Card sx={{ width: 380, maxWidth: '90vw' }}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom>
            {t('app.name')}
          </Typography>
          <Typography color="text.secondary" align="center" sx={{ mb: 3 }}>
            {t('pages.login.subtitle')}
          </Typography>
          <Stack spacing={1.5}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {ssoProviders.map((p) => (
              <Button
                key={p.id ?? p.type}
                variant="contained"
                startIcon={<LoginIcon />}
                onClick={() => login(p.type === 'saml' && p.id ? `saml:${p.id}` : p.type)}
              >
                {t('pages.login.signInWith', { provider: p.name })}
              </Button>
            ))}

            {hasLdap && (
              <>
                {ssoProviders.length > 0 && <Divider>{t('pages.login.or')}</Divider>}
                <Box component="form" onSubmit={handleLdapSubmit}>
                  <Stack spacing={1.5}>
                    <TextField
                      label={t('pages.login.username')}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      fullWidth
                      size="small"
                      autoComplete="username"
                    />
                    <TextField
                      label={t('pages.login.password')}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      fullWidth
                      size="small"
                      autoComplete="current-password"
                    />
                    <Button type="submit" variant="contained" disabled={ldapBusy || !username || !password}>
                      {ldapBusy ? <CircularProgress size={22} /> : t('pages.login.signIn')}
                    </Button>
                  </Stack>
                </Box>
              </>
            )}

            {providers.length === 0 && !devMode && (
              <Typography color="text.secondary" align="center">
                {t('pages.login.noProviders')}
              </Typography>
            )}

            {devMode && (
              <>
                <Divider>dev</Divider>
                <Button
                  variant="outlined"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    try {
                      await devLogin()
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  {t('pages.login.devLogin')}
                </Button>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Centered>
  )
}
