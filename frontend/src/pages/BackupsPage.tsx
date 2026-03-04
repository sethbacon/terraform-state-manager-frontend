import React, { useState, useEffect, useCallback } from 'react';
import {
  Autocomplete, Box, Typography, Tabs, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Button, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, FormControlLabel, Switch, TablePagination,
  Alert as MuiAlert, CircularProgress, Chip, Tooltip, Stack,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Restore as RestoreIcon,
  VerifiedUser as VerifyIcon, Edit as EditIcon, CloudUpload as BulkIcon,
} from '@mui/icons-material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { format } from 'date-fns';
import api from '../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Source {
  id: string;
  name: string;
  source_type: string;
}

interface Backup {
  id: string;
  workspace_name: string;
  source_id: string;
  source_name?: string;
  created_at: string;
  file_size_bytes?: number;
  terraform_version?: string;
  state_serial?: number;
  checksum_sha256?: string;
  status: string;
}

interface RetentionPolicy {
  id: string;
  name: string;
  max_age_days: number;
  max_count: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface BulkBackupResult {
  total: number;
  successful: number;
  failed: number;
  errors?: string[];
}

interface VerifyResult {
  valid: boolean;
  expected_checksum: string;
  actual_checksum: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const statusColor = (status: string): 'success' | 'error' | 'warning' | 'default' | 'info' => {
  switch (status) {
    case 'completed':
    case 'verified':
      return 'success';
    case 'failed':
    case 'corrupted':
      return 'error';
    case 'pending':
    case 'in_progress':
      return 'warning';
    default:
      return 'default';
  }
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BackupsPage: React.FC = () => {
  const [tabIndex, setTabIndex] = useState(0);

  // ---------- Sources (shared) ----------
  const [sources, setSources] = useState<Source[]>([]);

  // ---------- Backups tab state ----------
  const [backups, setBackups] = useState<Backup[]>([]);
  const [backupsTotal, setBackupsTotal] = useState(0);
  const [backupsPage, setBackupsPage] = useState(0);
  const [backupsRowsPerPage, setBackupsRowsPerPage] = useState(10);
  const [backupsLoading, setBackupsLoading] = useState(true);
  const [backupsError, setBackupsError] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ---------- Retention policies tab state ----------
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [policiesError, setPoliciesError] = useState('');

  // ---------- Create Backup dialog ----------
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ source_id: '', workspace_name: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [workspaceNames, setWorkspaceNames] = useState<string[]>([]);
  const [workspaceNamesLoading, setWorkspaceNamesLoading] = useState(false);

  // ---------- Bulk Backup dialog ----------
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkSourceId, setBulkSourceId] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkBackupResult | null>(null);

  // ---------- Restore dialog ----------
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState<Backup | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // ---------- Delete dialog ----------
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBackup, setDeletingBackup] = useState<Backup | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ---------- Verify dialog ----------
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verifyingBackup, setVerifyingBackup] = useState<Backup | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  // ---------- Retention policy dialog ----------
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<RetentionPolicy | null>(null);
  const [policyForm, setPolicyForm] = useState({
    name: '',
    max_age_days: 90,
    max_count: 10,
    is_default: false,
  });
  const [policyLoading, setPolicyLoading] = useState(false);

