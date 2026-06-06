import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type {
  User,
  UserMembership,
  RoleTemplateInfo,
  AuditLog,
  AuditLogListResponse,
  OIDCConfigResponse,
  OIDCGroupMappingInput,
} from '../types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '',
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('tsm_auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get<T = any>(url: string, params?: Record<string, any>): Promise<AxiosResponse<T>> {
    return this.client.get(url, { params });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post(url, data, config);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put(url, data, config);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete(url, config);
  }

  // ===========================================================================
  // Setup
  // ===========================================================================

  getSetupStatus() { return this.get('/api/v1/setup/status').then(r => r.data); }
  validateSetupToken(token: string) { return this.post('/api/v1/setup/validate-token', { token }).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  testOIDCConfig(config: any) { return this.post('/api/v1/setup/oidc/test', config).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  saveOIDCConfig(config: any) { return this.post('/api/v1/setup/oidc', config).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  testStorageConfig(config: any) { return this.post('/api/v1/setup/storage/test', config).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  saveStorageConfig(config: any) { return this.post('/api/v1/setup/storage', config).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  configureAdmin(config: any) { return this.post('/api/v1/setup/admin', config).then(r => r.data); }
  completeSetup() { return this.post('/api/v1/setup/complete').then(r => r.data); }

  // ===========================================================================
  // Auth
  // ===========================================================================

  async getAuthProviders(): Promise<{ providers: Array<{ type: string; name: string; id?: string }> }> {
    const response = await this.client.get('/api/v1/auth/providers');
    return response.data;
  }

  login(provider: string) {
    window.location.href = `/api/v1/auth/login?provider=${provider}`;
  }

  async ldapLogin(username: string, password: string): Promise<{ token: string }> {
    const response = await this.client.post('/api/v1/auth/ldap/login', { username, password });
    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getCurrentUser(): Promise<any> {
    const response = await this.client.get('/api/v1/auth/me');
    return response.data.user;
  }

  async getCurrentUserWithRole(): Promise<{
    user: User;
    role_template: RoleTemplateInfo | null;
    allowed_scopes: string[];
    session_expires_at: string | null;
  }> {
    const response = await this.client.get('/api/v1/auth/me');
    return {
      user: response.data.user,
      role_template: response.data.role_template || null,
      allowed_scopes: response.data.allowed_scopes || [],
      session_expires_at: response.data.session_expires_at || null,
    };
  }

  refreshToken() { return this.post('/api/v1/auth/refresh').then(r => r.data); }

  logout() {
    window.location.href = '/api/v1/auth/logout';
  }

  // ===========================================================================
  // Dev
  // ===========================================================================

  getDevStatus() { return this.get('/api/v1/dev/status').then(r => r.data); }
  listUsersForImpersonation() { return this.get('/api/v1/dev/users').then(r => r.data); }
  impersonateUser(userId: string) { return this.post(`/api/v1/dev/impersonate/${userId}`).then(r => r.data); }

  // ===========================================================================
  // Admin Stats
  // ===========================================================================

  getAdminDashboardStats() { return this.get('/api/v1/admin/stats/dashboard').then(r => r.data); }

  // ===========================================================================
  // Users
  // ===========================================================================

  private transformUser(user: Record<string, unknown>): User {
    return {
      id: (user.ID || user.id) as string,
      email: (user.Email || user.email) as string,
      name: (user.Name || user.name) as string,
      oidc_sub: (user.OidcSub || user.oidc_sub) as string | undefined,
      role_template_id: (user.RoleTemplateID || user.role_template_id) as string | undefined,
      role_template_name: (user.RoleTemplateName || user.role_template_name) as string | undefined,
      role_template_display_name: (user.RoleTemplateDisplayName || user.role_template_display_name) as string | undefined,
      created_at: (user.CreatedAt || user.created_at) as string,
      updated_at: (user.UpdatedAt || user.updated_at) as string,
      memberships: (user.memberships || user.Memberships) as UserMembership[] | undefined,
    };
  }

  async listUsers(page = 1, perPage = 20) {
    const response = await this.client.get('/api/v1/users', {
      params: { page, per_page: perPage },
    });
    const users = response.data.users || [];
    return {
      users: users.map((user: Record<string, unknown>) => this.transformUser(user)),
      pagination: response.data.pagination,
    };
  }

  async searchUsers(query: string, page = 1, perPage = 20) {
    const response = await this.client.get('/api/v1/users/search', {
      params: { q: query, page, per_page: perPage },
    });
    const users = response.data.users || [];
    return {
      users: users.map((user: Record<string, unknown>) => this.transformUser(user)),
      pagination: response.data.pagination,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getUser(id: string): Promise<any> {
    const response = await this.client.get(`/api/v1/users/${id}`);
    return this.transformUser(response.data.user);
  }

  async createUser(data: { email: string; name: string }) {
    const response = await this.client.post('/api/v1/users', data);
    return this.transformUser(response.data.user);
  }

  async updateUser(id: string, data: { name?: string; email?: string }) {
    const response = await this.client.put(`/api/v1/users/${id}`, data);
    return this.transformUser(response.data.user);
  }

  async deleteUser(id: string) {
    const response = await this.client.delete(`/api/v1/users/${id}`);
    return response.data;
  }

  async getUserMemberships(userId: string): Promise<UserMembership[]> {
    const response = await this.client.get(`/api/v1/users/${userId}/memberships`);
    return response.data.memberships || [];
  }

  async getCurrentUserMemberships(): Promise<UserMembership[]> {
    const response = await this.client.get('/api/v1/users/me/memberships');
    return response.data.memberships || [];
  }

  // GDPR Article 15/20 — full data export
  async exportUserData(id: string): Promise<{ blob: Blob; filename: string }> {
    const response = await this.client.get(`/api/v1/admin/users/${id}/export`, {
      responseType: 'blob',
    });
    let filename = `user-data-${id}.json`;
    const disposition = response.headers['content-disposition'];
    if (disposition) {
      const match = /filename\s*=\s*"?([^";]+)"?/i.exec(disposition);
      if (match && match[1]) {
        filename = match[1].trim();
      }
    }
    return { blob: response.data as Blob, filename };
  }

  // GDPR Article 17 — anonymize user PII
  async eraseUser(id: string): Promise<{ message: string; user_id: string }> {
    const response = await this.client.post(`/api/v1/admin/users/${id}/erase`);
    return response.data as { message: string; user_id: string };
  }

  // ===========================================================================
  // Organizations
  // ===========================================================================

  private transformOrganization(org: Record<string, unknown>) {
    return {
      id: org.id as string,
      name: org.name as string,
      display_name: org.display_name as string,
      idp_type: (org.idp_type ?? null) as string | null,
      idp_name: (org.idp_name ?? null) as string | null,
      created_at: org.created_at as string,
      updated_at: org.updated_at as string,
    };
  }

  async listOrganizations(page = 1, perPage = 20) {
    const response = await this.client.get('/api/v1/organizations', {
      params: { page, per_page: perPage },
    });
    const orgs = response.data.organizations || [];
    return orgs.map((org: Record<string, unknown>) => this.transformOrganization(org));
  }

  async searchOrganizations(query: string, page = 1, perPage = 20) {
    const response = await this.client.get('/api/v1/organizations/search', {
      params: { q: query, page, per_page: perPage },
    });
    const orgs = response.data.organizations || [];
    return orgs.map((org: Record<string, unknown>) => this.transformOrganization(org));
  }

  async getOrganization(id: string) {
    const response = await this.client.get(`/api/v1/organizations/${id}`);
    return this.transformOrganization(response.data.organization);
  }

  async createOrganization(data: { name: string; display_name: string }) {
    const response = await this.client.post('/api/v1/organizations', data);
    return this.transformOrganization(response.data.organization);
  }

  async updateOrganization(id: string, data: { name?: string; display_name: string; idp_type?: string | null; idp_name?: string | null }) {
    const response = await this.client.put(`/api/v1/organizations/${id}`, data);
    return this.transformOrganization(response.data.organization);
  }

  async deleteOrganization(id: string) {
    const response = await this.client.delete(`/api/v1/organizations/${id}`);
    return response.data;
  }

  async listOrganizationMembers(orgId: string) {
    const response = await this.client.get(`/api/v1/organizations/${orgId}/members`);
    return response.data.members || [];
  }

  async addOrganizationMember(orgId: string, data: { user_id: string; role_template_id?: string }) {
    const response = await this.client.post(`/api/v1/organizations/${orgId}/members`, data);
    return response.data;
  }

  async updateOrganizationMember(orgId: string, userId: string, data: { role_template_id?: string }) {
    const response = await this.client.put(`/api/v1/organizations/${orgId}/members/${userId}`, data);
    return response.data;
  }

  async removeOrganizationMember(orgId: string, userId: string) {
    const response = await this.client.delete(`/api/v1/organizations/${orgId}/members/${userId}`);
    return response.data;
  }

  // ===========================================================================
  // API Keys (canonical endpoint: /api/v1/apikeys)
  // ===========================================================================

  async listAPIKeys(organizationId?: string) {
    const response = await this.client.get('/api/v1/apikeys', {
      params: organizationId ? { organization_id: organizationId } : {},
    });
    const rawKeys = response.data?.keys || [];
    return rawKeys.map((k: Record<string, unknown>) => ({
      id: k.id || k.ID,
      user_id: k.user_id || k.UserID,
      user_name: k.user_name || k.UserName || null,
      organization_id: k.organization_id || k.OrganizationID,
      name: k.name || k.Name || '',
      description: k.description || k.Description || '',
      key_prefix: k.key_prefix || k.KeyPrefix || '',
      scopes: k.scopes || k.Scopes || [],
      expires_at: k.expires_at || k.ExpiresAt || null,
      last_used_at: k.last_used_at || k.LastUsedAt || null,
      created_at: k.created_at || k.CreatedAt || '',
    }));
  }

  async createAPIKey(data: { name: string; organization_id: string; description?: string; scopes: string[]; expires_at?: string }) {
    const response = await this.client.post('/api/v1/apikeys', data);
    return response.data;
  }

  async getAPIKey(id: string) {
    const response = await this.client.get(`/api/v1/apikeys/${id}`);
    return response.data;
  }

  async updateAPIKey(id: string, data: { name?: string; scopes?: string[]; expires_at?: string }) {
    const response = await this.client.put(`/api/v1/apikeys/${id}`, data);
    return response.data;
  }

  async deleteAPIKey(id: string) {
    const response = await this.client.delete(`/api/v1/apikeys/${id}`);
    return response.data;
  }

  async rotateAPIKey(id: string, gracePeriodHours = 0) {
    const response = await this.client.post(`/api/v1/apikeys/${id}/rotate`, {
      grace_period_hours: gracePeriodHours,
    });
    return response.data;
  }

  // ===========================================================================
  // Role Templates
  // ===========================================================================

  async listRoleTemplates() {
    const response = await this.client.get('/api/v1/admin/role-templates');
    return response.data || [];
  }

  async getRoleTemplate(id: string) {
    const response = await this.client.get(`/api/v1/admin/role-templates/${id}`);
    return response.data;
  }

  async createRoleTemplate(data: { name: string; display_name: string; description?: string; scopes: string[] }) {
    const response = await this.client.post('/api/v1/admin/role-templates', data);
    return response.data;
  }

  async updateRoleTemplate(id: string, data: { name?: string; display_name?: string; description?: string; scopes?: string[] }) {
    const response = await this.client.put(`/api/v1/admin/role-templates/${id}`, data);
    return response.data;
  }

  async deleteRoleTemplate(id: string) {
    const response = await this.client.delete(`/api/v1/admin/role-templates/${id}`);
    return response.data;
  }

  // ===========================================================================
  // OIDC Config (admin runtime)
  // ===========================================================================

  async getAdminOIDCConfig(): Promise<OIDCConfigResponse> {
    const response = await this.client.get('/api/v1/admin/oidc/config');
    return response.data;
  }

  async updateOIDCGroupMapping(data: OIDCGroupMappingInput): Promise<OIDCConfigResponse> {
    const response = await this.client.put('/api/v1/admin/oidc/group-mapping', data);
    return response.data;
  }

  // ===========================================================================
  // Audit Logs
  // ===========================================================================

  async listAuditLogs(opts?: {
    page?: number;
    per_page?: number;
    action?: string;
    resource_type?: string;
    user_id?: string;
    user_email?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<AuditLogListResponse> {
    const response = await this.client.get('/api/v1/admin/audit-logs', { params: opts });
    return response.data;
  }

  async getAuditLog(id: string): Promise<AuditLog> {
    const response = await this.client.get(`/api/v1/admin/audit-logs/${id}`);
    return response.data;
  }

  exportAuditLogsCSV(logs: AuditLog[]): void {
    const header = ['id', 'created_at', 'action', 'resource_type', 'resource_id', 'user_email', 'user_name', 'organization_id', 'ip_address'];
    const rows = logs.map((l) =>
      [l.id, l.created_at, l.action, l.resource_type ?? '', l.resource_id ?? '', l.user_email ?? '', l.user_name ?? '', l.organization_id ?? '', l.ip_address ?? '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportAuditLogsJSON(logs: AuditLog[]): void {
    const json = JSON.stringify(logs, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ===========================================================================
  // Sources
  // ===========================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listSources(params?: Record<string, any>) { return this.get('/api/v1/sources', params).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createSource(data: any) { return this.post('/api/v1/sources', data).then(r => r.data); }
  getSource(id: string) { return this.get(`/api/v1/sources/${id}`).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateSource(id: string, data: any) { return this.put(`/api/v1/sources/${id}`, data).then(r => r.data); }
  deleteSource(id: string) { return this.delete(`/api/v1/sources/${id}`).then(r => r.data); }
  testSource(id: string) { return this.post(`/api/v1/sources/${id}/test`).then(r => r.data); }

  // ===========================================================================
  // Analysis
  // ===========================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  startAnalysis(data: any) { return this.post('/api/v1/analysis/run', data).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listAnalysisRuns(params?: Record<string, any>) { return this.get('/api/v1/analysis/runs', params).then(r => r.data); }
  getAnalysisRun(id: string) { return this.get(`/api/v1/analysis/runs/${id}`).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAnalysisRunResults(id: string, params?: Record<string, any>) { return this.get(`/api/v1/analysis/runs/${id}/results`, params).then(r => r.data); }
  cancelAnalysisRun(id: string) { return this.post(`/api/v1/analysis/runs/${id}/cancel`).then(r => r.data); }
  getAnalysisSummary() { return this.get('/api/v1/analysis/summary').then(r => r.data); }

  // ===========================================================================
  // Reports
  // ===========================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateReport(data: any) { return this.post('/api/v1/reports/generate', data).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listReports(params?: Record<string, any>) { return this.get('/api/v1/reports', params).then(r => r.data); }
  getReport(id: string) { return this.get(`/api/v1/reports/${id}`).then(r => r.data); }
  downloadReport(id: string) { return this.client.get(`/api/v1/reports/${id}/download`, { responseType: 'blob' }); }
  deleteReport(id: string) { return this.delete(`/api/v1/reports/${id}`).then(r => r.data); }

  // ===========================================================================
  // Dashboard
  // ===========================================================================

  getDashboardOverview() { return this.get('/api/v1/dashboard/overview').then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDashboardResources(params?: Record<string, any>) { return this.get('/api/v1/dashboard/resources', params).then(r => r.data); }
  getDashboardProviders() { return this.get('/api/v1/dashboard/providers').then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDashboardTrends(params?: Record<string, any>) { return this.get('/api/v1/dashboard/trends', params).then(r => r.data); }
  getDashboardTerraformVersions() { return this.get('/api/v1/dashboard/terraform-versions').then(r => r.data); }
  getDashboardOrganizations() { return this.get('/api/v1/dashboard/organizations').then(r => r.data); }
  getDashboardWorkspaces() { return this.get('/api/v1/dashboard/workspaces').then(r => r.data); }

  // ===========================================================================
  // Scheduler
  // ===========================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listScheduledTasks(params?: Record<string, any>) { return this.get('/api/v1/scheduler/tasks', params).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createScheduledTask(data: any) { return this.post('/api/v1/scheduler/tasks', data).then(r => r.data); }
  getScheduledTask(id: string) { return this.get(`/api/v1/scheduler/tasks/${id}`).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateScheduledTask(id: string, data: any) { return this.put(`/api/v1/scheduler/tasks/${id}`, data).then(r => r.data); }
  deleteScheduledTask(id: string) { return this.delete(`/api/v1/scheduler/tasks/${id}`).then(r => r.data); }
  triggerScheduledTask(id: string) { return this.post(`/api/v1/scheduler/tasks/${id}/trigger`).then(r => r.data); }

  // ===========================================================================
  // Snapshots
  // ===========================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listSnapshots(params?: Record<string, any>) { return this.get('/api/v1/snapshots', params).then(r => r.data); }
  getSnapshot(id: string) { return this.get(`/api/v1/snapshots/${id}`).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  captureSnapshot(data: any) { return this.post('/api/v1/snapshots/capture', data).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compareSnapshots(params: Record<string, any>) { return this.get('/api/v1/snapshots/compare', params).then(r => r.data); }

  // ===========================================================================
  // Drift
  // ===========================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listDriftEvents(params?: Record<string, any>) { return this.get('/api/v1/drift/events', params).then(r => r.data); }
  getDriftEvent(id: string) { return this.get(`/api/v1/drift/events/${id}`).then(r => r.data); }

  // ===========================================================================
  // Backups
  // ===========================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listBackups(params?: Record<string, any>) { return this.get('/api/v1/backups', params).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createBackup(data: any) { return this.post('/api/v1/backups/create', data).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createBulkBackup(data: any) { return this.post('/api/v1/backups/create-bulk', data).then(r => r.data); }
  getBackup(id: string) { return this.get(`/api/v1/backups/${id}`).then(r => r.data); }
  deleteBackup(id: string) { return this.delete(`/api/v1/backups/${id}`).then(r => r.data); }
  restoreBackup(id: string) { return this.post(`/api/v1/backups/${id}/restore`).then(r => r.data); }
  verifyBackup(id: string) { return this.post(`/api/v1/backups/${id}/verify`).then(r => r.data); }

  // ===========================================================================
  // Retention Policies
  // ===========================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listRetentionPolicies(params?: Record<string, any>) { return this.get('/api/v1/backups/retention', params).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createRetentionPolicy(data: any) { return this.post('/api/v1/backups/retention', data).then(r => r.data); }
  getRetentionPolicy(id: string) { return this.get(`/api/v1/backups/retention/${id}`).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateRetentionPolicy(id: string, data: any) { return this.put(`/api/v1/backups/retention/${id}`, data).then(r => r.data); }
  deleteRetentionPolicy(id: string) { return this.delete(`/api/v1/backups/retention/${id}`).then(r => r.data); }
  applyRetention() { return this.post('/api/v1/backups/retention/apply').then(r => r.data); }

  // ===========================================================================
  // Migrations
  // ===========================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createMigration(data: any) { return this.post('/api/v1/migrations', data).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listMigrations(params?: Record<string, any>) { return this.get('/api/v1/migrations', params).then(r => r.data); }
  getMigration(id: string) { return this.get(`/api/v1/migrations/${id}`).then(r => r.data); }
  cancelMigration(id: string) { return this.post(`/api/v1/migrations/${id}/cancel`).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validateMigration(data: any) { return this.post('/api/v1/migrations/validate', data).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dryRunMigration(data: any) { return this.post('/api/v1/migrations/dry-run', data).then(r => r.data); }

  // ===========================================================================
  // Alerts
  // ===========================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listAlerts(params?: Record<string, any>) { return this.get('/api/v1/alerts', params).then(r => r.data); }
  acknowledgeAlert(id: string) { return this.put(`/api/v1/alerts/${id}/acknowledge`).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listAlertRules(params?: Record<string, any>) { return this.get('/api/v1/alerts/rules', params).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createAlertRule(data: any) { return this.post('/api/v1/alerts/rules', data).then(r => r.data); }
  getAlertRule(id: string) { return this.get(`/api/v1/alerts/rules/${id}`).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateAlertRule(id: string, data: any) { return this.put(`/api/v1/alerts/rules/${id}`, data).then(r => r.data); }
  deleteAlertRule(id: string) { return this.delete(`/api/v1/alerts/rules/${id}`).then(r => r.data); }

  // ===========================================================================
  // Notification Channels
  // ===========================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listNotificationChannels(params?: Record<string, any>) { return this.get('/api/v1/notifications/channels', params).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createNotificationChannel(data: any) { return this.post('/api/v1/notifications/channels', data).then(r => r.data); }
  getNotificationChannel(id: string) { return this.get(`/api/v1/notifications/channels/${id}`).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateNotificationChannel(id: string, data: any) { return this.put(`/api/v1/notifications/channels/${id}`, data).then(r => r.data); }
  deleteNotificationChannel(id: string) { return this.delete(`/api/v1/notifications/channels/${id}`).then(r => r.data); }
  testNotificationChannel(id: string) { return this.post(`/api/v1/notifications/channels/${id}/test`).then(r => r.data); }

  // ===========================================================================
  // Compliance
  // ===========================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listCompliancePolicies(params?: Record<string, any>) { return this.get('/api/v1/compliance/policies', params).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createCompliancePolicy(data: any) { return this.post('/api/v1/compliance/policies', data).then(r => r.data); }
  getCompliancePolicy(id: string) { return this.get(`/api/v1/compliance/policies/${id}`).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateCompliancePolicy(id: string, data: any) { return this.put(`/api/v1/compliance/policies/${id}`, data).then(r => r.data); }
  deleteCompliancePolicy(id: string) { return this.delete(`/api/v1/compliance/policies/${id}`).then(r => r.data); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getComplianceResults(params?: Record<string, any>) { return this.get('/api/v1/compliance/results', params).then(r => r.data); }
  getComplianceScore() { return this.get('/api/v1/compliance/score').then(r => r.data); }

  // ===========================================================================
  // Webhooks
  // ===========================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  triggerWebhook(data: any) { return this.post('/api/v1/webhooks/trigger', data).then(r => r.data); }
}

const apiClient = new ApiClient();
export default apiClient;
