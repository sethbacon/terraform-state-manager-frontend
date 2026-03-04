import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { AnalysisRun, StateSource } from '../types/analysis';
import StatusChip from '../components/StatusChip';
import AnalysisRunDialog from '../components/AnalysisRunDialog';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString();
}

const AnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [sources, setSources] = useState<StateSource[]>([]);
  const [sourceMap, setSourceMap] = useState<Record<string, string>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/v1/analysis/runs', {
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      });
      setRuns(response.data.data || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load analysis runs';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  const fetchSources = useCallback(async () => {
    try {
      const response = await api.get('/api/v1/sources');
      const sourcesData: StateSource[] = response.data.data || [];
      setSources(sourcesData);
      const map: Record<string, string> = {};
      for (const source of sourcesData) {
        map[source.id] = source.name;
      }
      setSourceMap(map);
    } catch {
      // Sources are supplementary; don't block the page on error
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleNewAnalysis = useCallback(
    async (sourceId: string) => {
      setDialogOpen(false);
      try {
        const response = await api.post('/api/v1/analysis/run', { source_id: sourceId, trigger_type: 'manual' });
        setSnackbar({ open: true, message: 'Analysis run started successfully', severity: 'success' });
        const runId = response.data?.data?.id;
        if (runId) {
          navigate(`/analysis/${runId}`);
        } else {
          fetchRuns();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start analysis run';
        setSnackbar({ open: true, message, severity: 'error' });
      }
    },
    [navigate, fetchRuns]
  );

  const handleRowClick = useCallback(
    (runId: string) => {
      navigate(`/analysis/${runId}`);
    },
    [navigate]
  );

  const [deleteTarget, setDeleteTarget] = useState<AnalysisRun | null>(null);

  const handleDeleteClick = useCallback((e: React.MouseEvent, run: AnalysisRun) => {
    e.stopPropagation();
    setDeleteTarget(run);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/v1/analysis/runs/${deleteTarget.id}`);
      setSnackbar({ open: true, message: 'Analysis run deleted', severity: 'success' });
      fetchRuns();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete analysis run';
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, fetchRuns]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Analysis Runs
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchRuns}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            New Analysis
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && runs.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper variant="outlined">
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell align="right">Total Workspaces</TableCell>
                  <TableCell align="right">RUM</TableCell>
                  <TableCell align="right">Resources</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Started</TableCell>
                  <TableCell>Trigger</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {runs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No analysis runs found. Click "New Analysis" to start one.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  runs.map((run) => (
                    <TableRow
                      key={run.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleRowClick(run.id)}
                    >
                      <TableCell>
                        <StatusChip status={run.status} />
                      </TableCell>
                      <TableCell>
                        {sourceMap[run.source_id] || run.source_id.slice(0, 8)}
                      </TableCell>
                      <TableCell align="right">{run.total_workspaces.toLocaleString()}</TableCell>
                      <TableCell align="right">{run.total_rum.toLocaleString()}</TableCell>
                      <TableCell align="right">{run.total_resources.toLocaleString()}</TableCell>
                      <TableCell>{formatDuration(run.performance_ms)}</TableCell>
                      <TableCell>{formatDate(run.started_at)}</TableCell>
                      <TableCell>{run.trigger_type}</TableCell>
                      <TableCell align="center">
                        {run.status !== 'pending' && run.status !== 'running' && (
                          <Tooltip title="Delete run">
                            <IconButton
                              size="small"
                              onClick={(e) => handleDeleteClick(e, run)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Paper>
      )}

      <AnalysisRunDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleNewAnalysis}
        sources={sources}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Analysis Run</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete this analysis run and all its results. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AnalysisPage;
