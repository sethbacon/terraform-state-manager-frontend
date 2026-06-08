import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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

const WIZARD_STEP_KEYS = [
  'migrations.stepSourceBackend',
  'migrations.stepTargetBackend',
  'migrations.stepValidate',
  'migrations.stepDryRun',
  'migrations.stepExecute',
];

const BACKEND_CONFIG_FIELDS: Record<BackendType, { key: string; labelKey: string; required: boolean; type?: string }[]> = {
  s3: [
    { key: 'bucket', labelKey: 'migrations.field.bucket', required: true },
    { key: 'region', labelKey: 'migrations.field.region', required: true },
    { key: 'prefix', labelKey: 'migrations.field.keyPrefix', required: false },
    { key: 'access_key', labelKey: 'migrations.field.accessKey', required: false },
    { key: 'secret_key', labelKey: 'migrations.field.secretKey', required: false, type: 'password' },
  ],
  azure_blob: [
    { key: 'storage_account_name', labelKey: 'migrations.field.storageAccountName', required: true },
    { key: 'container_name', labelKey: 'migrations.field.containerName', required: true },
    { key: 'access_key', labelKey: 'migrations.field.accessKey', required: false, type: 'password' },
    { key: 'sas_token', labelKey: 'migrations.field.sasToken', required: false, type: 'password' },
  ],
  gcs: [
    { key: 'bucket', labelKey: 'migrations.field.bucket', required: true },
    { key: 'prefix', labelKey: 'migrations.field.prefix', required: false },
    { key: 'credentials', labelKey: 'migrations.field.credentialsJson', required: false, type: 'password' },
  ],
  local: [
    { key: 'path', labelKey: 'migrations.field.directoryPath', required: true },
  ],
  consul: [
    { key: 'address', labelKey: 'migrations.field.address', required: true },
    { key: 'scheme', labelKey: 'migrations.field.scheme', required: false },
    { key: 'path', labelKey: 'migrations.field.pathPrefix', required: true },
    { key: 'access_token', labelKey: 'migrations.field.accessToken', required: false, type: 'password' },
  ],
  pg: [
    { key: 'conn_str', labelKey: 'migrations.field.connectionString', required: true, type: 'password' },
    { key: 'schema_name', labelKey: 'migrations.field.schemaName', required: false },
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
  const { t } = useTranslation();
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
      setError(t('migrations.errLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
          errors: [t('migrations.validationRequestFailed')],
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
        setError(t('migrations.dryRunFailed'));
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
        setError(t('migrations.errStart'));
        setExecuting(false);
      }
      return;
    }

    // Normal step advance
    setActiveStep((prev) => prev + 1);
  }, [activeStep, validationResult, dryRunResult, executing, buildMigrationData, t]);

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
      setError(t('migrations.errCancel'));
    } finally {
      setCancelLoading(false);
    }
  }, [cancellingMigration, fetchMigrations, t]);

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
          <Grid size={{ xs: 12, sm: field.type === 'password' ? 12 : 6 }} key={field.key}>
            <TextField
              fullWidth
              label={t(field.labelKey)}
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
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{migration.name}</Typography>
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
            <Tooltip title={t('migrations.filesProgress', { migrated: migration.migrated_files, total: migration.total_files })}>
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
            <Tooltip title={t('migrations.tooltipCancel')}>
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
        {t('migrations.title')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        {t('migrations.subtitle')}
      </Typography>

      {error && (
        <MuiAlert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </MuiAlert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenWizard}>
          {t('migrations.newMigration')}
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : migrations.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">{t('migrations.empty')}</Typography>
        </Box>
      ) : (
        <>
          {/* ============================================================
              Active Jobs
              ============================================================ */}
          {activeJobs.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>{t('migrations.activeJobs')}</Typography>
              <Paper>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('migrations.thName')}</TableCell>
                        <TableCell>{t('migrations.thSource')}</TableCell>
                        <TableCell>{t('migrations.thTarget')}</TableCell>
                        <TableCell>{t('migrations.thStatus')}</TableCell>
                        <TableCell>{t('migrations.thProgress')}</TableCell>
                        <TableCell>{t('migrations.thStarted')}</TableCell>
                        <TableCell>{t('migrations.thCompleted')}</TableCell>
                        <TableCell align="right">{t('migrations.thActions')}</TableCell>
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
            <Typography variant="h6" sx={{ mb: 1 }}>{t('migrations.jobHistory')}</Typography>
            <Paper>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('migrations.thName')}</TableCell>
                      <TableCell>{t('migrations.thSource')}</TableCell>
                      <TableCell>{t('migrations.thTarget')}</TableCell>
                      <TableCell>{t('migrations.thStatus')}</TableCell>
                      <TableCell>{t('migrations.thProgress')}</TableCell>
                      <TableCell>{t('migrations.thStarted')}</TableCell>
                      <TableCell>{t('migrations.thCompleted')}</TableCell>
                      <TableCell align="right">{t('migrations.thActions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {jobHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                          <Typography color="text.secondary">{t('migrations.emptyHistory')}</Typography>
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
        <DialogTitle>{t('migrations.newMigration')}</DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ mb: 3, mt: 1 }}>
            {WIZARD_STEP_KEYS.map((labelKey) => (
              <Step key={labelKey}>
                <StepLabel>{t(labelKey)}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* ---- Step 0: Source Backend ---- */}
          {activeStep === 0 && (
            <Box>
              <TextField
                fullWidth
                label={t('migrations.labelMigrationName')}
                value={wizardName}
                onChange={(e) => setWizardName(e.target.value)}
                required
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>{t('migrations.labelSourceBackendType')}</InputLabel>
                <Select
                  value={sourceType}
                  label={t('migrations.labelSourceBackendType')}
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
                <InputLabel>{t('migrations.labelTargetBackendType')}</InputLabel>
                <Select
                  value={targetType}
                  label={t('migrations.labelTargetBackendType')}
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
                    {t('migrations.validateIntro')}
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    startIcon={<RunIcon />}
                  >
                    {t('migrations.runValidation')}
                  </Button>
                </Box>
              )}

              {validating && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">{t('migrations.validating')}</Typography>
                </Box>
              )}

              {validationResult && (
                <Box>
                  <MuiAlert severity={validationResult.valid ? 'success' : 'error'} sx={{ mb: 2 }}>
                    {validationResult.valid
                      ? t('migrations.validationPassed')
                      : t('migrations.validationFailed')}
                  </MuiAlert>

                  <Stack spacing={1} sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      {t('migrations.sourceAccessible')}{' '}
                      <Chip
                        label={validationResult.source_accessible ? t('migrations.yes') : t('migrations.no')}
                        color={validationResult.source_accessible ? 'success' : 'error'}
                        size="small"
                      />
                    </Typography>
                    <Typography variant="body2">
                      {t('migrations.targetAccessible')}{' '}
                      <Chip
                        label={validationResult.target_accessible ? t('migrations.yes') : t('migrations.no')}
                        color={validationResult.target_accessible ? 'success' : 'error'}
                        size="small"
                      />
                    </Typography>
                  </Stack>

                  {validationResult.errors.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="error" sx={{ mb: 0.5 }}>{t('migrations.errorsLabel')}</Typography>
                      {validationResult.errors.map((err, i) => (
                        <MuiAlert key={i} severity="error" sx={{ mb: 0.5 }} icon={false}>
                          {err}
                        </MuiAlert>
                      ))}
                    </Box>
                  )}

                  {validationResult.warnings.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" color="warning.main" sx={{ mb: 0.5 }}>{t('migrations.warningsLabel')}</Typography>
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
                    {t('migrations.dryRunIntro')}
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    startIcon={<RunIcon />}
                  >
                    {t('migrations.runDryRun')}
                  </Button>
                </Box>
              )}

              {dryRunning && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">{t('migrations.runningDryRun')}</Typography>
                </Box>
              )}

              {dryRunResult && (
                <Box>
                  <MuiAlert severity="info" sx={{ mb: 2 }}>
                    {t('migrations.dryRunComplete')}
                  </MuiAlert>

                  <Stack spacing={1}>
                    <Typography variant="body2">
                      <strong>{t('migrations.totalFiles')}</strong> {dryRunResult.total_files}
                    </Typography>
                    <Typography variant="body2">
                      <strong>{t('migrations.estimatedSize')}</strong> {formatBytes(dryRunResult.estimated_size_bytes)}
                    </Typography>
                    {dryRunResult.workspaces && dryRunResult.workspaces.length > 0 && (
                      <Box>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          <strong>{t('migrations.workspacesCount', { count: dryRunResult.workspaces.length })}</strong>
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
                    {t('migrations.executeWarning')}
                  </MuiAlert>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleNext}
                    startIcon={<RunIcon />}
                  >
                    {t('migrations.executeMigration')}
                  </Button>
                </Box>
              )}

              {executing && !executionMigration && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">{t('migrations.startingMigration')}</Typography>
                </Box>
              )}

              {executionMigration && (
                <Box>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2"><strong>{t('migrations.statusLabel')}</strong></Typography>
                      <Chip
                        label={executionMigration.status}
                        color={statusColor(executionMigration.status)}
                        size="small"
                      />
                    </Box>

                    {executionMigration.total_files > 0 && (
                      <Box>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          <strong>{t('migrations.progressLabel')}</strong> {t('migrations.filesProgress', { migrated: executionMigration.migrated_files, total: executionMigration.total_files })}
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
                          {t('migrations.pollingUpdates')}
                        </Typography>
                      </Box>
                    )}

                    {executionMigration.status === 'completed' && (
                      <MuiAlert severity="success">
                        {t('migrations.completedSuccess', { count: executionMigration.migrated_files })}
                      </MuiAlert>
                    )}

                    {executionMigration.status === 'failed' && (
                      <MuiAlert severity="error">
                        {t('migrations.failedMessage')}
                        {executionMigration.error_message && ` ${t('migrations.errorPrefix', { error: executionMigration.error_message })}`}
                      </MuiAlert>
                    )}

                    {executionMigration.status === 'cancelled' && (
                      <MuiAlert severity="warning">{t('migrations.cancelledMessage')}</MuiAlert>
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
              ? t('common.close')
              : t('common.cancel')}
          </Button>
          {activeStep > 0 && activeStep < 4 && (
            <Button onClick={handleBack} disabled={validating || dryRunning}>
              {t('migrations.back')}
            </Button>
          )}
          {activeStep < 2 && (
            <Button variant="contained" onClick={handleNext} disabled={!canAdvance()}>
              {t('migrations.next')}
            </Button>
          )}
          {(activeStep === 2 && validationResult?.valid) && (
            <Button variant="contained" onClick={() => setActiveStep(3)}>
              {t('migrations.next')}
            </Button>
          )}
          {(activeStep === 3 && dryRunResult) && (
            <Button variant="contained" onClick={() => setActiveStep(4)}>
              {t('migrations.next')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ==================================================================
          Cancel Confirmation Dialog
          ================================================================== */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>{t('migrations.cancelTitle')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('migrations.cancelConfirm', { name: cancellingMigration?.name ?? '' })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)} disabled={cancelLoading}>
            {t('migrations.keepRunning')}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCancelConfirm}
            disabled={cancelLoading}
          >
            {cancelLoading ? <CircularProgress size={20} /> : t('migrations.confirmCancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MigrationsPage;
