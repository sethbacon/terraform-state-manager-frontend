import { lazy, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { AnnouncerProvider } from './contexts/AnnouncerContext'
import { HelpProvider } from './contexts/HelpContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import RouteFocusManager from './components/RouteFocusManager'
import PlaceholderPage from './components/PlaceholderPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import CallbackPage from './pages/CallbackPage'
import { allNavItems } from './navigation'

// Heavy domain pages are code-split (lazy) to keep the initial bundle small;
// a Suspense boundary lives around the Layout's Outlet.
const SourcesPage = lazy(() => import('./pages/SourcesPage'))
const DriftPage = lazy(() => import('./pages/DriftPage'))
const VersionLabPage = lazy(() => import('./pages/VersionLabPage'))
const SchedulesPage = lazy(() => import('./pages/SchedulesPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const TransferPage = lazy(() => import('./pages/TransferPage'))
const ApiDocumentation = lazy(() => import('./pages/ApiDocumentation'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const UsersPage = lazy(() => import('./pages/admin/UsersPage'))
const OrganizationsPage = lazy(() => import('./pages/admin/OrganizationsPage'))
const RolesPage = lazy(() => import('./pages/admin/RolesPage'))
const SSOPage = lazy(() => import('./pages/admin/SSOPage'))
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'))

// Routes backed by a real page (home is mounted separately at '/').
const realPages: Record<string, ReactNode> = {
  '/sources': <SourcesPage />,
  '/drift': <DriftPage />,
  '/version-lab': <VersionLabPage />,
  '/schedules': <SchedulesPage />,
  '/reports': <ReportsPage />,
  '/transfer': <TransferPage />,
  '/api-docs': <ApiDocumentation />,
  '/admin': <AdminDashboardPage />,
  '/admin/users': <UsersPage />,
  '/admin/organizations': <OrganizationsPage />,
  '/admin/roles': <RolesPage />,
  '/admin/sso': <SSOPage />,
  '/admin/audit-logs': <AuditLogPage />,
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <AnnouncerProvider>
          <AuthProvider>
            <HelpProvider>
              <BrowserRouter>
                <RouteFocusManager />
                <ErrorBoundary>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/auth/callback" element={<CallbackPage />} />
                    <Route
                      element={
                        <ProtectedRoute>
                          <Layout />
                        </ProtectedRoute>
                      }
                    >
                      <Route path="/" element={<DashboardPage />} />
                      {allNavItems
                        .filter((item) => item.path !== '/' && realPages[item.path])
                        .map((item) => (
                          <Route key={item.path} path={item.path} element={realPages[item.path]} />
                        ))}
                      <Route
                        path="*"
                        element={
                          <PlaceholderPage
                            title="Page not found"
                            description="The page you requested does not exist."
                          />
                        }
                      />
                    </Route>
                  </Routes>
                </ErrorBoundary>
              </BrowserRouter>
            </HelpProvider>
          </AuthProvider>
        </AnnouncerProvider>
      </AppThemeProvider>
    </QueryClientProvider>
  )
}
