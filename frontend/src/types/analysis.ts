export type SourceType =
  | 'hcp_terraform'
  | 'azure_blob'
  | 's3'
  | 'gcs'
  | 'consul'
  | 'pg'
  | 'kubernetes'
  | 'http'
  | 'local';

export interface StateSource {
  id: string;
  organization_id: string;
  name: string;
  source_type: SourceType;
  config: Record<string, unknown>;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_status: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AnalysisRun {
  id: string;
  organization_id: string;
  source_id: string;
  status: RunStatus;
  trigger_type: string;
  config: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  total_workspaces: number;
  successful_count: number;
  failed_count: number;
  total_rum: number;
  total_managed: number;
  total_resources: number;
  total_data_sources: number;
  error_message: string | null;
  performance_ms: number;
  triggered_by: string;
  created_at: string;
}

export interface AnalysisResult {
  id: string;
  run_id: string;
  workspace_id: string;
  workspace_name: string;
  organization: string;
  status: string;
  error_type: string | null;
  error_message: string | null;
  total_resources: number;
  managed_count: number;
  rum_count: number;
  data_source_count: number;
  null_resource_count: number;
  resources_by_type: Record<string, number>;
  resources_by_module: Record<string, number>;
  provider_analysis: ProviderAnalysis | null;
  terraform_version: string;
  state_serial: number;
  state_lineage: string;
  last_modified: string | null;
  analysis_method: string;
  created_at: string;
}

export interface ProviderAnalysis {
  provider_versions: Record<string, string>;
  provider_usage: Record<
    string,
    { resource_count: number; resource_types: string[]; modules: string[] }
  >;
  provider_statistics: {
    total_providers: number;
    providers_with_versions: number;
    providers_without_versions: number;
  };
}

export interface AnalysisSummary {
  total_rum: number;
  total_managed: number;
  total_resources: number;
  total_data_sources: number;
  total_workspaces: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
