export interface DashboardOverview {
  total_rum: number;
  total_managed: number;
  total_resources: number;
  total_data_sources: number;
  total_workspaces: number;
  successful_workspaces: number;
  failed_workspaces: number;
  last_run_at: string | null;
}

export interface ResourceBreakdown {
  resource_type: string;
  count: number;
}

export interface ProviderDistribution {
  provider: string;
  resource_count: number;
  workspace_count: number;
}

export interface TrendDataPoint {
  run_id: string;
  completed_at: string;
  total_rum: number;
  total_managed: number;
  total_resources: number;
  total_workspaces: number;
  successful_count: number;
  failed_count: number;
}

export interface TerraformVersionInfo {
  version: string;
  count: number;
}

/** One workspace's Terraform version pin-drift result. */
export interface VersionDriftEntry {
  workspace_name: string;
  /** The declared required_version constraint (e.g. "~> 1.5"). */
  required: string;
  /** The in-state terraform_version (e.g. "1.6.2"). */
  actual: string;
  /** Whether the actual version satisfies the required constraint. */
  satisfies: boolean;
  /** Drift status for the workspace. */
  status: 'satisfied' | 'drift' | 'unknown';
}

/**
 * Terraform version pin-drift summary for the latest completed analysis run:
 * per-workspace entries plus rollup counts by status. Only workspaces whose
 * analysis carried repo metadata produce an entry.
 */
export interface VersionDrift {
  run_id: string;
  total: number;
  satisfied: number;
  drift: number;
  unknown: number;
  entries: VersionDriftEntry[];
}

export interface Report {
  id: string;
  organization_id: string;
  run_id: string | null;
  name: string;
  format: string;
  storage_path: string;
  file_size_bytes: number | null;
  generated_by: string | null;
  created_at: string;
}

export interface GenerateReportRequest {
  run_id: string;
  format: 'markdown' | 'json' | 'csv';
  name?: string;
}
