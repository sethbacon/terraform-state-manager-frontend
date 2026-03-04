import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  IconButton,
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
  CircularProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../services/api';
import DashboardCard from '../components/DashboardCard';
import type {
  CompliancePolicy,
  ComplianceResult,
  ComplianceScore,
} from '../types/alerts';

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

const POLICY_TYPES = ['tagging', 'naming', 'version', 'custom'] as const;
const SEVERITIES = ['info', 'warning', 'critical'] as const;

const statusColor = (status: string): 'success' | 'error' | 'warning' => {
  switch (status) {
    case 'pass': return 'success';
    case 'fail': return 'error';
    default: return 'warning';
  }
};

const CompliancePage: React.FC = () => {
  const [tabIndex, setTabIndex] = useState(0);

  // Policies tab state
  const [policies, setPolicies] = useState<CompliancePolicy[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [policiesError, setPoliciesError] = useState('');

  // Policy dialog state
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<CompliancePolicy | null>(null);
  const [policyForm, setPolicyForm] = useState({
    name: '',
    policy_type: 'tagging' as CompliancePolicy['policy_type'],
    severity: 'warning' as CompliancePolicy['severity'],
    config: '{}',
    is_active: true,
  });

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPolicy, setDeletingPolicy] = useState<CompliancePolicy | null>(null);

  // Results tab state
  const [results, setResults] = useState<ComplianceResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [resultsError, setResultsError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Score state
  const [score, setScore] = useState<ComplianceScore | null>(null);

  const policyMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of policies) {
      map[p.id] = p.name;
    }
    return map;
  }, [policies]);

  const fetchPolicies = useCallback(async () => {
    setPoliciesLoading(true);
    setPoliciesError('');
    try {
      const response = await api.get('/api/v1/compliance/policies');
      const d = response.data?.data;
      setPolicies(Array.isArray(d) ? d : []);
    } catch {
      setPoliciesError('Failed to load compliance policies');
    } finally {
      setPoliciesLoading(false);
    }
  }, []);

  const fetchResults = useCallback(async () => {
    setResultsLoading(true);
    setResultsError('');
    try {
      const params: Record<string, unknown> = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await api.get('/api/v1/compliance/results', params);
      const d = response.data?.data;
      setResults(Array.isArray(d) ? d : []);
    } catch {
      setResultsError('Failed to load compliance results');
    } finally {
      setResultsLoading(false);
    }
  }, [statusFilter]);

  const fetchScore = useCallback(async () => {
    try {
      const response = await api.get('/api/v1/compliance/score');
      setScore(response.data?.data ?? response.data ?? null);
    } catch {
      // Score fetch failure is non-critical
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  useEffect(() => {
    if (tabIndex === 1) {
      fetchResults();
      fetchScore();
    }
  }, [tabIndex, fetchResults, fetchScore]);

  const handleOpenCreatePolicy = useCallback(() => {
    setEditingPolicy(null);
    setPolicyForm({
      name: '',
      policy_type: 'tagging',
      severity: 'warning',
      config: '{}',
      is_active: true,
    });
    setPolicyDialogOpen(true);
  }, []);

  const handleOpenEditPolicy = useCallback((policy: CompliancePolicy) => {
    setEditingPolicy(policy);
    setPolicyForm({
      name: policy.name,
      policy_type: policy.policy_type,
      severity: policy.severity,
      config: JSON.stringify(policy.config, null, 2),
      is_active: policy.is_active,
    });
    setPolicyDialogOpen(true);
  }, []);

  const handlePolicySubmit = useCallback(async () => {
    try {
      const payload = {
        name: policyForm.name,
        policy_type: policyForm.policy_type,
        severity: policyForm.severity,
        config: JSON.parse(policyForm.config),
        is_active: policyForm.is_active,
      };
      if (editingPolicy) {
        await api.put(`/api/v1/compliance/policies/${editingPolicy.id}`, payload);
      } else {
        await api.post('/api/v1/compliance/policies', payload);
      }
      setPolicyDialogOpen(false);
      setEditingPolicy(null);
      fetchPolicies();
    } catch {
      setPoliciesError(editingPolicy ? 'Failed to update policy' : 'Failed to create policy');
    }
  }, [policyForm, editingPolicy, fetchPolicies]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingPolicy) return;
    try {
      await api.delete(`/api/v1/compliance/policies/${deletingPolicy.id}`);
      setDeleteDialogOpen(false);
      setDeletingPolicy(null);
      fetchPolicies();
    } catch {
      setPoliciesError('Failed to delete policy');
    }
  }, [deletingPolicy, fetchPolicies]);

  const isConfigValid = useCallback((configStr: string): boolean => {
    try {
      JSON.parse(configStr);
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Compliance
      </Typography>

      <Tabs value={tabIndex} onChange={(_e, v) => setTabIndex(v)} sx={{ mb: 1 }}>
        <Tab label="Policies" />
        <Tab label="Results" />
      </Tabs>

      {/* ---- Policies Tab ---- */}
      <TabPanel value={tabIndex} index={0}>
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
                  <TableCell>Type</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {policiesLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : policies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No compliance policies configured.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  policies.map((policy) => (
                    <TableRow key={policy.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{policy.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={policy.policy_type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={policy.severity}
                          color={
                            policy.severity === 'critical'
                              ? 'error'
                              : policy.severity === 'warning'
                                ? 'warning'
                                : 'info'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={policy.is_active ? 'Active' : 'Inactive'}
                          color={policy.is_active ? 'success' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {format(new Date(policy.created_at), 'MMM d, yyyy')}
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
                            onClick={() => {
                              setDeletingPolicy(policy);
                              setDeleteDialogOpen(true);
                            }}
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

      {/* ---- Results Tab ---- */}
      <TabPanel value={tabIndex} index={1}>
        {resultsError && (
          <MuiAlert severity="error" onClose={() => setResultsError('')} sx={{ mb: 2 }}>
            {resultsError}
          </MuiAlert>
        )}

        {score && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <DashboardCard
                title="Compliance Score"
                value={score.score_percent}
                subtitle={`${score.total_checks} total checks`}
                accentColor="#4caf50"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DashboardCard
                title="Passed"
                value={score.pass_count}
                accentColor="#4caf50"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DashboardCard
                title="Failed"
                value={score.fail_count}
                accentColor="#f44336"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DashboardCard
                title="Warnings"
                value={score.warning_count}
                accentColor="#ff9800"
              />
            </Grid>
          </Grid>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pass">Pass</MenuItem>
              <MenuItem value="fail">Fail</MenuItem>
              <MenuItem value="warning">Warning</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Workspace</TableCell>
                  <TableCell>Policy</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Violations</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resultsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No compliance results found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((result) => (
                    <TableRow key={result.id} hover>
                      <TableCell>{result.workspace_name}</TableCell>
                      <TableCell>{policyMap[result.policy_id] ?? result.policy_id}</TableCell>
                      <TableCell>
                        <Chip
                          label={result.status}
                          color={statusColor(result.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{result.violations.length}</TableCell>
                      <TableCell>
                        {format(new Date(result.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      {/* ---- Create/Edit Policy Dialog ---- */}
      <Dialog open={policyDialogOpen} onClose={() => setPolicyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPolicy ? 'Edit Compliance Policy' : 'Create Compliance Policy'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={policyForm.name}
            onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
            sx={{ mt: 1, mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Policy Type</InputLabel>
            <Select
              value={policyForm.policy_type}
              label="Policy Type"
              onChange={(e) =>
                setPolicyForm({ ...policyForm, policy_type: e.target.value as CompliancePolicy['policy_type'] })
              }
            >
              {POLICY_TYPES.map((pt) => (
                <MenuItem key={pt} value={pt}>
                  {pt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Severity</InputLabel>
            <Select
              value={policyForm.severity}
              label="Severity"
              onChange={(e) =>
                setPolicyForm({ ...policyForm, severity: e.target.value as CompliancePolicy['severity'] })
              }
            >
              {SEVERITIES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Config (JSON)"
            value={policyForm.config}
            onChange={(e) => setPolicyForm({ ...policyForm, config: e.target.value })}
            multiline
            rows={4}
            error={!isConfigValid(policyForm.config)}
            helperText={!isConfigValid(policyForm.config) ? 'Invalid JSON' : ''}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={policyForm.is_active}
                onChange={(e) => setPolicyForm({ ...policyForm, is_active: e.target.checked })}
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPolicyDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handlePolicySubmit}
            disabled={!policyForm.name || !isConfigValid(policyForm.config)}
          >
            {editingPolicy ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- Delete Confirmation Dialog ---- */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Compliance Policy</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete policy <strong>{deletingPolicy?.name}</strong>? This action
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompliancePage;
