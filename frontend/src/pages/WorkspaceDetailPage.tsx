import { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, CircularProgress, Breadcrumbs, Link,
  Grid,
} from '@mui/material';
import { format } from 'date-fns';
import DashboardCard from '../components/DashboardCard';
import SnapshotCompareView from '../components/SnapshotCompareView';
import api from '../services/api';

interface WorkspaceSummary {
  workspace_name: string;
  source_name: string;
  last_analyzed: string | null;
  resource_count: number;
  rum_count: number;
  terraform_version?: string;
  status: string;
}

interface WorkspaceHistoryRow {
  run_id: string;
  run_status: string;
  completed_at: string | null;
  started_at: string | null;
  total_resources: number;
  rum_count: number;
  terraform_version: string | null;
}

interface DriftEventRow {
  id: string;
  workspace_name: string;
  detected_at: string;
  drift_type: string;
  severity: string;
  resource_address: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    return format(new Date(dateStr), 'MMM d, yyyy HH:mm');
  } catch {
    return dateStr;
  }
}

function statusColor(status: string): 'success' | 'error' | 'warning' | 'info' | 'default' {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'success':
    case 'healthy':
      return 'success';
    case 'failed':
    case 'error':
      return 'error';
    case 'running':
    case 'in_progress':
      return 'info';
    case 'stale':
    case 'cancelled':
      return 'warning';
    default:
      return 'default';
  }
}

function severityColor(sev: string): 'error' | 'warning' | 'info' | 'default' {
  switch (sev?.toLowerCase()) {
    case 'critical':
    case 'high':
      return 'error';
    case 'medium':
    case 'warning':
      return 'warning';
    case 'low':
    case 'info':
      return 'info';
    default:
      return 'default';
  }
}

const WorkspaceDetailPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const decodedName = name ? decodeURIComponent(name) : '';

  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [tabIndex, setTabIndex] = useState(0);

  const [runs, setRuns] = useState<WorkspaceHistoryRow[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  const [driftEvents, setDriftEvents] = useState<DriftEventRow[]>([]);
  const [driftLoading, setDriftLoading] = useState(false);

  useEffect(() => {
    if (!decodedName) return;
    const fetchSummary = async () => {
      setSummaryLoading(true);
      try {
        const res = await api.getDashboardWorkspaces();
        const data: WorkspaceSummary[] = res.data ?? res ?? [];
        const match = (Array.isArray(data) ? data : []).find(
          (ws) => ws.workspace_name === decodedName,
        );
        setSummary(match ?? null);
      } catch {
        // best-effort
      } finally {
        setSummaryLoading(false);
      }
    };
    fetchSummary();
  }, [decodedName]);

  const fetchRuns = useCallback(async () => {
    if (!decodedName) return;
    setRunsLoading(true);
    try {
      const runsRes = await api.listAnalysisRuns({ limit: 20 });
      const runsData = runsRes.data ?? runsRes ?? [];
      const allRuns: Array<{
        id: string;
        status: string;
        completed_at: string | null;
        started_at: string | null;
      }> = Array.isArray(runsData) ? runsData : [];

      // For each run, fetch results and find this workspace's entry
      const settled = await Promise.allSettled(
        allRuns.map(async (run) => {
          const resultsRes = await api.getAnalysisRunResults(run.id, { limit: 200 });
          const results = resultsRes.data ?? resultsRes ?? [];
          const wsResult = (Array.isArray(results) ? results : []).find(
            (r: Record<string, unknown>) => r.workspace_name === decodedName,
          );
          if (!wsResult) return null;
          return {
            run_id: run.id,
            run_status: run.status,
            completed_at: run.completed_at,
            started_at: run.started_at,
            total_resources: (wsResult.total_resources as number) ?? 0,
            rum_count: (wsResult.rum_count as number) ?? 0,
            terraform_version: (wsResult.terraform_version as string) ?? null,
          } satisfies WorkspaceHistoryRow;
        }),
      );

      const rows: WorkspaceHistoryRow[] = [];
      for (const r of settled) {
        if (r.status === 'fulfilled' && r.value !== null) {
          rows.push(r.value);
        }
      }

      setRuns(rows);
    } catch {
      // non-blocking
    } finally {
      setRunsLoading(false);
    }
  }, [decodedName]);

  const fetchDriftEvents = useCallback(async () => {
    if (!decodedName) return;
    setDriftLoading(true);
    try {
      const res = await api.listDriftEvents({ workspace_name: decodedName });
      const data = res.data ?? res ?? [];
      setDriftEvents(Array.isArray(data) ? data : []);
    } catch {
      // non-blocking
    } finally {
      setDriftLoading(false);
    }
  }, [decodedName]);

  useEffect(() => {
    if (tabIndex === 0) fetchRuns();
    if (tabIndex === 2) fetchDriftEvents();
  }, [tabIndex, fetchRuns, fetchDriftEvents]);

  if (summaryLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/workspaces" underline="hover" color="inherit">
          Workspaces
        </Link>
        <Typography color="text.primary">{decodedName}</Typography>
      </Breadcrumbs>

      <Typography variant="h4" gutterBottom>
        {decodedName}
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Total Resources"
            value={summary?.resource_count ?? 0}
            subtitle="All resource types"
            accentColor="#2196F3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="RUM Count"
            value={summary?.rum_count ?? 0}
            subtitle="Resources Under Management"
            accentColor="#FF9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={1}
            sx={{
              p: 2.5,
              height: '100%',
              borderLeft: '4px solid #4CAF50',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              TF Version
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
              {summary?.terraform_version ?? 'N/A'}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={1}
            sx={{
              p: 2.5,
              height: '100%',
              borderLeft: '4px solid #9C27B0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Last Analyzed
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
              {formatDate(summary?.last_analyzed)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined">
        <Tabs
          value={tabIndex}
          onChange={(_e, v) => setTabIndex(v)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="History" />
          <Tab label="Snapshots" />
          <Tab label="Drift Events" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {/* History tab */}
          <TabPanel value={tabIndex} index={0}>
            {runsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Run Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Resources</TableCell>
                      <TableCell align="right">RUM</TableCell>
                      <TableCell>TF Version</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {runs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No analysis runs found for this workspace.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      runs.map((run) => (
                        <TableRow key={run.run_id} hover>
                          <TableCell>
                            {formatDate(run.completed_at ?? run.started_at)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={run.run_status}
                              color={statusColor(run.run_status)}
                              size="small"
                              variant="filled"
                            />
                          </TableCell>
                          <TableCell align="right">
                            {(run.total_resources ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell align="right">
                            {(run.rum_count ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {run.terraform_version ? (
                              <Chip
                                label={run.terraform_version}
                                size="small"
                                variant="outlined"
                              />
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Snapshots tab */}
          <TabPanel value={tabIndex} index={1}>
            <SnapshotCompareView workspaceName={decodedName} />
          </TabPanel>

          {/* Drift Events tab */}
          <TabPanel value={tabIndex} index={2}>
            {driftLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Detected At</TableCell>
                      <TableCell>Drift Type</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Resource Address</TableCell>
                      <TableCell>ID</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {driftEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No drift events detected for this workspace.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      driftEvents.map((event) => (
                        <TableRow key={event.id} hover>
                          <TableCell>{formatDate(event.detected_at)}</TableCell>
                          <TableCell>
                            <Chip
                              label={event.drift_type?.replace(/_/g, ' ') ?? 'unknown'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={event.severity ?? 'unknown'}
                              color={severityColor(event.severity)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {event.resource_address}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                              {event.id.slice(0, 8)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
};

export default WorkspaceDetailPage;
