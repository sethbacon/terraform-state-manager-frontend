import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Alert as MuiAlert,
  CircularProgress,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as TestIcon,
} from '@mui/icons-material';
import api from '../services/api';
import type { Alert, AlertRule, NotificationChannel } from '../types/alerts';
import AlertsList from '../components/AlertsList';
import AlertRuleForm from '../components/AlertRuleForm';
import NotificationChannelForm from '../components/NotificationChannelForm';

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

interface AlertRulePayload {
  name: string;
  rule_type: string;
  severity: string;
  config: Record<string, unknown>;
  is_active: boolean;
}

interface ChannelPayload {
  name: string;
  channel_type: string;
  config: Record<string, unknown>;
  is_active: boolean;
}

const severityColor = (severity: string): 'info' | 'warning' | 'error' => {
  switch (severity) {
    case 'critical': return 'error';
    case 'warning': return 'warning';
    default: return 'info';
  }
};

const AlertsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = parseInt(searchParams.get('tab') ?? '0', 10);
  const [tabIndex, setTabIndex] = useState(
    [0, 1, 2].includes(initialTab) ? initialTab : 0
  );

  // Alerts tab state
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsTotal, setAlertsTotal] = useState(0);
  const [alertsPage, setAlertsPage] = useState(0);
  const [alertsRowsPerPage, setAlertsRowsPerPage] = useState(10);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Rules tab state
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesError, setRulesError] = useState('');

  // Rule dialog state
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  // Rule delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRule, setDeletingRule] = useState<AlertRule | null>(null);

  // Channels tab state
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [channelsError, setChannelsError] = useState('');

  // Channel dialog state
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);
  const [channelFormError, setChannelFormError] = useState('');

  // Channel delete dialog state
  const [deleteChannelDialogOpen, setDeleteChannelDialogOpen] = useState(false);
  const [deletingChannel, setDeletingChannel] = useState<NotificationChannel | null>(null);

  // Snackbar for channel operations
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'success' });

  // ---- Alerts callbacks ----

  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    setAlertsError('');
    try {
      const params: Record<string, unknown> = {
        limit: alertsRowsPerPage,
        offset: alertsPage * alertsRowsPerPage,
      };
      if (severityFilter !== 'all') {
        params.severity = severityFilter;
      }
      const response = await api.get('/api/v1/alerts', params);
      const data = response.data;
      setAlerts(data.data ?? []);
      setAlertsTotal(data.total ?? 0);
    } catch {
      setAlertsError('Failed to load alerts');
    } finally {
      setAlertsLoading(false);
    }
  }, [alertsPage, alertsRowsPerPage, severityFilter]);

  const fetchRules = useCallback(async () => {
    setRulesLoading(true);
    setRulesError('');
    try {
      const response = await api.get('/api/v1/alerts/rules');
      const d = response.data?.data;
      setRules(Array.isArray(d) ? d : []);
    } catch {
      setRulesError('Failed to load alert rules');
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (tabIndex === 1) {
      fetchRules();
    }
  }, [tabIndex, fetchRules]);

  const handleAcknowledge = useCallback(async (alertId: string) => {
    try {
      await api.put(`/api/v1/alerts/${alertId}/acknowledge`);
      fetchAlerts();
    } catch {
      setAlertsError('Failed to acknowledge alert');
    }
  }, [fetchAlerts]);

  const handleAlertsPageChange = useCallback((_event: unknown, newPage: number) => {
    setAlertsPage(newPage);
  }, []);

  const handleAlertsRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setAlertsRowsPerPage(parseInt(event.target.value, 10));
    setAlertsPage(0);
  }, []);

  const handleOpenCreateRule = useCallback(() => {
    setEditingRule(null);
    setRuleDialogOpen(true);
  }, []);

  const handleOpenEditRule = useCallback((rule: AlertRule) => {
    setEditingRule(rule);
    setRuleDialogOpen(true);
  }, []);

  const handleRuleSubmit = useCallback(async (payload: AlertRulePayload) => {
    try {
      if (editingRule) {
        await api.put(`/api/v1/alerts/rules/${editingRule.id}`, payload);
      } else {
        await api.post('/api/v1/alerts/rules', payload);
      }
      setRuleDialogOpen(false);
      setEditingRule(null);
      fetchRules();
    } catch {
      setRulesError(editingRule ? 'Failed to update rule' : 'Failed to create rule');
    }
  }, [editingRule, fetchRules]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingRule) return;
    try {
      await api.delete(`/api/v1/alerts/rules/${deletingRule.id}`);
      setDeleteDialogOpen(false);
      setDeletingRule(null);
      fetchRules();
    } catch {
      setRulesError('Failed to delete rule');
    }
  }, [deletingRule, fetchRules]);

  // ---- Channels callbacks ----

  const showSnackbar = useCallback(
    (message: string, severity: 'success' | 'error' | 'info') => {
      setSnackbar({ open: true, message, severity });
    },
    []
  );

  const fetchChannels = useCallback(async () => {
    setChannelsLoading(true);
    setChannelsError('');
    try {
      const response = await api.get('/api/v1/notifications/channels');
      const d = response.data?.data;
      setChannels(Array.isArray(d) ? d : []);
    } catch {
      setChannelsError('Failed to load notification channels');
    } finally {
      setChannelsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tabIndex === 2) {
      fetchChannels();
    }
  }, [tabIndex, fetchChannels]);

  const handleOpenCreateChannel = useCallback(() => {
    setEditingChannel(null);
    setChannelFormError('');
    setChannelDialogOpen(true);
  }, []);

  const handleOpenEditChannel = useCallback((channel: NotificationChannel) => {
    setEditingChannel(channel);
    setChannelFormError('');
    setChannelDialogOpen(true);
  }, []);

  const handleCloseChannelDialog = useCallback(() => {
    setChannelDialogOpen(false);
    setChannelFormError('');
  }, []);

  const handleChannelSubmit = useCallback(
    async (payload: ChannelPayload) => {
      setChannelFormError('');
      try {
        if (editingChannel) {
          await api.put(`/api/v1/notifications/channels/${editingChannel.id}`, payload);
          showSnackbar('Channel updated successfully', 'success');
        } else {
          await api.post('/api/v1/notifications/channels', payload);
          showSnackbar('Channel created successfully', 'success');
        }
        setChannelDialogOpen(false);
        setEditingChannel(null);
        fetchChannels();
      } catch {
        setChannelFormError(editingChannel ? 'Failed to update channel' : 'Failed to create channel');
      }
    },
    [editingChannel, fetchChannels, showSnackbar]
  );

  const handleDeleteChannelConfirm = useCallback(async () => {
    if (!deletingChannel) return;
    try {
      await api.delete(`/api/v1/notifications/channels/${deletingChannel.id}`);
      showSnackbar('Channel deleted successfully', 'success');
      setDeleteChannelDialogOpen(false);
      setDeletingChannel(null);
      fetchChannels();
    } catch {
      showSnackbar('Failed to delete channel', 'error');
    }
  }, [deletingChannel, fetchChannels, showSnackbar]);

  const handleTestChannel = useCallback(
    async (channelId: string) => {
      showSnackbar('Testing channel...', 'info');
      try {
        await api.post(`/api/v1/notifications/channels/${channelId}/test`);
        showSnackbar('Test notification sent successfully', 'success');
      } catch {
        showSnackbar('Test notification failed', 'error');
      }
    },
    [showSnackbar]
  );

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Alerts &amp; Notifications
      </Typography>

      <Tabs value={tabIndex} onChange={(_e, v) => setTabIndex(v)} sx={{ mb: 1 }}>
        <Tab label="Alerts" />
        <Tab label="Rules" />
        <Tab label="Channels" />
      </Tabs>

      {/* ---- Alerts Tab ---- */}
      <TabPanel value={tabIndex} index={0}>
        <AlertsList
          alerts={alerts}
          loading={alertsLoading}
          error={alertsError}
          total={alertsTotal}
          page={alertsPage}
          rowsPerPage={alertsRowsPerPage}
          severityFilter={severityFilter}
          onPageChange={handleAlertsPageChange}
          onRowsPerPageChange={handleAlertsRowsPerPageChange}
          onSeverityFilterChange={(value) => {
            setSeverityFilter(value);
            setAlertsPage(0);
          }}
          onAcknowledge={handleAcknowledge}
          onClearError={() => setAlertsError('')}
        />
      </TabPanel>

      {/* ---- Rules Tab ---- */}
      <TabPanel value={tabIndex} index={1}>
        {rulesError && (
          <MuiAlert severity="error" onClose={() => setRulesError('')} sx={{ mb: 2 }}>
            {rulesError}
          </MuiAlert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateRule}>
            Create Rule
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
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rulesLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : rules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No alert rules configured.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((rule) => (
                    <TableRow key={rule.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{rule.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={rule.rule_type.replace(/_/g, ' ')} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip label={rule.severity} color={severityColor(rule.severity)} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={rule.is_active ? 'Active' : 'Inactive'}
                          color={rule.is_active ? 'success' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleOpenEditRule(rule)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setDeletingRule(rule);
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

      {/* ---- Channels Tab ---- */}
      <TabPanel value={tabIndex} index={2}>
        {channelsError && (
          <MuiAlert severity="error" onClose={() => setChannelsError('')} sx={{ mb: 2 }}>
            {channelsError}
          </MuiAlert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateChannel}>
            Add Channel
          </Button>
        </Box>

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {channelsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : channels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">
                        No notification channels configured.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  channels.map((channel) => (
                    <TableRow key={channel.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {channel.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={channel.channel_type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={channel.is_active ? 'Active' : 'Inactive'}
                          color={channel.is_active ? 'success' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(channel.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Test">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleTestChannel(channel.id)}
                          >
                            <TestIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleOpenEditChannel(channel)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setDeletingChannel(channel);
                              setDeleteChannelDialogOpen(true);
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

      {/* ---- Create/Edit Rule Dialog ---- */}
      <AlertRuleForm
        open={ruleDialogOpen}
        onClose={() => setRuleDialogOpen(false)}
        onSubmit={handleRuleSubmit}
        editingRule={editingRule}
        error={rulesError}
      />

      {/* ---- Delete Rule Confirmation Dialog ---- */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Alert Rule</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete rule <strong>{deletingRule?.name}</strong>? This action
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

      {/* ---- Create/Edit Channel Dialog ---- */}
      <NotificationChannelForm
        open={channelDialogOpen}
        onClose={handleCloseChannelDialog}
        onSubmit={handleChannelSubmit}
        onTest={handleTestChannel}
        editingChannel={editingChannel}
        error={channelFormError}
      />

      {/* ---- Delete Channel Confirmation Dialog ---- */}
      <Dialog open={deleteChannelDialogOpen} onClose={() => setDeleteChannelDialogOpen(false)}>
        <DialogTitle>Delete Notification Channel</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete channel <strong>{deletingChannel?.name}</strong>? This
            action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteChannelDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteChannelConfirm}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- Snackbar for channel operations ---- */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default AlertsPage;
