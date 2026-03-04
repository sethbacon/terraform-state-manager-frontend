import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert as MuiAlert,
  FormControl,
  InputLabel,
} from '@mui/material';
import type { AlertRule } from '../types/alerts';

interface AlertRulePayload {
  name: string;
  rule_type: string;
  severity: string;
  config: Record<string, any>;
  is_active: boolean;
}

interface AlertRuleFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (rule: AlertRulePayload) => void;
  editingRule?: AlertRule | null;
  error: string;
}

const RULE_TYPES = [
  'stale_workspace',
  'resource_growth',
  'rum_threshold',
  'analysis_failure',
  'drift_detected',
  'backup_failure',
  'version_outdated',
] as const;

const SEVERITIES = ['info', 'warning', 'critical'] as const;

type RuleType = (typeof RULE_TYPES)[number];

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  stale_workspace: 'stale workspace',
  resource_growth: 'resource growth',
  rum_threshold: 'rum threshold',
  analysis_failure: 'analysis failure',
  drift_detected: 'drift detected',
  backup_failure: 'backup failure',
  version_outdated: 'version outdated',
};

const getDefaultConfig = (ruleType: string): Record<string, any> => {
  switch (ruleType) {
    case 'stale_workspace':
      return { days_threshold: 30 };
    case 'resource_growth':
      return { growth_percentage: 25 };
    case 'rum_threshold':
      return { max_rum_count: 1000 };
    case 'drift_detected':
      return { min_severity: 'warning' };
    case 'version_outdated':
      return { min_version: '1.0.0' };
    case 'analysis_failure':
    case 'backup_failure':
    default:
      return {};
  }
};

const extractConfigFromRule = (rule: AlertRule): Record<string, any> => {
  const config = rule.config ?? {};
  const defaults = getDefaultConfig(rule.rule_type);
  return { ...defaults, ...config };
};

interface ConfigFieldsProps {
  ruleType: string;
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

const ConfigFields: React.FC<ConfigFieldsProps> = ({ ruleType, config, onChange }) => {
  switch (ruleType) {
    case 'stale_workspace':
      return (
        <TextField
          fullWidth
          label="Days threshold"
          type="number"
          value={config.days_threshold ?? 30}
          onChange={(e) =>
            onChange({ ...config, days_threshold: parseInt(e.target.value, 10) || 0 })
          }
          helperText="Number of days after which a workspace is considered stale"
          inputProps={{ min: 1 }}
          sx={{ mb: 2 }}
        />
      );

    case 'resource_growth':
      return (
        <TextField
          fullWidth
          label="Growth percentage threshold"
          type="number"
          value={config.growth_percentage ?? 25}
          onChange={(e) =>
            onChange({ ...config, growth_percentage: parseInt(e.target.value, 10) || 0 })
          }
          helperText="Alert when resource count grows by more than this percentage"
          inputProps={{ min: 1, max: 100 }}
          sx={{ mb: 2 }}
        />
      );

    case 'rum_threshold':
      return (
        <TextField
          fullWidth
          label="Maximum RUM count"
          type="number"
          value={config.max_rum_count ?? 1000}
          onChange={(e) =>
            onChange({ ...config, max_rum_count: parseInt(e.target.value, 10) || 0 })
          }
          helperText="Alert when RUM count exceeds this value"
          inputProps={{ min: 1 }}
          sx={{ mb: 2 }}
        />
      );

    case 'drift_detected':
      return (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Minimum severity</InputLabel>
          <Select
            value={config.min_severity ?? 'warning'}
            label="Minimum severity"
            onChange={(e) => onChange({ ...config, min_severity: e.target.value })}
          >
            <MenuItem value="info">info</MenuItem>
            <MenuItem value="warning">warning</MenuItem>
            <MenuItem value="critical">critical</MenuItem>
          </Select>
        </FormControl>
      );

    case 'version_outdated':
      return (
        <TextField
          fullWidth
          label="Minimum Terraform version"
          value={config.min_version ?? '1.0.0'}
          onChange={(e) => onChange({ ...config, min_version: e.target.value })}
          helperText="Alert when workspace Terraform version is below this value"
          sx={{ mb: 2 }}
        />
      );

    case 'analysis_failure':
      return (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
          Triggers on any analysis failure. No additional configuration required.
        </Typography>
      );

    case 'backup_failure':
      return (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
          Triggers on any backup failure. No additional configuration required.
        </Typography>
      );

    default:
      return null;
  }
};

const AlertRuleForm: React.FC<AlertRuleFormProps> = ({
  open,
  onClose,
  onSubmit,
  editingRule,
  error,
}) => {
  const [name, setName] = useState('');
  const [ruleType, setRuleType] = useState<string>('stale_workspace');
  const [severity, setSeverity] = useState<string>('warning');
  const [config, setConfig] = useState<Record<string, any>>({});
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;

    if (editingRule) {
      setName(editingRule.name);
      setRuleType(editingRule.rule_type);
      setSeverity(editingRule.severity);
      setConfig(extractConfigFromRule(editingRule));
      setIsActive(editingRule.is_active);
    } else {
      setName('');
      setRuleType('stale_workspace');
      setSeverity('warning');
      setConfig(getDefaultConfig('stale_workspace'));
      setIsActive(true);
    }
  }, [open, editingRule]);

  const handleRuleTypeChange = useCallback(
    (newType: string) => {
      setRuleType(newType);
      setConfig(getDefaultConfig(newType));
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    onSubmit({
      name,
      rule_type: ruleType,
      severity,
      config,
      is_active: isActive,
    });
  }, [name, ruleType, severity, config, isActive, onSubmit]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}</DialogTitle>
      <DialogContent>
        {error && (
          <MuiAlert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </MuiAlert>
        )}

        <TextField
          fullWidth
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mt: 1, mb: 2 }}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Rule Type</InputLabel>
          <Select
            value={ruleType}
            label="Rule Type"
            onChange={(e) => handleRuleTypeChange(e.target.value)}
          >
            {RULE_TYPES.map((rt) => (
              <MenuItem key={rt} value={rt}>
                {RULE_TYPE_LABELS[rt]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Severity</InputLabel>
          <Select
            value={severity}
            label="Severity"
            onChange={(e) => setSeverity(e.target.value)}
          >
            {SEVERITIES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Configuration
          </Typography>
          <ConfigFields ruleType={ruleType} config={config} onChange={setConfig} />
        </Box>

        <FormControlLabel
          control={
            <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          }
          label="Active"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!name}>
          {editingRule ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AlertRuleForm;
