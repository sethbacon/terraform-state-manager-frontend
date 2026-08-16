import { lazy, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { queryClient } from './queryClient'
import { AppThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { AnnouncerProvider } from './contexts/AnnouncerContext'
import { HelpProvider } from './contexts/HelpContext'
import { ConsentProvider } from './contexts/ConsentContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import RouteFocusManager from './components/RouteFocusManager'
import PlaceholderPage from './components/PlaceholderPage'
import ConsentBanner from './components/ConsentBanner'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import CallbackPage from './pages/CallbackPage'
import SetupWizardPage from './pages/SetupWizardPage'
import { allNavItems } from './navigation'

// Heavy domain pages are code-split (lazy) to keep the initial bundle small;
// a Suspense boundary lives around the Layout's Outlet.
const SourcesPage = lazy(() => import('./pages/SourcesPage'))
const DriftPage = lazy(() => import('./pages/DriftPage'))
const VersionLabPage = lazy(() => import('./pages/VersionLabPage'))
const SchedulesPage = lazy(() => import('./pages/SchedulesPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const TransferPage = lazy(() => import('./pages/TransferPage'))
const APIKeysPage = lazy(() => import('./pages/admin/APIKeysPage'))
const ApiDocumentation = lazy(() => import('./pages/ApiDocumentation'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const UsersPage = lazy(() => import('./pages/admin/UsersPage'))
const OrganizationsPage = lazy(() => import('./pages/admin/OrganizationsPage'))
const RolesPage = lazy(() => import('./pages/admin/RolesPage'))
const PlatformAdminsPage = lazy(() => import('./pages/admin/PlatformAdminsPage'))
const GroupMappingsPage = lazy(() => import('./pages/admin/GroupMappingsPage'))
const MTLSPage = lazy(() => import('./pages/admin/MTLSPage'))
const SSOPage = lazy(() => import('./pages/admin/SSOPage'))
const NotificationsPage = lazy(() => import('./pages/admin/NotificationsPage'))
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'))
const CITemplatesPage = lazy(() => import('./pages/admin/CITemplatesPage'))
const BrandingPage = lazy(() => import('./pages/admin/BrandingPage'))

// Routes backed by a real page (home is mounted separately at '/').
const pageElements: Record<string, ReactNode> = {
  '/sources': <SourcesPage />,
  '/drift': <DriftPage />,
  '/version-lab': <VersionLabPage />,
  '/schedules': <SchedulesPage />,
  '/reports': <ReportsPage />,
  '/transfer': <TransferPage />,
  '/admin/apikeys': <APIKeysPage />,
  '/api-docs': <ApiDocumentation />,
  '/admin': <AdminDashboardPage />,
  '/admin/users': <UsersPage />,
  '/admin/organizations': <OrganizationsPage />,
  '/admin/roles': <RolesPage />,
  '/admin/platform-admins': <PlatformAdminsPage />,
  '/admin/oidc': <GroupMappingsPage />,
  '/admin/mtls': <MTLSPage />,
  '/admin/sso': <SSOPage />,
  '/admin/notifications': <NotificationsPage />,
  '/admin/audit-logs': <AuditLogPage />,
  '/admin/ci-templates': <CITemplatesPage />,
  '/admin/branding': <BrandingPage />,
}

// Wrap each page in its own ErrorBoundary so a render crash in one page (e.g. a
// malformed API response such as an unexpected null array) degrades to that page's
// fallback inside the Layout chrome instead of unmounting the whole authenticated
// shell (#217). The app-level boundary around <Routes> still catches anything
// outside a page (e.g. the Layout itself).
const realPages: Record<string, ReactNode> = Object.fromEntries(
  Object.entries(pageElements).map(([path, element]) => [path, <ErrorBoundary>{element}</ErrorBoundary>]),
)

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <ConsentProvider>
          <AnnouncerProvider>
            <AuthProvider>
              <HelpProvider>
                <BrowserRouter>
                  <RouteFocusManager />
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/auth/callback" element={<CallbackPage />} />
                      <Route path="/setup" element={<SetupWizardPage />} />
                      {/* Public marketing landing — rendered in the Layout chrome without auth. */}
                      <Route element={<Layout />}>
                        <Route path="/" element={<LandingPage />} />
                      </Route>
                      <Route
                        element={
                          <ProtectedRoute>
                            <Layout />
                          </ProtectedRoute>
                        }
                      >
                        {allNavItems
                          .filter((item) => item.path !== '/' && realPages[item.path])
                          .map((item) => (
                            <Route
                              key={item.path}
                              path={item.path}
                              // Wire each route's scope (navigation.tsx NavItem.scope) into the
                              // existing ProtectedRoute guard so route access matches sidebar/palette
                              // visibility (#230, #237). This is defense-in-depth/UX only — the
                              // backend independently enforces scope on every /api/v1 call.
                              element={
                                item.scope ? (
                                  <ProtectedRoute requiredScope={item.scope}>
                                    {realPages[item.path]}
                                  </ProtectedRoute>
                                ) : (
                                  realPages[item.path]
                                )
                              }
                            />
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
          <ConsentBanner />
        </ConsentProvider>
      </AppThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
