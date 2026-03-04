import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredScope?: string;
  requiredScopes?: string[];
  requireAll?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredScope,
  requiredScopes,
  requireAll = false,
}) => {
  const { isAuthenticated, isLoading, hasScope, hasAnyScope, scopes } = useAuth();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check single scope
  if (requiredScope && !hasScope(requiredScope)) {
    return <Navigate to="/" replace />;
  }

  // Check multiple scopes
  if (requiredScopes && requiredScopes.length > 0) {
    if (requireAll) {
      const hasAll = requiredScopes.every((s) => hasScope(s));
      if (!hasAll) return <Navigate to="/" replace />;
    } else {
      if (!hasAnyScope(requiredScopes)) return <Navigate to="/" replace />;
    }
  }

  // Suppress unused variable warning - scopes used indirectly via hasScope/hasAnyScope
  void scopes;

  return <>{children}</>;
};

export default ProtectedRoute;
