import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { HelpProvider } from './contexts/HelpContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingOverlay from './components/LoadingOverlay';

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const CallbackPage = lazy(() => import('./pages/CallbackPage'));
const SetupWizardPage = lazy(() => import('./pages/SetupWizardPage'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const OrganizationsPage = lazy(() => import('./pages/admin/OrganizationsPage'));
const APIKeysPage = lazy(() => import('./pages/admin/APIKeysPage'));
const RolesPage = lazy(() => import('./pages/admin/RolesPage'));
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'));
const AnalysisDetailPage = lazy(() => import('./pages/AnalysisDetailPage'));
const SourcesPage = lazy(() => import('./pages/admin/SourcesPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const DashboardsPage = lazy(() => import('./pages/DashboardPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const CompliancePage = lazy(() => import('./pages/CompliancePage'));
const WorkspacesPage = lazy(() => import('./pages/WorkspacesPage'));
const WorkspaceDetailPage = lazy(() => import('./pages/WorkspaceDetailPage'));
const BackupsPage = lazy(() => import('./pages/BackupsPage'));
const MigrationsPage = lazy(() => import('./pages/MigrationsPage'));
const SchedulerPage = lazy(() => import('./pages/admin/SchedulerPage'));
const OIDCSettingsPage = lazy(() => import('./pages/admin/OIDCSettingsPage'));
const ApiDocumentation = lazy(() => import('./pages/ApiDocumentation'));

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HelpProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <Suspense fallback={<LoadingOverlay open message="Loading..." />}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/callback" element={<CallbackPage />} />
                <Route path="/setup" element={<SetupWizardPage />} />

                {/* Protected routes with Layout */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  {/* Dashboard is now the landing page */}
                  <Route index element={<DashboardsPage />} />

                  {/* Redirect old /dashboards path to / */}
                  <Route path="dashboards" element={<Navigate to="/" replace />} />

                  {/* Admin routes */}
                  <Route
                    path="admin/dashboard"
                    element={
                      <ProtectedRoute requiredScope="admin">
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/users"
                    element={
                      <ProtectedRoute requiredScope="users:read">
                        <UsersPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/organizations"
                    element={
                      <ProtectedRoute requiredScope="organizations:read">
                        <OrganizationsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/oidc"
                    element={
                      <ProtectedRoute requiredScope="admin">
                        <OIDCSettingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/api-keys"
                    element={
                      <ProtectedRoute>
                        <APIKeysPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/roles"
                    element={
                      <ProtectedRoute requiredScope="admin">
                        <RolesPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Analysis routes */}
                  <Route
                    path="analysis"
                    element={
                      <ProtectedRoute requiredScope="analysis:read">
                        <AnalysisPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="analysis/:id"
                    element={
                      <ProtectedRoute requiredScope="analysis:read">
                        <AnalysisDetailPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* State Sources — promoted from /admin/sources */}
                  <Route
                    path="sources"
                    element={
                      <ProtectedRoute requiredScope="sources:write">
                        <SourcesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="admin/sources" element={<Navigate to="/sources" replace />} />

                  {/* Scheduler — promoted from /admin/scheduler */}
                  <Route
                    path="scheduler"
                    element={
                      <ProtectedRoute requiredScope="scheduler:admin">
                        <SchedulerPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="admin/scheduler" element={<Navigate to="/scheduler" replace />} />

                  {/* Redirect old /admin/notifications to /alerts */}
                  <Route path="admin/notifications" element={<Navigate to="/alerts" replace />} />

                  {/* Reports */}
                  <Route
                    path="reports"
                    element={
                      <ProtectedRoute requiredScope="reports:read">
                        <ReportsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Alerts */}
                  <Route
                    path="alerts"
                    element={
                      <ProtectedRoute requiredScope="alerts:admin">
                        <AlertsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Compliance */}
                  <Route
                    path="compliance"
                    element={
                      <ProtectedRoute requiredScope="compliance:read">
                        <CompliancePage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Workspaces */}
                  <Route
                    path="workspaces"
                    element={
                      <ProtectedRoute requiredScope="sources:read">
                        <WorkspacesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="workspaces/:name"
                    element={
                      <ProtectedRoute requiredScope="sources:read">
                        <WorkspaceDetailPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Backups */}
                  <Route
                    path="backups"
                    element={
                      <ProtectedRoute requiredScope="backups:read">
                        <BackupsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Migrations */}
                  <Route
                    path="migrations"
                    element={
                      <ProtectedRoute requiredScope="migrations:read">
                        <MigrationsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* API Documentation */}
                  <Route path="api-docs" element={<ApiDocumentation />} />
                </Route>
              </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </HelpProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
