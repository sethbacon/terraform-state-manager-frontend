import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  requiredScope?: string
}

/**
 * ProtectedRoute gates its children on an authenticated session and, optionally,
 * a required scope. Unauthenticated users are redirected to /login.
 */
export default function ProtectedRoute({ children, requiredScope }: ProtectedRouteProps) {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading, hasScope } = useAuth()

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredScope && !hasScope(requiredScope)) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h6">{t('auth.insufficientTitle')}</Typography>
        <Typography color="text.secondary">{t('auth.insufficientBody', { scope: requiredScope })}</Typography>
      </Box>
    )
  }

  return <>{children}</>
}
