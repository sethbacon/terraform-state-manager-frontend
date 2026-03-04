import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '',
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    // Request interceptor: attach JWT token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('tsm_auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor: handle 401
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('tsm_auth_token');
          if (window.location.pathname !== '/login' && window.location.pathname !== '/callback' && window.location.pathname !== '/setup') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic HTTP methods (public for backward compatibility with existing consumers)
  get<T = any>(url: string, params?: Record<string, any>): Promise<AxiosResponse<T>> {
    return this.client.get(url, { params });
  }
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post(url, data, config);
  }
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put(url, data, config);
  }
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete(url, config);
  }

  // --- Setup ---
  getSetupStatus() { return this.get('/api/v1/setup/status').then(r => r.data); }
  validateSetupToken(token: string) { return this.post('/api/v1/setup/validate-token', { token }).then(r => r.data); }
  testOIDCConfig(config: any) { return this.post('/api/v1/setup/oidc/test', config).then(r => r.data); }
  saveOIDCConfig(config: any) { return this.post('/api/v1/setup/oidc', config).then(r => r.data); }
  testStorageConfig(config: any) { return this.post('/api/v1/setup/storage/test', config).then(r => r.data); }
  saveStorageConfig(config: any) { return this.post('/api/v1/setup/storage', config).then(r => r.data); }
  configureAdmin(config: any) { return this.post('/api/v1/setup/admin', config).then(r => r.data); }
  completeSetup() { return this.post('/api/v1/setup/complete').then(r => r.data); }

  // --- Auth ---
  getCurrentUser() { return this.get('/api/v1/auth/me').then(r => r.data); }
  refreshToken() { return this.post('/api/v1/auth/refresh').then(r => r.data); }
  logout() { return this.get('/api/v1/auth/logout').then(r => r.data); }

  // --- Dev ---
  getDevStatus() { return this.get('/api/v1/dev/status').then(r => r.data); }
  listUsersForImpersonation() { return this.get('/api/v1/dev/users').then(r => r.data); }
  impersonateUser(userId: string) { return this.post(`/api/v1/dev/impersonate/${userId}`).then(r => r.data); }

  // --- Admin Stats ---
  getAdminDashboardStats() { return this.get('/api/v1/admin/stats/dashboard').then(r => r.data); }

  // --- Admin Users ---
  listUsers(params?: Record<string, any>) { return this.get('/api/v1/users', params).then(r => r.data); }
  createUser(data: any) { return this.post('/api/v1/users', data).then(r => r.data); }
  getUser(id: string) { return this.get(`/api/v1/users/${id}`).then(r => r.data); }
  updateUser(id: string, data: any) { return this.put(`/api/v1/users/${id}`, data).then(r => r.data); }
  deleteUser(id: string) { return this.delete(`/api/v1/users/${id}`).then(r => r.data); }

  // --- Admin Organizations ---
  listOrganizations(params?: Record<string, any>) { return this.get('/api/v1/organizations', params).then(r => r.data); }
  createOrganization(data: any) { return this.post('/api/v1/organizations', data).then(r => r.data); }
  getOrganization(id: string) { return this.get(`/api/v1/organizations/${id}`).then(r => r.data); }
  updateOrganization(id: string, data: any) { return this.put(`/api/v1/organizations/${id}`, data).then(r => r.data); }
  deleteOrganization(id: string) { return this.delete(`/api/v1/organizations/${id}`).then(r => r.data); }
  listOrganizationMembers(id: string) { return this.get(`/api/v1/organizations/${id}/members`).then(r => r.data); }
  addOrganizationMember(id: string, data: any) { return this.post(`/api/v1/organizations/${id}/members`, data).then(r => r.data); }
  removeOrganizationMember(orgId: string, userId: string) { return this.delete(`/api/v1/organizations/${orgId}/members/${userId}`).then(r => r.data); }

  // --- Admin Roles ---
  listRoles() { return this.get('/api/v1/admin/role-templates').then(r => r.data); }
  createRole(data: any) { return this.post('/api/v1/admin/role-templates', data).then(r => r.data); }
  updateRole(id: string, data: any) { return this.put(`/api/v1/admin/role-templates/${id}`, data).then(r => r.data); }
  deleteRole(id: string) { return this.delete(`/api/v1/admin/role-templates/${id}`).then(r => r.data); }

  // --- Admin API Keys ---
  listAPIKeys(params?: Record<string, any>) { return this.get('/api/v1/admin/api-keys', params).then(r => r.data); }
  createAPIKey(data: any) { return this.post('/api/v1/admin/api-keys', data).then(r => r.data); }
  deleteAPIKey(id: string) { return this.delete(`/api/v1/admin/api-keys/${id}`).then(r => r.data); }

  // --- Sources ---
  listSources(params?: Record<string, any>) { return this.get('/api/v1/sources', params).then(r => r.data); }
  createSource(data: any) { return this.post('/api/v1/sources', data).then(r => r.data); }
  getSource(id: string) { return this.get(`/api/v1/sources/${id}`).then(r => r.data); }
  updateSource(id: string, data: any) { return this.put(`/api/v1/sources/${id}`, data).then(r => r.data); }
  deleteSource(id: string) { return this.delete(`/api/v1/sources/${id}`).then(r => r.data); }
  testSource(id: string) { return this.post(`/api/v1/sources/${id}/test`).then(r => r.data); }

  // --- Analysis ---
  startAnalysis(data: any) { return this.post('/api/v1/analysis/run', data).then(r => r.data); }
  listAnalysisRuns(params?: Record<string, any>) { return this.get('/api/v1/analysis/runs', params).then(r => r.data); }
  getAnalysisRun(id: string) { return this.get(`/api/v1/analysis/runs/${id}`).then(r => r.data); }
  getAnalysisRunResults(id: string, params?: Record<string, any>) { return this.get(`/api/v1/analysis/runs/${id}/results`, params).then(r => r.data); }
  cancelAnalysisRun(id: string) { return this.post(`/api/v1/analysis/runs/${id}/cancel`).then(r => r.data); }
  getAnalysisSummary() { return this.get('/api/v1/analysis/summary').then(r => r.data); }

  // --- Reports ---
  generateReport(data: any) { return this.post('/api/v1/reports/generate', data).then(r => r.data); }
  listReports(params?: Record<string, any>) { return this.get('/api/v1/reports', params).then(r => r.data); }
  getReport(id: string) { return this.get(`/api/v1/reports/${id}`).then(r => r.data); }
  downloadReport(id: string) { return this.client.get(`/api/v1/reports/${id}/download`, { responseType: 'blob' }); }
  deleteReport(id: string) { return this.delete(`/api/v1/reports/${id}`).then(r => r.data); }

  // --- Dashboard ---
  getDashboardOverview() { return this.get('/api/v1/dashboard/overview').then(r => r.data); }
  getDashboardResources(params?: Record<string, any>) { return this.get('/api/v1/dashboard/resources', params).then(r => r.data); }
  getDashboardProviders() { return this.get('/api/v1/dashboard/providers').then(r => r.data); }
  getDashboardTrends(params?: Record<string, any>) { return this.get('/api/v1/dashboard/trends', params).then(r => r.data); }
  getDashboardTerraformVersions() { return this.get('/api/v1/dashboard/terraform-versions').then(r => r.data); }
  getDashboardOrganizations() { return this.get('/api/v1/dashboard/organizations').then(r => r.data); }
  getDashboardWorkspaces() { return this.get('/api/v1/dashboard/workspaces').then(r => r.data); }

  // --- Scheduler ---
  listScheduledTasks(params?: Record<string, any>) { return this.get('/api/v1/scheduler/tasks', params).then(r => r.data); }
  createScheduledTask(data: any) { return this.post('/api/v1/scheduler/tasks', data).then(r => r.data); }
  getScheduledTask(id: string) { return this.get(`/api/v1/scheduler/tasks/${id}`).then(r => r.data); }
  updateScheduledTask(id: string, data: any) { return this.put(`/api/v1/scheduler/tasks/${id}`, data).then(r => r.data); }
  deleteScheduledTask(id: string) { return this.delete(`/api/v1/scheduler/tasks/${id}`).then(r => r.data); }
  triggerScheduledTask(id: string) { return this.post(`/api/v1/scheduler/tasks/${id}/trigger`).then(r => r.data); }

  // --- Snapshots ---
  listSnapshots(params?: Record<string, any>) { return this.get('/api/v1/snapshots', params).then(r => r.data); }
  getSnapshot(id: string) { return this.get(`/api/v1/snapshots/${id}`).then(r => r.data); }
  captureSnapshot(data: any) { return this.post('/api/v1/snapshots/capture', data).then(r => r.data); }
  compareSnapshots(params: Record<string, any>) { return this.get('/api/v1/snapshots/compare', params).then(r => r.data); }

  // --- Drift ---
  listDriftEvents(params?: Record<string, any>) { return this.get('/api/v1/drift/events', params).then(r => r.data); }
  getDriftEvent(id: string) { return this.get(`/api/v1/drift/events/${id}`).then(r => r.data); }

  // --- Backups ---
  listBackups(params?: Record<string, any>) { return this.get('/api/v1/backups', params).then(r => r.data); }
  createBackup(data: any) { return this.post('/api/v1/backups/create', data).then(r => r.data); }
  createBulkBackup(data: any) { return this.post('/api/v1/backups/create-bulk', data).then(r => r.data); }
  getBackup(id: string) { return this.get(`/api/v1/backups/${id}`).then(r => r.data); }
  deleteBackup(id: string) { return this.delete(`/api/v1/backups/${id}`).then(r => r.data); }
  restoreBackup(id: string) { return this.post(`/api/v1/backups/${id}/restore`).then(r => r.data); }
  verifyBackup(id: string) { return this.post(`/api/v1/backups/${id}/verify`).then(r => r.data); }

  // --- Retention Policies ---
  listRetentionPolicies(params?: Record<string, any>) { return this.get('/api/v1/backups/retention', params).then(r => r.data); }
  createRetentionPolicy(data: any) { return this.post('/api/v1/backups/retention', data).then(r => r.data); }
  getRetentionPolicy(id: string) { return this.get(`/api/v1/backups/retention/${id}`).then(r => r.data); }
  updateRetentionPolicy(id: string, data: any) { return this.put(`/api/v1/backups/retention/${id}`, data).then(r => r.data); }
  deleteRetentionPolicy(id: string) { return this.delete(`/api/v1/backups/retention/${id}`).then(r => r.data); }
  applyRetention() { return this.post('/api/v1/backups/retention/apply').then(r => r.data); }

  // --- Migrations ---
  createMigration(data: any) { return this.post('/api/v1/migrations', data).then(r => r.data); }
  listMigrations(params?: Record<string, any>) { return this.get('/api/v1/migrations', params).then(r => r.data); }
  getMigration(id: string) { return this.get(`/api/v1/migrations/${id}`).then(r => r.data); }
  cancelMigration(id: string) { return this.post(`/api/v1/migrations/${id}/cancel`).then(r => r.data); }
  validateMigration(data: any) { return this.post('/api/v1/migrations/validate', data).then(r => r.data); }
  dryRunMigration(data: any) { return this.post('/api/v1/migrations/dry-run', data).then(r => r.data); }

  // --- Alerts ---
  listAlerts(params?: Record<string, any>) { return this.get('/api/v1/alerts', params).then(r => r.data); }
  acknowledgeAlert(id: string) { return this.put(`/api/v1/alerts/${id}/acknowledge`).then(r => r.data); }
  listAlertRules(params?: Record<string, any>) { return this.get('/api/v1/alerts/rules', params).then(r => r.data); }
  createAlertRule(data: any) { return this.post('/api/v1/alerts/rules', data).then(r => r.data); }
  getAlertRule(id: string) { return this.get(`/api/v1/alerts/rules/${id}`).then(r => r.data); }
  updateAlertRule(id: string, data: any) { return this.put(`/api/v1/alerts/rules/${id}`, data).then(r => r.data); }
  deleteAlertRule(id: string) { return this.delete(`/api/v1/alerts/rules/${id}`).then(r => r.data); }

  // --- Notification Channels ---
  listNotificationChannels(params?: Record<string, any>) { return this.get('/api/v1/notifications/channels', params).then(r => r.data); }
  createNotificationChannel(data: any) { return this.post('/api/v1/notifications/channels', data).then(r => r.data); }
  getNotificationChannel(id: string) { return this.get(`/api/v1/notifications/channels/${id}`).then(r => r.data); }
  updateNotificationChannel(id: string, data: any) { return this.put(`/api/v1/notifications/channels/${id}`, data).then(r => r.data); }
  deleteNotificationChannel(id: string) { return this.delete(`/api/v1/notifications/channels/${id}`).then(r => r.data); }
  testNotificationChannel(id: string) { return this.post(`/api/v1/notifications/channels/${id}/test`).then(r => r.data); }

  // --- Compliance ---
  listCompliancePolicies(params?: Record<string, any>) { return this.get('/api/v1/compliance/policies', params).then(r => r.data); }
  createCompliancePolicy(data: any) { return this.post('/api/v1/compliance/policies', data).then(r => r.data); }
  getCompliancePolicy(id: string) { return this.get(`/api/v1/compliance/policies/${id}`).then(r => r.data); }
  updateCompliancePolicy(id: string, data: any) { return this.put(`/api/v1/compliance/policies/${id}`, data).then(r => r.data); }
  deleteCompliancePolicy(id: string) { return this.delete(`/api/v1/compliance/policies/${id}`).then(r => r.data); }
  getComplianceResults(params?: Record<string, any>) { return this.get('/api/v1/compliance/results', params).then(r => r.data); }
  getComplianceScore() { return this.get('/api/v1/compliance/score').then(r => r.data); }

  // --- Webhooks ---
  triggerWebhook(data: any) { return this.post('/api/v1/webhooks/trigger', data).then(r => r.data); }
}

const apiClient = new ApiClient();
export default apiClient;
