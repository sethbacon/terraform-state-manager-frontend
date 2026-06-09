import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Box, Button, Card, CardContent, CircularProgress, Divider, Stack, Typography } from '@mui/material'
import LoginIcon from '@mui/icons-material/Login'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

function Centered({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      {children}
    </Box>
  )
}

export default function LoginPage() {
  const { isAuthenticated, isLoading, login, devLogin } = useAuth()
  const [providers, setProviders] = useState<{ type: string; name: string }[]>([])
  const [devMode, setDevMode] = useState(false)
  const [busy, setBusy] = useState(false)

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

  return (
    <Centered>
      <Card sx={{ width: 380, maxWidth: '90vw' }}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom>
            Terraform State Manager
          </Typography>
          <Typography color="text.secondary" align="center" sx={{ mb: 3 }}>
            Sign in to continue
          </Typography>
          <Stack spacing={1.5}>
            {providers.map((p) => (
              <Button key={p.type} variant="contained" startIcon={<LoginIcon />} onClick={() => login(p.type)}>
                Sign in with {p.name}
              </Button>
            ))}
            {providers.length === 0 && !devMode && (
              <Typography color="text.secondary" align="center">
                No login providers are configured.
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
                  Dev Login (Admin)
                </Button>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Centered>
  )
}
