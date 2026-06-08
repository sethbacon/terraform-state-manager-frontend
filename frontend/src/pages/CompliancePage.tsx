import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  FormHelperText,
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
import PageHeader from '../components/PageHeader';
import Page from '../components/Page';
import DashboardCard from '../components/DashboardCard';
import type {
  CompliancePolicy,
  ComplianceEngine,
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
const DEFAULT_ENGINE = 'custom';

const statusColor = (status: string): 'success' | 'error' | 'warning' => {
  switch (status) {
    case 'pass': return 'success';
    case 'fail': return 'error';
    default: return 'warning';
  }
};

const CompliancePage: React.FC = () => {
  const { t } = useTranslation();
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
    engine_type: DEFAULT_ENGINE,
    config: '{}',
    is_active: true,
  });

  // Available compliance engines (e.g. custom, opa) — fetched from the backend.
  const [engines, setEngines] = useState<ComplianceEngine[]>([]);

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

  // Engine names from the API, ensuring the currently selected engine is always
  // a valid option even if the list has not loaded or omits it.
  const engineOptions = useMemo(() => {
    const names = engines.map((e) => e.name);
    if (policyForm.engine_type && !names.includes(policyForm.engine_type)) {
      names.push(policyForm.engine_type);
    }
    return names;
  }, [engines, policyForm.engine_type]);

  const fetchPolicies = useCallback(async () => {
    setPoliciesLoading(true);
    setPoliciesError('');
    try {
      const response = await api.get('/api/v1/compliance/policies');
      const d = response.data?.data;
      setPolicies(Array.isArray(d) ? d : []);
    } catch {
      setPoliciesError(t('compliance.errLoadPolicies'));
    } finally {
      setPoliciesLoading(false);
    }
  }, [t]);

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
      setResultsError(t('compliance.errLoadResults'));
    } finally {
      setResultsLoading(false);
    }
  }, [statusFilter, t]);

  const fetchScore = useCallback(async () => {
    try {
      const response = await api.get('/api/v1/compliance/score');
      setScore(response.data?.data ?? response.data ?? null);
    } catch {
      // Score fetch failure is non-critical
    }
  }, []);

  const fetchEngines = useCallback(async () => {
    try {
      const data = await api.listComplianceEngines();
      const d = data?.data;
      setEngines(Array.isArray(d) ? d : []);
    } catch {
      // Engine list failure is non-critical; the form falls back to the default.
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
    fetchEngines();
  }, [fetchPolicies, fetchEngines]);

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
      engine_type: DEFAULT_ENGINE,
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
      engine_type: policy.engine_type || DEFAULT_ENGINE,
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
        engine_type: policyForm.engine_type,
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
      setPoliciesError(editingPolicy ? t('compliance.errUpdatePolicy') : t('compliance.errCreatePolicy'));
    }
  }, [policyForm, editingPolicy, fetchPolicies, t]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingPolicy) return;
    try {
      await api.delete(`/api/v1/compliance/policies/${deletingPolicy.id}`);
      setDeleteDialogOpen(false);
      setDeletingPolicy(null);
      fetchPolicies();
    } catch {
      setPoliciesError(t('compliance.errDeletePolicy'));
    }
  }, [deletingPolicy, fetchPolicies, t]);

  const isConfigValid = useCallback((configStr: string): boolean => {
    try {
      JSON.parse(configStr);
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <Page>
      <PageHeader title={t('compliance.title')} description={t('compliance.subtitle')} />

      <Tabs value={tabIndex} onChange={(_e, v) => setTabIndex(v)} sx={{ mb: 1 }}>
        <Tab label={t('compliance.tabPolicies')} />
        <Tab label={t('compliance.tabResults')} />
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
            {t('compliance.createPolicy')}
          </Button>
        </Box>

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('compliance.thName')}</TableCell>
                  <TableCell>{t('compliance.thType')}</TableCell>
                  <TableCell>{t('compliance.thEngine')}</TableCell>
                  <TableCell>{t('compliance.thSeverity')}</TableCell>
                  <TableCell>{t('compliance.thActive')}</TableCell>
                  <TableCell>{t('compliance.thCreated')}</TableCell>
                  <TableCell align="right">{t('compliance.thActions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {policiesLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : policies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">{t('compliance.emptyPolicies')}</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  policies.map((policy) => (
                    <TableRow key={policy.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{policy.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={policy.policy_type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip label={policy.engine_type} size="small" variant="outlined" />
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
                          label={policy.is_active ? t('compliance.active') : t('compliance.inactive')}
                          color={policy.is_active ? 'success' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {format(new Date(policy.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={t('compliance.tooltipEdit')}>
                          <IconButton size="small" onClick={() => handleOpenEditPolicy(policy)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('compliance.tooltipDelete')}>
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
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DashboardCard
                title={t('compliance.scoreTitle')}
                value={score.score_percent}
                subtitle={t('compliance.scoreSubtitle', { count: score.total_checks })}
                accentColor="#4caf50"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DashboardCard
                title={t('compliance.passed')}
                value={score.pass_count}
                accentColor="#4caf50"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DashboardCard
                title={t('compliance.failed')}
                value={score.fail_count}
                accentColor="#f44336"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DashboardCard
                title={t('compliance.warnings')}
                value={score.warning_count}
                accentColor="#ff9800"
              />
            </Grid>
          </Grid>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>{t('compliance.filterStatus')}</InputLabel>
            <Select
              value={statusFilter}
              label={t('compliance.filterStatus')}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">{t('compliance.statusAll')}</MenuItem>
              <MenuItem value="pass">{t('compliance.statusPass')}</MenuItem>
              <MenuItem value="fail">{t('compliance.statusFail')}</MenuItem>
              <MenuItem value="warning">{t('compliance.statusWarning')}</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('compliance.thWorkspace')}</TableCell>
                  <TableCell>{t('compliance.thPolicy')}</TableCell>
                  <TableCell>{t('compliance.thStatus')}</TableCell>
                  <TableCell>{t('compliance.thViolations')}</TableCell>
                  <TableCell>{t('compliance.thCreated')}</TableCell>
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
                      <Typography color="text.secondary">{t('compliance.emptyResults')}</Typography>
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
        <DialogTitle>{editingPolicy ? t('compliance.dialogTitleEdit') : t('compliance.dialogTitleCreate')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t('compliance.labelName')}
            value={policyForm.name}
            onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
            sx={{ mt: 1, mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{t('compliance.labelPolicyType')}</InputLabel>
            <Select
              value={policyForm.policy_type}
              label={t('compliance.labelPolicyType')}
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
            <InputLabel>{t('compliance.labelSeverity')}</InputLabel>
            <Select
              value={policyForm.severity}
              label={t('compliance.labelSeverity')}
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
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{t('compliance.fieldEngine')}</InputLabel>
            <Select
              value={policyForm.engine_type}
              label={t('compliance.fieldEngine')}
              onChange={(e) =>
                setPolicyForm({ ...policyForm, engine_type: e.target.value })
              }
            >
              {engineOptions.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{t('compliance.engineHelp')}</FormHelperText>
          </FormControl>
          <TextField
            fullWidth
            label={t('compliance.labelConfig')}
            value={policyForm.config}
            onChange={(e) => setPolicyForm({ ...policyForm, config: e.target.value })}
            multiline
            rows={4}
            error={!isConfigValid(policyForm.config)}
            helperText={!isConfigValid(policyForm.config) ? t('compliance.invalidJson') : ''}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={policyForm.is_active}
                onChange={(e) => setPolicyForm({ ...policyForm, is_active: e.target.checked })}
              />
            }
            label={t('compliance.active')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPolicyDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handlePolicySubmit}
            disabled={!policyForm.name || !isConfigValid(policyForm.config)}
          >
            {editingPolicy ? t('compliance.update') : t('compliance.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- Delete Confirmation Dialog ---- */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('compliance.deleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('compliance.deleteConfirm', { name: deletingPolicy?.name ?? '' })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
};

export default CompliancePage;
