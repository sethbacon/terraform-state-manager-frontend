import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Stack,
  Typography,
  Divider,
} from '@mui/material';
import { StateSource, SourceType } from '../types/analysis';

interface SourceConfigFormProps {
  source?: StateSource;
  onSubmit: (data: Partial<StateSource>) => void;
  onCancel: () => void;
}

interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'password' | 'multiline';
  required?: boolean;
  helperText?: string;
}

const sourceTypeOptions: { value: SourceType; label: string }[] = [
  { value: 'hcp_terraform', label: 'HCP Terraform' },
  { value: 'azure_blob', label: 'Azure Blob Storage' },
  { value: 's3', label: 'AWS S3' },
  { value: 'gcs', label: 'Google Cloud Storage' },
  { value: 'consul', label: 'Consul' },
  { value: 'pg', label: 'PostgreSQL' },
  { value: 'kubernetes', label: 'Kubernetes' },
  { value: 'http', label: 'HTTP' },
  { value: 'local', label: 'Local Filesystem' },
];

const sourceTypeFields: Record<SourceType, FieldDef[]> = {
  hcp_terraform: [
    { key: 'token', label: 'API Token', type: 'password', required: true },
    { key: 'base_url', label: 'Base URL', helperText: 'Defaults to https://app.terraform.io/api/v2' },
    { key: 'organization', label: 'Organization', required: true },
  ],
  azure_blob: [
    { key: 'account_name', label: 'Account Name', required: true },
    { key: 'container_name', label: 'Container Name', required: true },
    { key: 'prefix', label: 'Prefix' },
    { key: 'key', label: 'Access Key', type: 'password', required: true },
  ],
  s3: [
    { key: 'bucket', label: 'Bucket', required: true },
    { key: 'region', label: 'Region', required: true },
    { key: 'prefix', label: 'Prefix' },
    { key: 'access_key_id', label: 'Access Key ID', type: 'password' },
    { key: 'secret_access_key', label: 'Secret Access Key', type: 'password' },
    { key: 'endpoint', label: 'Custom Endpoint', helperText: 'For S3-compatible storage' },
  ],
  gcs: [
    { key: 'bucket', label: 'Bucket', required: true },
    { key: 'prefix', label: 'Prefix' },
    { key: 'credentials_json', label: 'Service Account Credentials JSON', type: 'multiline' },
  ],
  consul: [
    { key: 'address', label: 'Address', required: true, helperText: 'e.g., consul.example.com:8500' },
    { key: 'scheme', label: 'Scheme', helperText: 'http or https' },
    { key: 'datacenter', label: 'Datacenter' },
    { key: 'token', label: 'ACL Token', type: 'password' },
    { key: 'path', label: 'KV Path Prefix' },
  ],
  pg: [
    { key: 'conn_str', label: 'Connection String', type: 'password', required: true, helperText: 'postgres://user:pass@host:port/dbname' },
    { key: 'schema_name', label: 'Schema Name', helperText: 'Defaults to terraform_remote_state' },
  ],
  kubernetes: [
    { key: 'namespace', label: 'Namespace' },
    { key: 'labels', label: 'Labels', helperText: 'Comma-separated key=value pairs' },
    { key: 'kubeconfig', label: 'Kubeconfig', type: 'multiline' },
  ],
  http: [
    { key: 'address', label: 'State Address', required: true },
    { key: 'lock_address', label: 'Lock Address' },
    { key: 'unlock_address', label: 'Unlock Address' },
    { key: 'username', label: 'Username' },
    { key: 'password', label: 'Password', type: 'password' },
  ],
  local: [
    { key: 'path', label: 'Path', required: true, helperText: 'Absolute path or glob pattern to state files' },
  ],
};

const SourceConfigForm: React.FC<SourceConfigFormProps> = ({ source, onSubmit, onCancel }) => {
  const [name, setName] = useState(source?.name || '');
  const [sourceType, setSourceType] = useState<SourceType>(source?.source_type || 'hcp_terraform');
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (source) {
      setName(source.name);
      setSourceType(source.source_type);
      const existingConfig: Record<string, string> = {};
      for (const [key, value] of Object.entries(source.config)) {
        existingConfig[key] = typeof value === 'string' ? value : JSON.stringify(value);
      }
      setConfigValues(existingConfig);
    }
  }, [source]);

  const handleConfigChange = useCallback((key: string, value: string) => {
    setConfigValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleNameChange = useCallback((value: string) => {
    setName(value);
    setErrors((prev) => {
      const next = { ...prev };
      delete next['name'];
      return next;
    });
  }, []);

  const handleSourceTypeChange = useCallback((value: SourceType) => {
    setSourceType(value);
    setConfigValues({});
    setErrors({});
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors['name'] = 'Name is required';
    }

    const fields = sourceTypeFields[sourceType] || [];
    for (const field of fields) {
      if (field.required && !configValues[field.key]?.trim()) {
        newErrors[field.key] = `${field.label} is required`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, sourceType, configValues]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      const config: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(configValues)) {
        if (value.trim()) {
          config[key] = value;
        }
      }

      onSubmit({
        ...(source?.id ? { id: source.id } : {}),
        name: name.trim(),
        source_type: sourceType,
        config,
      });
    },
    [validate, configValues, source, name, sourceType, onSubmit]
  );

  const fields = sourceTypeFields[sourceType] || [];

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ pt: 1 }}>
      <Stack spacing={2.5}>
        <TextField
          label="Source Name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          fullWidth
          error={!!errors['name']}
          helperText={errors['name']}
          placeholder="My Terraform Backend"
        />

        <TextField
          select
          label="Source Type"
          value={sourceType}
          onChange={(e) => handleSourceTypeChange(e.target.value as SourceType)}
          fullWidth
          disabled={!!source}
        >
          {sourceTypeOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>

        {fields.length > 0 && (
          <>
            <Divider />
            <Typography variant="subtitle2" color="text.secondary">
              Configuration
            </Typography>
          </>
        )}

        {fields.map((field) => (
          <TextField
            key={field.key}
            label={field.label}
            value={configValues[field.key] || ''}
            onChange={(e) => handleConfigChange(field.key, e.target.value)}
            required={field.required}
            fullWidth
            type={field.type === 'password' ? 'password' : 'text'}
            multiline={field.type === 'multiline'}
            minRows={field.type === 'multiline' ? 3 : undefined}
            maxRows={field.type === 'multiline' ? 8 : undefined}
            error={!!errors[field.key]}
            helperText={errors[field.key] || field.helperText}
          />
        ))}
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="contained">
          {source ? 'Update Source' : 'Add Source'}
        </Button>
      </Box>
    </Box>
  );
};

export default SourceConfigForm;
