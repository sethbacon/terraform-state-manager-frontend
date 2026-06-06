import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react'
import { jwtDecode } from 'jwt-decode'
import { User, AuthContextType, RoleTemplateInfo } from '../types'
import api from '../services/api'
import { clearAuthStorage, TOKEN_KEY } from '../utils/authStorage'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const SESSION_WARNING_LEAD_MS = 2 * 60 * 1000

export function parseTokenExpiry(token: string | null | undefined): Date | null {
  if (!token) return null
  try {
    const decoded = jwtDecode<{ exp?: number }>(token)
    if (typeof decoded.exp !== 'number' || !isFinite(decoded.exp)) return null
    return new Date(decoded.exp * 1000)
  } catch {
    return null
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [roleTemplate, setRoleTemplate] = useState<RoleTemplateInfo | null>(null)
  const [allowedScopes, setAllowedScopes] = useState<string[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null)
  const [sessionExpiresSoon, setSessionExpiresSoon] = useState(false)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const silentRefreshRef = useRef<() => Promise<void>>(async () => { })

  const clearWarningTimer = useCallback(() => {
    if (warningTimerRef.current !== null) {
      clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }
  }, [])

  const scheduleSessionWarning = useCallback(
    (token: string | null | undefined, expiresAt?: Date) => {
      clearWarningTimer()
      setSessionExpiresSoon(false)
      const exp = expiresAt ?? parseTokenExpiry(token)
      setSessionExpiresAt(exp)
      if (!exp) return
      const delay = exp.getTime() - Date.now() - SESSION_WARNING_LEAD_MS
      if (delay <= 0) {
        silentRefreshRef.current().catch(() => {
          setSessionExpiresSoon(true)
        })
        return
      }
      warningTimerRef.current = setTimeout(() => {
        silentRefreshRef.current().catch(() => {
          setSessionExpiresSoon(true)
        })
      }, delay)
    },
    [clearWarningTimer],
  )

  const logout = useCallback(() => {
    setUser(null)
    setRoleTemplate(null)
    setAllowedScopes([])
    setIsAuthenticated(false)
    clearWarningTimer()
    setSessionExpiresAt(null)
    setSessionExpiresSoon(false)
    clearAuthStorage()
    api.logout()
  }, [clearWarningTimer])

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await api.getCurrentUserWithRole()
      setUser(response.user)
      setRoleTemplate(response.role_template || null)
      setAllowedScopes(response.allowed_scopes || [])
      localStorage.setItem('user', JSON.stringify(response.user))
      localStorage.setItem('role_template', JSON.stringify(response.role_template))
      localStorage.setItem('allowed_scopes', JSON.stringify(response.allowed_scopes))
      if (response.session_expires_at) {
        scheduleSessionWarning(null, new Date(response.session_expires_at))
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error)
      logout()
    }
  }, [logout, scheduleSessionWarning])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    const storedUser = localStorage.getItem('user')
    const storedRoleTemplate = localStorage.getItem('role_template')
    const storedAllowedScopes = localStorage.getItem('allowed_scopes')

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
        if (storedRoleTemplate) {
          setRoleTemplate(JSON.parse(storedRoleTemplate))
        }
        if (storedAllowedScopes) {
          setAllowedScopes(JSON.parse(storedAllowedScopes))
        }
        setIsAuthenticated(true)
        scheduleSessionWarning(token)
        fetchCurrentUser()
      } catch (error) {
        console.error('Failed to parse stored user:', error)
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem('user')
        localStorage.removeItem('role_template')
        localStorage.removeItem('allowed_scopes')
      }
      setIsLoading(false)
    } else if (token) {
      setIsAuthenticated(true)
      scheduleSessionWarning(token)
      fetchCurrentUser()
      setIsLoading(false)
    } else if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
        if (storedRoleTemplate) setRoleTemplate(JSON.parse(storedRoleTemplate))
        if (storedAllowedScopes) setAllowedScopes(JSON.parse(storedAllowedScopes))
        setIsAuthenticated(true)
      } catch {
        localStorage.removeItem('user')
        localStorage.removeItem('role_template')
        localStorage.removeItem('allowed_scopes')
      }
      fetchCurrentUser().finally(() => setIsLoading(false))
    } else {
      api
        .getCurrentUserWithRole()
        .then((response) => {
          setUser(response.user)
          setRoleTemplate(response.role_template || null)
          setAllowedScopes(response.allowed_scopes || [])
          setIsAuthenticated(true)
          localStorage.setItem('user', JSON.stringify(response.user))
          localStorage.setItem('role_template', JSON.stringify(response.role_template))
          localStorage.setItem('allowed_scopes', JSON.stringify(response.allowed_scopes))
          if (response.session_expires_at) {
            scheduleSessionWarning(null, new Date(response.session_expires_at))
          }
        })
        .catch(() => {
          // No valid session
        })
        .finally(() => setIsLoading(false))
    }
  }, [fetchCurrentUser, scheduleSessionWarning])

  const login = async (userOrProvider: User | 'oidc' | 'azuread'): Promise<void> => {
    if (typeof userOrProvider === 'string') {
      api.login(userOrProvider)
    } else {
      setIsAuthenticated(true)
      await fetchCurrentUser()
    }
  }

  const refreshToken = async () => {
    try {
      const response = await api.refreshToken()
      if (response.token) {
        localStorage.setItem(TOKEN_KEY, response.token)
        scheduleSessionWarning(response.token)
      }
    } catch (error) {
      console.error('Failed to refresh token:', error)
      logout()
    }
  }

  const silentRefresh = async () => {
    const response = await api.refreshToken()
    if (response.token) {
      localStorage.setItem(TOKEN_KEY, response.token)
      scheduleSessionWarning(response.token)
    } else if (response.expires_in) {
      scheduleSessionWarning(null, new Date(Date.now() + response.expires_in * 1000))
    } else {
      clearWarningTimer()
      setSessionExpiresAt(null)
    }
  }
  silentRefreshRef.current = silentRefresh

  const setToken = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token)
    setIsAuthenticated(true)
    scheduleSessionWarning(token)
  }

  useEffect(() => {
    return () => {
      clearWarningTimer()
    }
  }, [clearWarningTimer])

  const hasScope = useCallback((scope: string) => {
    return allowedScopes.includes('admin') || allowedScopes.includes(scope)
  }, [allowedScopes])

  const value: AuthContextType = {
    user,
    roleTemplate,
    allowedScopes,
    isAuthenticated,
    isLoading,
    sessionExpiresAt,
    sessionExpiresSoon,
    hasScope,
    login,
    logout,
    refreshToken,
    setToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
