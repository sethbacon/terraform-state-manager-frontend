import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  oidc_sub?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  scopes: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  setToken: (token: string) => void;
  refreshToken: () => Promise<void>;
  hasScope: (scope: string) => boolean;
  hasAnyScope: (scopes: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'tsm_auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [scopes, setScopes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const setToken = useCallback((newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setTokenState(newToken);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setTokenState(null);
    setUser(null);
    setScopes([]);
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.getCurrentUser();
      setUser(data);
      setScopes(data.scopes || data.allowed_scopes || []);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        clearAuth();
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, clearAuth]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Note: Auth header injection and 401 redirect are handled by ApiClient interceptors.

  const login = useCallback(() => {
    window.location.href = '/api/v1/auth/login';
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout errors
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const refreshToken = useCallback(async () => {
    try {
      const data = await api.refreshToken();
      if (data.token) {
        setToken(data.token);
      }
    } catch {
      clearAuth();
    }
  }, [setToken, clearAuth]);

  const hasScope = useCallback(
    (scope: string) => {
      if (scopes.includes('admin')) return true;
      if (scopes.includes(scope)) return true;
      // write implies read
      if (scope.endsWith(':read')) {
        const writeScope = scope.replace(':read', ':write');
        if (scopes.includes(writeScope)) return true;
      }
      return false;
    },
    [scopes]
  );

  const hasAnyScope = useCallback(
    (requiredScopes: string[]) => requiredScopes.some((s) => hasScope(s)),
    [hasScope]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      scopes,
      isAuthenticated: !!user && !!token,
      isLoading,
      login,
      logout,
      setToken,
      refreshToken,
      hasScope,
      hasAnyScope,
    }),
    [user, token, scopes, isLoading, login, logout, setToken, refreshToken, hasScope, hasAnyScope]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
