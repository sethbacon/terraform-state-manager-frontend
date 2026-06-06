import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CircularProgress, Box, Container, Typography, Alert, Button } from '@mui/material'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredScope?: string
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredScope }) => {
  const { isAuthenticated, isLoading, allowedScopes } = useAuth()

  const hasScope = (scope: string) => {
    return allowedScopes.includes('admin') || allowedScopes.includes(scope)
  }

  if (isLoading) {
    return (
      <Box
        aria-busy="true"
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredScope && !hasScope(requiredScope)) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body2">
            You don&apos;t have permission to access this page. This page requires the{' '}
            <strong>{requiredScope}</strong> permission.
          </Typography>
        </Alert>
        <Button variant="contained" href="/admin">
          Go to Dashboard
        </Button>
      </Container>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute
