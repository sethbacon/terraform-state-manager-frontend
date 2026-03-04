export interface NotificationChannel {
  id: string;
  organization_id: string;
  name: string;
  channel_type: 'webhook' | 'slack' | 'teams' | 'email';
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertRule {
  id: string;
  organization_id: string;
  name: string;
  rule_type: 'stale_workspace' | 'resource_growth' | 'rum_threshold' | 'analysis_failure' | 'drift_detected' | 'backup_failure' | 'version_outdated';
  config: Record<string, unknown>;
  severity: 'info' | 'warning' | 'critical';
  channel_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  organization_id: string;
  rule_id: string | null;
  workspace_name: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  metadata: Record<string, unknown>;
  is_acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface CompliancePolicy {
  id: string;
  organization_id: string;
  name: string;
  policy_type: 'tagging' | 'naming' | 'version' | 'custom';
  config: Record<string, unknown>;
  severity: 'info' | 'warning' | 'critical';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComplianceResult {
  id: string;
  policy_id: string;
  run_id: string;
  workspace_name: string;
  status: 'pass' | 'fail' | 'warning';
  violations: Array<{ message: string; resource?: string }>;
  created_at: string;
}

export interface ComplianceScore {
  total_checks: number;
  pass_count: number;
  fail_count: number;
  warning_count: number;
  score_percent: number;
}