  // ---------- Delete retention policy dialog ----------
  const [deletePolicyDialogOpen, setDeletePolicyDialogOpen] = useState(false);
  const [deletingPolicy, setDeletingPolicy] = useState<RetentionPolicy | null>(null);
  const [deletePolicyLoading, setDeletePolicyLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchSources = useCallback(async () => {
    try {
      const response = await api.listSources();
      setSources(response.data ?? []);
    } catch {
      // Non-critical; source dropdown will be empty
    }
  }, []);

  const fetchBackups = useCallback(async () => {
    setBackupsLoading(true);
    setBackupsError('');
    try {
      const params: Record<string, unknown> = {
        limit: backupsRowsPerPage,
        offset: backupsPage * backupsRowsPerPage,
      };
      if (sourceFilter !== 'all') {
        params.source_id = sourceFilter;
      }
      if (dateFrom) {
        params.date_from = dateFrom;
      }
      if (dateTo) {
        params.date_to = dateTo;
      }
      const response = await api.listBackups(params);
      setBackups(response.data ?? []);
      setBackupsTotal(response.total ?? 0);
    } catch {
      setBackupsError('Failed to load backups');
    } finally {
      setBackupsLoading(false);
    }
  }, [backupsPage, backupsRowsPerPage, sourceFilter, dateFrom, dateTo]);

  const fetchPolicies = useCallback(async () => {
    setPoliciesLoading(true);
    setPoliciesError('');
    try {
      const response = await api.listRetentionPolicies();
      const d = response.data ?? response;
      setPolicies(Array.isArray(d) ? d : []);
    } catch {
      setPoliciesError('Failed to load retention policies');
    } finally {
      setPoliciesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  useEffect(() => {
    if (tabIndex === 1) {
      fetchPolicies();
    }
  }, [tabIndex, fetchPolicies]);

  // Fetch workspace names from the latest completed analysis run for the selected source
  useEffect(() => {
    if (!createForm.source_id || !createDialogOpen) {
      setWorkspaceNames([]);
      return;
    }

    let cancelled = false;
    const fetchWorkspaceNames = async () => {
      setWorkspaceNamesLoading(true);
      try {
        const runsResponse = await api.get('/api/v1/analysis/runs', { limit: 100, offset: 0 });
        const runs: Array<{ id: string; source_id: string; status: string }> = runsResponse.data.data || [];

        const matchingRun = runs.find(
          (r) => r.source_id === createForm.source_id && r.status === 'completed'
        );

        if (!matchingRun || cancelled) {
          if (!cancelled) setWorkspaceNames([]);
          if (!cancelled) setWorkspaceNamesLoading(false);
          return;
        }

        const resultsResponse = await api.get(`/api/v1/analysis/runs/${matchingRun.id}/results`, {
          limit: 1000,
          offset: 0,
        });
        const results: Array<{ workspace_name: string }> = resultsResponse.data.data || [];

        if (!cancelled) {
          const names = results.map((r) => r.workspace_name).filter(Boolean).sort();
          setWorkspaceNames([...new Set(names)]);
        }
      } catch {
        if (!cancelled) setWorkspaceNames([]);
      } finally {
        if (!cancelled) setWorkspaceNamesLoading(false);
      }
    };

    fetchWorkspaceNames();
    return () => { cancelled = true; };
  }, [createForm.source_id, createDialogOpen]);

  // ---------------------------------------------------------------------------
  // Backups tab handlers
  // ---------------------------------------------------------------------------

  const handleBackupsPageChange = useCallback((_event: unknown, newPage: number) => {
    setBackupsPage(newPage);
  }, []);

  const handleBackupsRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setBackupsRowsPerPage(parseInt(event.target.value, 10));
    setBackupsPage(0);
  }, []);

  // -- Create Backup --

  const handleOpenCreateDialog = useCallback(() => {
    setCreateForm({ source_id: '', workspace_name: '' });
    setWorkspaceNames([]);
    setCreateDialogOpen(true);
  }, []);

  const handleCreateBackup = useCallback(async () => {
    setCreateLoading(true);
    try {
      await api.createBackup({
        source_id: createForm.source_id,
        workspace_name: createForm.workspace_name,
      });
      setCreateDialogOpen(false);
      fetchBackups();
    } catch {
      setBackupsError('Failed to create backup');
    } finally {
      setCreateLoading(false);
    }
  }, [createForm, fetchBackups]);

  // -- Bulk Backup --

  const handleOpenBulkDialog = useCallback(() => {
    setBulkSourceId('');
    setBulkResult(null);
    setBulkDialogOpen(true);
  }, []);

  const handleBulkBackup = useCallback(async () => {
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const result = await api.createBulkBackup({ source_id: bulkSourceId });
      setBulkResult(result);
      fetchBackups();
    } catch {
      setBackupsError('Failed to create bulk backup');
      setBulkDialogOpen(false);
    } finally {
      setBulkLoading(false);
    }
  }, [bulkSourceId, fetchBackups]);

  // -- Restore --

  const handleOpenRestore = useCallback((backup: Backup) => {
    setRestoringBackup(backup);
    setRestoreDialogOpen(true);
  }, []);

  const handleRestoreConfirm = useCallback(async () => {
    if (!restoringBackup) return;
    setRestoreLoading(true);
    try {
      await api.restoreBackup(restoringBackup.id);
      setRestoreDialogOpen(false);
      setRestoringBackup(null);
      fetchBackups();
    } catch {
      setBackupsError('Failed to restore backup');
    } finally {
      setRestoreLoading(false);
    }
  }, [restoringBackup, fetchBackups]);

  // -- Delete --

  const handleOpenDelete = useCallback((backup: Backup) => {
    setDeletingBackup(backup);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingBackup) return;
    setDeleteLoading(true);
    try {
      await api.deleteBackup(deletingBackup.id);
      setDeleteDialogOpen(false);
      setDeletingBackup(null);
      fetchBackups();
    } catch {
      setBackupsError('Failed to delete backup');
    } finally {
      setDeleteLoading(false);
    }
  }, [deletingBackup, fetchBackups]);

