import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Button, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Chip, Tooltip, Stepper, Step, StepLabel, LinearProgress,
  Alert as MuiAlert, Stack, Grid,
} from '@mui/material';
import {
  Add as AddIcon, Cancel as CancelIcon, PlayArrow as RunIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Migration {
  id: string;
  name: string;
  source_backend_type: string;
  source_config: Record<string, string>;
  target_backend_type: string;
  target_config: Record<string, string>;
  status: string;
  migrated_files: number;
  total_files: number;
  estimated_size_bytes?: number;
  started_at: string | null;
  completed_at: string | null;
  error_message?: string | null;
  created_at: string;
}

interface ValidationResult {
  valid: boolean;
  source_accessible: boolean;
  target_accessible: boolean;
  errors: string[];
  warnings: string[];
}

interface DryRunResult {
  total_files: number;
  estimated_size_bytes: number;
  workspaces: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BACKEND_TYPES = ['s3', 'azure_blob', 'gcs', 'local', 'consul', 'pg'] as const;
type BackendType = typeof BACKEND_TYPES[number];

const WIZARD_STEPS = ['Source Backend', 'Target Backend', 'Validate', 'Dry Run', 'Execute'];

const BACKEND_CONFIG_FIELDS: Record<BackendType, { key: string; label: string; required: boolean; type?: string }[]> = {
  s3: [
    { key: 'bucket', label: 'Bucket', required: true },
    { key: 'region', label: 'Region', required: true },
    { key: 'prefix', label: 'Key Prefix', required: false },
    { key: 'access_key', label: 'Access Key', required: false },
    { key: 'secret_key', label: 'Secret Key', required: false, type: 'password' },
  ],
  azure_blob: [
    { key: 'storage_account_name', label: 'Storage Account Name', required: true },
    { key: 'container_name', label: 'Container Name', required: true },
    { key: 'access_key', label: 'Access Key', required: false, type: 'password' },
    { key: 'sas_token', label: 'SAS Token', required: false, type: 'password' },
  ],
  gcs: [
    { key: 'bucket', label: 'Bucket', required: true },
    { key: 'prefix', label: 'Prefix', required: false },
    { key: 'credentials', label: 'Credentials JSON', required: false, type: 'password' },
  ],
  local: [
    { key: 'path', label: 'Directory Path', required: true },
  ],
  consul: [
    { key: 'address', label: 'Address', required: true },
    { key: 'scheme', label: 'Scheme (http/https)', required: false },
    { key: 'path', label: 'Path Prefix', required: true },
    { key: 'access_token', label: 'Access Token', required: false, type: 'password' },
  ],
  pg: [
    { key: 'conn_str', label: 'Connection String', required: true, type: 'password' },
    { key: 'schema_name', label: 'Schema Name', required: false },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusColor = (status: string): 'success' | 'error' | 'warning' | 'info' | 'default' => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
    case 'cancelled':
      return 'error';
    case 'running':
      return 'info';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MigrationsPage: React.FC = () => {
  // ---------- Job list state ----------
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ---------- Wizard dialog state ----------
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [wizardName, setWizardName] = useState('');

  // Source config
  const [sourceType, setSourceType] = useState<BackendType>('s3');
  const [sourceConfig, setSourceConfig] = useState<Record<string, string>>({});

  // Target config
  const [targetType, setTargetType] = useState<BackendType>('s3');
  const [targetConfig, setTargetConfig] = useState<Record<string, string>>({});

  // Validation
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Dry run
  const [dryRunning, setDryRunning] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);

  // Execution
  const [executing, setExecuting] = useState(false);
  const [executionMigration, setExecutionMigration] = useState<Migration | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------- Cancel dialog state ----------
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingMigration, setCancellingMigration] = useState<Migration | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchMigrations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.listMigrations();
      const d = response.data ?? response;
      setMigrations(Array.isArray(d) ? d : []);
    } catch {
      setError('Failed to load migrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMigrations();
  }, [fetchMigrations]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const activeJobs = migrations.filter((m) => m.status === 'running' || m.status === 'pending');
  const jobHistory = migrations.filter((m) => m.status !== 'running' && m.status !== 'pending');

  // ---------------------------------------------------------------------------
  // Wizard helpers
  // ---------------------------------------------------------------------------

  const buildMigrationData = useCallback(() => ({
    name: wizardName,
    source_backend_type: sourceType,
    source_config: sourceConfig,
    target_backend_type: targetType,
    target_config: targetConfig,
  }), [wizardName, sourceType, sourceConfig, targetType, targetConfig]);

  const resetWizard = useCallback(() => {
    setActiveStep(0);
    setWizardName('');
    setSourceType('s3');
    setSourceConfig({});
    setTargetType('s3');
    setTargetConfig({});
    setValidationResult(null);
    setDryRunResult(null);
    setExecuting(false);
    setExecutionMigration(null);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const handleOpenWizard = useCallback(() => {
    resetWizard();
    setWizardOpen(true);
  }, [resetWizard]);

  const handleCloseWizard = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setWizardOpen(false);
    resetWizard();
    fetchMigrations();
  }, [resetWizard, fetchMigrations]);

  // ---------------------------------------------------------------------------
  // Step validation
  // ---------------------------------------------------------------------------

  const isSourceStepValid = useCallback(() => {
    if (!wizardName.trim()) return false;
    const fields = BACKEND_CONFIG_FIELDS[sourceType];
    return fields
      .filter((f) => f.required)
      .every((f) => (sourceConfig[f.key] ?? '').trim() !== '');
  }, [wizardName, sourceType, sourceConfig]);

  const isTargetStepValid = useCallback(() => {
    const fields = BACKEND_CONFIG_FIELDS[targetType];
    return fields
      .filter((f) => f.required)
      .every((f) => (targetConfig[f.key] ?? '').trim() !== '');
  }, [targetType, targetConfig]);

  const canAdvance = useCallback((): boolean => {
    switch (activeStep) {
      case 0:
        return isSourceStepValid();
      case 1:
        return isTargetStepValid();
      case 2:
        return validationResult !== null && validationResult.valid;
      case 3:
        return dryRunResult !== null;
      case 4:
        return false; // Last step, no next
      default:
        return false;
    }
  }, [activeStep, isSourceStepValid, isTargetStepValid, validationResult, dryRunResult]);

  // ---------------------------------------------------------------------------
  // Step actions
  // ---------------------------------------------------------------------------

  const handleNext = useCallback(async () => {
    if (activeStep === 2 && !validationResult) {
      // Run validation
      setValidating(true);
      setValidationResult(null);
      try {
        const result = await api.validateMigration(buildMigrationData());
        setValidationResult(result);
      } catch {
        setValidationResult({
          valid: false,
          source_accessible: false,
          target_accessible: false,
          errors: ['Validation request failed. Check your configuration.'],
          warnings: [],
        });
      } finally {
        setValidating(false);
      }
      return;
    }

    if (activeStep === 3 && !dryRunResult) {
      // Run dry run
      setDryRunning(true);
      setDryRunResult(null);
      try {
        const result = await api.dryRunMigration(buildMigrationData());
        setDryRunResult(result);
      } catch {
        setError('Dry run failed');
        setDryRunning(false);
      } finally {
        setDryRunning(false);
      }
      return;
    }

    if (activeStep === 4 && !executing) {
      // Execute
      setExecuting(true);
      try {
        const result = await api.createMigration(buildMigrationData());
        const migration: Migration = result.data ?? result;
        setExecutionMigration(migration);

        // Poll for progress
        pollingRef.current = setInterval(async () => {
          try {
            const updated = await api.getMigration(migration.id);
            const m: Migration = updated.data ?? updated;
            setExecutionMigration(m);
            if (m.status === 'completed' || m.status === 'failed' || m.status === 'cancelled') {
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
              setExecuting(false);
            }
          } catch {
            // Keep polling on transient failures
          }
        }, 2000);
      } catch {
        setError('Failed to start migration');
        setExecuting(false);
      }
      return;
    }

    // Normal step advance
    setActiveStep((prev) => prev + 1);
  }, [activeStep, validationResult, dryRunResult, executing, buildMigrationData]);

  const handleBack = useCallback(() => {
    if (activeStep === 2) {
      setValidationResult(null);
    }
    if (activeStep === 3) {
      setDryRunResult(null);
    }
    setActiveStep((prev) => prev - 1);
  }, [activeStep]);

  // ---------------------------------------------------------------------------
  // Cancel migration
  // ---------------------------------------------------------------------------

  const handleOpenCancel = useCallback((migration: Migration) => {
    setCancellingMigration(migration);
    setCancelDialogOpen(true);
  }, []);

  const handleCancelConfirm = useCallback(async () => {
    if (!cancellingMigration) return;
    setCancelLoading(true);
    try {
      await api.cancelMigration(cancellingMigration.id);
      setCancelDialogOpen(false);
      setCancellingMigration(null);
      fetchMigrations();
    } catch {
      setError('Failed to cancel migration');
    } finally {
      setCancelLoading(false);
    }
  }, [cancellingMigration, fetchMigrations]);

  // ---------------------------------------------------------------------------
  // Config field renderer
  // ---------------------------------------------------------------------------

  const renderConfigFields = (
    backendType: BackendType,
    config: Record<string, string>,
    setConfig: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  ) => {
    const fields = BACKEND_CONFIG_FIELDS[backendType];
    return (
      <Grid container spacing={2}>
        {fields.map((field) => (
          <Grid item xs={12} sm={field.type === 'password' ? 12 : 6} key={field.key}>
            <TextField
              fullWidth
              label={field.label}
              value={config[field.key] ?? ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))}
              required={field.required}
              type={field.type ?? 'text'}
              size="small"
            />
          </Grid>
        ))}
      </Grid>
    );
  };

  // ---------------------------------------------------------------------------
  // Shared table row renderer
  // ---------------------------------------------------------------------------

  const renderMigrationRow = (migration: Migration) => {
    const progress =
      migration.total_files > 0
        ? Math.round((migration.migrated_files / migration.total_files) * 100)
        : 0;

    return (
      <TableRow key={migration.id} hover>
        <TableCell>
          <Typography variant="body2" fontWeight={500}>{migration.name}</Typography>
        </TableCell>
        <TableCell>
          <Chip label={migration.source_backend_type} size="small" variant="outlined" />
        </TableCell>
        <TableCell>
          <Chip label={migration.target_backend_type} size="small" variant="outlined" />
        </TableCell>
        <TableCell>
          <Chip label={migration.status} color={statusColor(migration.status)} size="small" />
        </TableCell>
        <TableCell>
          {migration.total_files > 0 ? (
            <Tooltip title={`${migration.migrated_files} / ${migration.total_files} files`}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                />
                <Typography variant="caption" sx={{ minWidth: 35 }}>
                  {progress}%
                </Typography>
              </Box>
            </Tooltip>
          ) : (
            <Typography variant="caption" color="text.secondary">--</Typography>
          )}
        </TableCell>
        <TableCell>
          {migration.started_at
            ? format(new Date(migration.started_at), 'MMM d, yyyy HH:mm')
            : '--'}
        </TableCell>
        <TableCell>
          {migration.completed_at
            ? format(new Date(migration.completed_at), 'MMM d, yyyy HH:mm')
            : '--'}
        </TableCell>
        <TableCell align="right">
          {(migration.status === 'running' || migration.status === 'pending') && (
            <Tooltip title="Cancel">
              <IconButton size="small" color="error" onClick={() => handleOpenCancel(migration)}>
                <CancelIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Migrations
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Migrate Terraform state between backend storage providers.
      </Typography>

      {error && (
        <MuiAlert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </MuiAlert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenWizard}>
          New Migration
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : migrations.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">No migration jobs.</Typography>
        </Box>
      ) : (
        <>
          {/* ============================================================
              Active Jobs
              ============================================================ */}
          {activeJobs.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Active Jobs</Typography>
              <Paper>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Source</TableCell>
                        <TableCell>Target</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Progress</TableCell>
                        <TableCell>Started</TableCell>
                        <TableCell>Completed</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeJobs.map(renderMigrationRow)}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          )}

          {/* ============================================================
              Job History
              ============================================================ */}
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>Job History</Typography>
            <Paper>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Source</TableCell>
                      <TableCell>Target</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Progress</TableCell>
                      <TableCell>Started</TableCell>
                      <TableCell>Completed</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {jobHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                          <Typography color="text.secondary">No completed migrations yet.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      jobHistory.map(renderMigrationRow)
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        </>
      )}

      {/* ==================================================================
          Migration Wizard Dialog
          ================================================================== */}
      <Dialog open={wizardOpen} onClose={handleCloseWizard} maxWidth="md" fullWidth>
        <DialogTitle>New Migration</DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ mb: 3, mt: 1 }}>
            {WIZARD_STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* ---- Step 0: Source Backend ---- */}
          {activeStep === 0 && (
            <Box>
              <TextField
                fullWidth
                label="Migration Name"
                value={wizardName}
                onChange={(e) => setWizardName(e.target.value)}
                required
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Source Backend Type</InputLabel>
                <Select
                  value={sourceType}
                  label="Source Backend Type"
                  onChange={(e) => {
                    setSourceType(e.target.value as BackendType);
                    setSourceConfig({});
                  }}
                >
                  {BACKEND_TYPES.map((bt) => (
                    <MenuItem key={bt} value={bt}>
                      {bt.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {renderConfigFields(sourceType, sourceConfig, setSourceConfig)}
            </Box>
          )}

          {/* ---- Step 1: Target Backend ---- */}
          {activeStep === 1 && (
            <Box>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Target Backend Type</InputLabel>
                <Select
                  value={targetType}
                  label="Target Backend Type"
                  onChange={(e) => {
                    setTargetType(e.target.value as BackendType);
                    setTargetConfig({});
                  }}
                >
                  {BACKEND_TYPES.map((bt) => (
                    <MenuItem key={bt} value={bt}>
                      {bt.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {renderConfigFields(targetType, targetConfig, setTargetConfig)}
            </Box>
          )}

          {/* ---- Step 2: Validate ---- */}
          {activeStep === 2 && (
            <Box>
              {!validationResult && !validating && (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    Validate the source and target backend configurations before proceeding.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    startIcon={<RunIcon />}
                  >
                    Run Validation
                  </Button>
                </Box>
              )}

              {validating && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">Validating configurations...</Typography>
                </Box>
              )}

              {validationResult && (
                <Box>
                  <MuiAlert severity={validationResult.valid ? 'success' : 'error'} sx={{ mb: 2 }}>
                    {validationResult.valid
                      ? 'Validation passed. Both source and target backends are accessible.'
                      : 'Validation failed. Please fix the errors below.'}
                  </MuiAlert>

                  <Stack spacing={1} sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Source accessible:{' '}
                      <Chip
                        label={validationResult.source_accessible ? 'Yes' : 'No'}
                        color={validationResult.source_accessible ? 'success' : 'error'}
                        size="small"
                      />
                    </Typography>
                    <Typography variant="body2">
                      Target accessible:{' '}
                      <Chip
                        label={validationResult.target_accessible ? 'Yes' : 'No'}
                        color={validationResult.target_accessible ? 'success' : 'error'}
                        size="small"
                      />
                    </Typography>
                  </Stack>

                  {validationResult.errors.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="error" sx={{ mb: 0.5 }}>Errors:</Typography>
                      {validationResult.errors.map((err, i) => (
                        <MuiAlert key={i} severity="error" sx={{ mb: 0.5 }} icon={false}>
                          {err}
                        </MuiAlert>
                      ))}
                    </Box>
                  )}

                  {validationResult.warnings.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" color="warning.main" sx={{ mb: 0.5 }}>Warnings:</Typography>
                      {validationResult.warnings.map((w, i) => (
                        <MuiAlert key={i} severity="warning" sx={{ mb: 0.5 }} icon={false}>
                          {w}
                        </MuiAlert>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* ---- Step 3: Dry Run ---- */}
          {activeStep === 3 && (
            <Box>
              {!dryRunResult && !dryRunning && (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    Perform a dry run to see what will be migrated without making any changes.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    startIcon={<RunIcon />}
                  >
                    Run Dry Run
                  </Button>
                </Box>
              )}

              {dryRunning && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">Running dry run...</Typography>
                </Box>
              )}

              {dryRunResult && (
                <Box>
                  <MuiAlert severity="info" sx={{ mb: 2 }}>
                    Dry run complete. Review the results below before executing.
                  </MuiAlert>

                  <Stack spacing={1}>
                    <Typography variant="body2">
                      <strong>Total files:</strong> {dryRunResult.total_files}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Estimated size:</strong> {formatBytes(dryRunResult.estimated_size_bytes)}
                    </Typography>
                    {dryRunResult.workspaces && dryRunResult.workspaces.length > 0 && (
                      <Box>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          <strong>Workspaces ({dryRunResult.workspaces.length}):</strong>
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {dryRunResult.workspaces.map((ws) => (
                            <Chip key={ws} label={ws} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Stack>
                </Box>
              )}
            </Box>
          )}

          {/* ---- Step 4: Execute ---- */}
          {activeStep === 4 && (
            <Box>
              {!executionMigration && !executing && (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <MuiAlert severity="warning" sx={{ mb: 2 }}>
                    You are about to start the migration. This will copy state files from the source
                    backend to the target backend.
                  </MuiAlert>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleNext}
                    startIcon={<RunIcon />}
                  >
                    Execute Migration
                  </Button>
                </Box>
              )}

              {executing && !executionMigration && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">Starting migration...</Typography>
                </Box>
              )}

              {executionMigration && (
                <Box>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2"><strong>Status:</strong></Typography>
                      <Chip
                        label={executionMigration.status}
                        color={statusColor(executionMigration.status)}
                        size="small"
                      />
                    </Box>

                    {executionMigration.total_files > 0 && (
                      <Box>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          <strong>Progress:</strong> {executionMigration.migrated_files} / {executionMigration.total_files} files
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={
                            executionMigration.total_files > 0
                              ? Math.round(
                                  (executionMigration.migrated_files / executionMigration.total_files) * 100,
                                )
                              : 0
                          }
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    )}

                    {executing && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="caption" color="text.secondary">
                          Polling for updates...
                        </Typography>
                      </Box>
                    )}

                    {executionMigration.status === 'completed' && (
                      <MuiAlert severity="success">
                        Migration completed successfully. {executionMigration.migrated_files} files migrated.
                      </MuiAlert>
                    )}

                    {executionMigration.status === 'failed' && (
                      <MuiAlert severity="error">
                        Migration failed.
                        {executionMigration.error_message && ` Error: ${executionMigration.error_message}`}
                      </MuiAlert>
                    )}

                    {executionMigration.status === 'cancelled' && (
                      <MuiAlert severity="warning">Migration was cancelled.</MuiAlert>
                    )}
                  </Stack>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseWizard}>
            {executionMigration &&
              (executionMigration.status === 'completed' ||
                executionMigration.status === 'failed' ||
                executionMigration.status === 'cancelled')
              ? 'Close'
              : 'Cancel'}
          </Button>
          {activeStep > 0 && activeStep < 4 && (
            <Button onClick={handleBack} disabled={validating || dryRunning}>
              Back
            </Button>
          )}
          {activeStep < 2 && (
            <Button variant="contained" onClick={handleNext} disabled={!canAdvance()}>
              Next
            </Button>
          )}
          {(activeStep === 2 && validationResult?.valid) && (
            <Button variant="contained" onClick={() => setActiveStep(3)}>
              Next
            </Button>
          )}
          {(activeStep === 3 && dryRunResult) && (
            <Button variant="contained" onClick={() => setActiveStep(4)}>
              Next
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ==================================================================
          Cancel Confirmation Dialog
          ================================================================== */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>Cancel Migration</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel migration{' '}
            <strong>{cancellingMigration?.name}</strong>? Any files already migrated will remain
            in the target backend.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)} disabled={cancelLoading}>
            No, Keep Running
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCancelConfirm}
            disabled={cancelLoading}
          >
            {cancelLoading ? <CircularProgress size={20} /> : 'Yes, Cancel'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MigrationsPage;