  // -- Verify --

  const handleOpenVerify = useCallback((backup: Backup) => {
    setVerifyingBackup(backup);
    setVerifyResult(null);
    setVerifyDialogOpen(true);
    setVerifyLoading(true);
    api.verifyBackup(backup.id)
      .then((result) => {
        const d = result?.data ?? result;
        setVerifyResult({
          valid: d.integrity_valid ?? d.valid ?? false,
          expected_checksum: d.expected_checksum ?? '',
          actual_checksum: d.actual_checksum ?? '',
        });
      })
      .catch(() => {
        setVerifyResult({ valid: false, expected_checksum: '', actual_checksum: 'Verification failed' });
      })
      .finally(() => {
        setVerifyLoading(false);
      });
  }, []);

  // ---------------------------------------------------------------------------
  // Retention policy handlers
  // ---------------------------------------------------------------------------

  const handleOpenCreatePolicy = useCallback(() => {
    setEditingPolicy(null);
    setPolicyForm({ name: '', max_age_days: 90, max_count: 10, is_default: false });
    setPolicyDialogOpen(true);
  }, []);

  const handleOpenEditPolicy = useCallback((policy: RetentionPolicy) => {
    setEditingPolicy(policy);
    setPolicyForm({
      name: policy.name,
      max_age_days: policy.max_age_days,
      max_count: policy.max_count,
      is_default: policy.is_default,
    });
    setPolicyDialogOpen(true);
  }, []);

  const handlePolicySubmit = useCallback(async () => {
    setPolicyLoading(true);
    try {
      const payload = {
        name: policyForm.name,
        max_age_days: policyForm.max_age_days,
        max_count: policyForm.max_count,
        is_default: policyForm.is_default,
      };
      if (editingPolicy) {
        await api.updateRetentionPolicy(editingPolicy.id, payload);
      } else {
        await api.createRetentionPolicy(payload);
      }
      setPolicyDialogOpen(false);
      setEditingPolicy(null);
      fetchPolicies();
    } catch {
      setPoliciesError(editingPolicy ? 'Failed to update retention policy' : 'Failed to create retention policy');
    } finally {
      setPolicyLoading(false);
    }
  }, [policyForm, editingPolicy, fetchPolicies]);

  const handleOpenDeletePolicy = useCallback((policy: RetentionPolicy) => {
    setDeletingPolicy(policy);
    setDeletePolicyDialogOpen(true);
  }, []);

  const handleDeletePolicyConfirm = useCallback(async () => {
    if (!deletingPolicy) return;
    setDeletePolicyLoading(true);
    try {
      await api.deleteRetentionPolicy(deletingPolicy.id);
      setDeletePolicyDialogOpen(false);
      setDeletingPolicy(null);
      fetchPolicies();
    } catch {
      setPoliciesError('Failed to delete retention policy');
    } finally {
      setDeletePolicyLoading(false);
    }
  }, [deletingPolicy, fetchPolicies]);

  // ---------------------------------------------------------------------------
  // Source name helper
  // ---------------------------------------------------------------------------

  const sourceNameById = useCallback(
    (id: string) => sources.find((s) => s.id === id)?.name ?? id,
    [sources],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Backups
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Manage Terraform state backups and configure retention policies.
      </Typography>

      <Tabs value={tabIndex} onChange={(_e, v) => setTabIndex(v)} sx={{ mb: 1 }}>
        <Tab label="Backups" />
        <Tab label="Retention Policies" />
      </Tabs>

      {/* ==================================================================
          Backups Tab
          ================================================================== */}
      <TabPanel value={tabIndex} index={0}>
        {backupsError && (
          <MuiAlert severity="error" onClose={() => setBackupsError('')} sx={{ mb: 2 }}>
            {backupsError}
          </MuiAlert>
        )}

        {/* Action bar */}
        <Stack direction="row" spacing={2} sx={{ mb: 2 }} justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog}>
              Create Backup
            </Button>
            <Button variant="outlined" startIcon={<BulkIcon />} onClick={handleOpenBulkDialog}>
              Bulk Backup
            </Button>
          </Stack>

          {/* Filters */}
          <Stack direction="row" spacing={1}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Source</InputLabel>
              <Select
                value={sourceFilter}
                label="Source"
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setBackupsPage(0);
                }}
              >
                <MenuItem value="all">All Sources</MenuItem>
                {sources.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="From"
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setBackupsPage(0); }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              label="To"
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setBackupsPage(0); }}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </Stack>

        {/* Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Workspace</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>TF Version</TableCell>
                  <TableCell>Serial</TableCell>
                  <TableCell>Checksum</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backupsLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : backups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No backups found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  backups.map((backup) => (
                    <TableRow key={backup.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{backup.workspace_name}</Typography>
                      </TableCell>
                      <TableCell>{backup.source_name ?? sourceNameById(backup.source_id)}</TableCell>
                      <TableCell>
                        {format(new Date(backup.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{backup.file_size_bytes ? formatBytes(backup.file_size_bytes) : '—'}</TableCell>
                      <TableCell>{backup.terraform_version ?? '—'}</TableCell>
                      <TableCell>{backup.state_serial ?? '—'}</TableCell>
                      <TableCell>
                        <Tooltip title={backup.checksum_sha256 ?? ''}>
                          <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace' }}>
                            {backup.checksum_sha256 ? backup.checksum_sha256.substring(0, 8) : '—'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip label={backup.status} color={statusColor(backup.status)} size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Restore">
                          <IconButton size="small" onClick={() => handleOpenRestore(backup)}>
                            <RestoreIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Verify">
                          <IconButton size="small" color="info" onClick={() => handleOpenVerify(backup)}>
                            <VerifyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleOpenDelete(backup)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {!backupsLoading && backups.length > 0 && (
            <TablePagination
              component="div"
              count={backupsTotal}
              page={backupsPage}
              onPageChange={handleBackupsPageChange}
              rowsPerPage={backupsRowsPerPage}
              onRowsPerPageChange={handleBackupsRowsPerPageChange}
              rowsPerPageOptions={[5, 10, 25]}
            />
          )}
        </Paper>
      </TabPanel>

      {/* ==================================================================
          Retention Policies Tab
          ================================================================== */}
      <TabPanel value={tabIndex} index={1}>
        {policiesError && (
          <MuiAlert severity="error" onClose={() => setPoliciesError('')} sx={{ mb: 2 }}>
            {policiesError}
          </MuiAlert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreatePolicy}>
            Create Policy
          </Button>
        </Box>

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Max Age (days)</TableCell>
                  <TableCell>Max Count</TableCell>
                  <TableCell>Default</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {policiesLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : policies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No retention policies configured.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  policies.map((policy) => (
                    <TableRow key={policy.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{policy.name}</Typography>
                      </TableCell>
                      <TableCell>{policy.max_age_days}</TableCell>
                      <TableCell>{policy.max_count}</TableCell>
                      <TableCell>
                        {policy.is_default && (
                          <Chip label="Default" color="primary" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleOpenEditPolicy(policy)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleOpenDeletePolicy(policy)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      {/* ==================================================================
          Create Backup Dialog
          ================================================================== */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Backup</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
            <InputLabel>Source</InputLabel>
            <Select
              value={createForm.source_id}
              label="Source"
              onChange={(e) => setCreateForm({ source_id: e.target.value, workspace_name: '' })}
            >
              {sources.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Autocomplete
            freeSolo
            options={workspaceNames}
            loading={workspaceNamesLoading}
            value={createForm.workspace_name}
            onInputChange={(_e, value) => setCreateForm({ ...createForm, workspace_name: value })}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                label="Workspace Name"
                placeholder={workspaceNames.length > 0 ? 'Select or type a workspace name' : 'Type a workspace name'}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {workspaceNamesLoading ? <CircularProgress size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={createLoading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateBackup}
            disabled={createLoading || !createForm.source_id || !createForm.workspace_name}
          >
            {createLoading ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================================================================
          Bulk Backup Dialog
          ================================================================== */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Backup</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create backups for all workspaces in the selected source.
          </Typography>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Source</InputLabel>
            <Select
              value={bulkSourceId}
              label="Source"
              onChange={(e) => setBulkSourceId(e.target.value)}
              disabled={bulkLoading}
            >
              {sources.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {bulkLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">Creating backups...</Typography>
            </Box>
          )}

          {bulkResult && (
            <Box sx={{ mt: 2 }}>
              <MuiAlert severity={bulkResult.failed === 0 ? 'success' : 'warning'} sx={{ mb: 1 }}>
                {bulkResult.successful} of {bulkResult.total} backups created successfully.
                {bulkResult.failed > 0 && ` ${bulkResult.failed} failed.`}
              </MuiAlert>
              {bulkResult.errors && bulkResult.errors.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {bulkResult.errors.map((err, idx) => (
                    <Typography key={idx} variant="caption" color="error" display="block">
                      {err}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)} disabled={bulkLoading}>
            {bulkResult ? 'Close' : 'Cancel'}
          </Button>
          {!bulkResult && (
            <Button
              variant="contained"
              onClick={handleBulkBackup}
              disabled={bulkLoading || !bulkSourceId}
            >
              {bulkLoading ? <CircularProgress size={20} /> : 'Start Bulk Backup'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ==================================================================
          Restore Confirmation Dialog
          ================================================================== */}
      <Dialog open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Restore Backup</DialogTitle>
        <DialogContent>
          <MuiAlert severity="warning" sx={{ mb: 2 }}>
            This will overwrite the current state for this workspace. This action cannot be undone.
          </MuiAlert>
          {restoringBackup && (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Workspace:</strong> {restoringBackup.workspace_name}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Created:</strong> {format(new Date(restoringBackup.created_at), 'MMM d, yyyy HH:mm')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Size:</strong> {restoringBackup.file_size_bytes ? formatBytes(restoringBackup.file_size_bytes) : '—'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>TF Version:</strong> {restoringBackup.terraform_version ?? '—'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Serial:</strong> {restoringBackup.state_serial ?? '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Checksum:</strong>{' '}
                <Typography component="span" sx={{ fontFamily: 'monospace' }}>
                  {restoringBackup.checksum_sha256 ?? '—'}
                </Typography>
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)} disabled={restoreLoading}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRestoreConfirm}
            disabled={restoreLoading}
          >
            {restoreLoading ? <CircularProgress size={20} /> : 'Restore'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================================================================
          Delete Backup Confirmation Dialog
          ================================================================== */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Backup</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the backup for workspace{' '}
            <strong>{deletingBackup?.workspace_name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} disabled={deleteLoading}>
            {deleteLoading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================================================================
          Verify Dialog
          ================================================================== */}
      <Dialog open={verifyDialogOpen} onClose={() => setVerifyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Verify Backup</DialogTitle>
        <DialogContent>
          {verifyingBackup && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Verifying backup for workspace <strong>{verifyingBackup.workspace_name}</strong>...
            </Typography>
          )}

          {verifyLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          )}

          {!verifyLoading && verifyResult && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
              {verifyResult.valid ? (
                <>
                  <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="h6" color="success.main" sx={{ mb: 2 }}>
                    Checksum Verified
                  </Typography>
                </>
              ) : (
                <>
                  <ErrorIcon color="error" sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="h6" color="error.main" sx={{ mb: 2 }}>
                    Checksum Mismatch
                  </Typography>
                </>
              )}
              {verifyResult.expected_checksum && (
                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                  Expected: {verifyResult.expected_checksum}
                </Typography>
              )}
              {verifyResult.actual_checksum && (
                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                  Actual: {verifyResult.actual_checksum}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerifyDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ==================================================================
          Retention Policy Create/Edit Dialog
          ================================================================== */}
      <Dialog open={policyDialogOpen} onClose={() => setPolicyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPolicy ? 'Edit Retention Policy' : 'Create Retention Policy'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={policyForm.name}
            onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Max Age (days)"
            type="number"
            value={policyForm.max_age_days}
            onChange={(e) => setPolicyForm({ ...policyForm, max_age_days: parseInt(e.target.value, 10) || 0 })}
            inputProps={{ min: 1 }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Max Count"
            type="number"
            value={policyForm.max_count}
            onChange={(e) => setPolicyForm({ ...policyForm, max_count: parseInt(e.target.value, 10) || 0 })}
            inputProps={{ min: 1 }}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={policyForm.is_default}
                onChange={(e) => setPolicyForm({ ...policyForm, is_default: e.target.checked })}
              />
            }
            label="Default Policy"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPolicyDialogOpen(false)} disabled={policyLoading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handlePolicySubmit}
            disabled={policyLoading || !policyForm.name || policyForm.max_age_days < 1 || policyForm.max_count < 1}
          >
            {policyLoading ? <CircularProgress size={20} /> : editingPolicy ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================================================================
          Delete Retention Policy Confirmation Dialog
          ================================================================== */}
      <Dialog open={deletePolicyDialogOpen} onClose={() => setDeletePolicyDialogOpen(false)}>
        <DialogTitle>Delete Retention Policy</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete retention policy <strong>{deletingPolicy?.name}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletePolicyDialogOpen(false)} disabled={deletePolicyLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeletePolicyConfirm}
            disabled={deletePolicyLoading}
          >
            {deletePolicyLoading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BackupsPage;
