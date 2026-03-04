import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
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
  Chip,
  TextField,
  InputAdornment,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Search as SearchIcon } from '@mui/icons-material';
import api from '../services/api';
import { AnalysisRun, AnalysisResult, ProviderAnalysis } from '../types/analysis';
import StatusChip from '../components/StatusChip';
import ResourceTypesTable from '../components/ResourceTypesTable';
import ProviderAnalysisTable from '../components/ProviderAnalysisTable';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

const AnalysisDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [run, setRun] = useState<AnalysisRun | null>(null);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [resultsPage, setResultsPage] = useState(0);
  const [resultsPerPage, setResultsPerPage] = useState(25);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultsFilter, setResultsFilter] = useState('');

  const fetchRun = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/v1/analysis/runs/${id}`);
      setRun(response.data.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load analysis run details';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchResults = useCallback(async () => {
    if (!id) return;
    setResultsLoading(true);
    try {
      const response = await api.get(`/api/v1/analysis/runs/${id}/results`, {
        limit: 1000,
        offset: 0,
      });
      setResults(response.data.data || []);
    } catch {
      // Results load is non-blocking
    } finally {
      setResultsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Aggregate resource type data across all results
  const aggregatedResourceTypes = React.useMemo(() => {
    const aggregated: Record<string, number> = {};
    for (const result of results) {
      if (result.resources_by_type) {
        for (const [type, count] of Object.entries(result.resources_by_type)) {
          aggregated[type] = (aggregated[type] || 0) + count;
        }
      }
    }
    return aggregated;
  }, [results]);

  // Aggregate provider analysis across all results
  const aggregatedProviderAnalysis: ProviderAnalysis | null = React.useMemo(() => {
    const versions: Record<string, string> = {};
    const usage: Record<string, { resource_count: number; resource_types: string[]; modules: string[] }> = {};
    let hasData = false;

    for (const result of results) {
      if (!result.provider_analysis) continue;

      // Backend returns provider_analysis as a flat {provider: count} map.
      // Adapt to the nested structure the UI expects.
      const pa = result.provider_analysis;
      if (pa.provider_versions && pa.provider_usage) {
        // Already nested structure
        hasData = true;
        for (const [provider, version] of Object.entries(pa.provider_versions)) {
          if (!versions[provider]) {
            versions[provider] = version as string;
          }
        }
        for (const [provider, providerUsage] of Object.entries(pa.provider_usage as Record<string, { resource_count: number; resource_types: string[]; modules: string[] }>)) {
          if (!usage[provider]) {
            usage[provider] = { resource_count: 0, resource_types: [], modules: [] };
          }
          usage[provider].resource_count += providerUsage.resource_count;
          const typesSet = new Set([...usage[provider].resource_types, ...providerUsage.resource_types]);
          usage[provider].resource_types = Array.from(typesSet);
          const modulesSet = new Set([...usage[provider].modules, ...providerUsage.modules]);
          usage[provider].modules = Array.from(modulesSet);
        }
      } else {
        // Flat {provider: count} map from backend
        const entries = Object.entries(pa);
        if (entries.length > 0) {
          hasData = true;
          for (const [provider, count] of entries) {
            if (!usage[provider]) {
              usage[provider] = { resource_count: 0, resource_types: [], modules: [] };
            }
            usage[provider].resource_count += count as number;
          }
        }
      }
    }

    if (!hasData) return null;

    const providerNames = new Set([...Object.keys(versions), ...Object.keys(usage)]);
    return {
      provider_versions: versions,
      provider_usage: usage,
      provider_statistics: {
        total_providers: providerNames.size,
        providers_with_versions: Object.keys(versions).length,
        providers_without_versions: providerNames.size - Object.keys(versions).length,
      },
    };
  }, [results]);

  // Client-side filtering and pagination
  const filteredResults = React.useMemo(() => {
    if (!resultsFilter) return results;
    const lowerFilter = resultsFilter.toLowerCase();
    return results.filter((r) => r.workspace_name.toLowerCase().includes(lowerFilter));
  }, [results, resultsFilter]);

  const paginatedResults = React.useMemo(() => {
    const start = resultsPage * resultsPerPage;
    return filteredResults.slice(start, start + resultsPerPage);
  }, [filteredResults, resultsPage, resultsPerPage]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/analysis')} sx={{ mb: 2 }}>
          Back to Analysis
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!run) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/analysis')} sx={{ mb: 2 }}>
          Back to Analysis
        </Button>
        <Alert severity="warning">Analysis run not found.</Alert>
      </Box>
    );
  }

  const successRate =
    run.total_workspaces > 0
      ? ((run.successful_count / run.total_workspaces) * 100).toFixed(1)
      : '0';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/analysis')}>
          Back
        </Button>
        <Typography variant="h5" fontWeight={600} sx={{ flex: 1 }}>
          Analysis Run Details
        </Typography>
        <StatusChip status={run.status} size="medium" />
      </Box>

      {run.error_message && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {run.error_message}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Total Workspaces
              </Typography>
              <Typography variant="h4" fontWeight={600}>
                {run.total_workspaces.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {run.successful_count} succeeded, {run.failed_count} failed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Total RUM
              </Typography>
              <Typography variant="h4" fontWeight={600}>
                {run.total_rum.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Resource Under Management
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Total Resources
              </Typography>
              <Typography variant="h4" fontWeight={600}>
                {run.total_resources.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {run.total_managed.toLocaleString()} managed, {run.total_data_sources.toLocaleString()} data sources
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Success Rate
              </Typography>
              <Typography variant="h4" fontWeight={600}>
                {successRate}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Duration: {formatDuration(run.performance_ms)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper variant="outlined">
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Results" />
          <Tab label="Resource Types" />
          <Tab label="Providers" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {/* Results Tab */}
          <TabPanel value={tabValue} index={0}>
            {resultsLoading && results.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <>
                <TextField
                  size="small"
                  placeholder="Filter workspaces..."
                  value={resultsFilter}
                  onChange={(e) => { setResultsFilter(e.target.value); setResultsPage(0); }}
                  sx={{ mb: 2, width: 300 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                    ),
                  }}
                />
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Workspace Name</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Resources</TableCell>
                        <TableCell align="right">RUM</TableCell>
                        <TableCell>Terraform Version</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedResults.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              {resultsFilter ? 'No workspaces match your filter.' : 'No results available yet.'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedResults.map((result) => (
                          <TableRow key={result.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {result.workspace_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {result.organization}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <StatusChip status={result.status} />
                            </TableCell>
                            <TableCell align="right">
                              {result.total_resources.toLocaleString()}
                            </TableCell>
                            <TableCell align="right">
                              {result.rum_count.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {result.terraform_version ? (
                                <Chip
                                  label={result.terraform_version}
                                  size="small"
                                  variant="outlined"
                                />
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={filteredResults.length}
                  page={resultsPage}
                  onPageChange={(_, newPage) => setResultsPage(newPage)}
                  rowsPerPage={resultsPerPage}
                  onRowsPerPageChange={(e) => {
                    setResultsPerPage(parseInt(e.target.value, 10));
                    setResultsPage(0);
                  }}
                  rowsPerPageOptions={[10, 25, 50, 100]}
                />
              </>
            )}
          </TabPanel>

          {/* Resource Types Tab */}
          <TabPanel value={tabValue} index={1}>
            <ResourceTypesTable resourcesByType={aggregatedResourceTypes} />
          </TabPanel>

          {/* Providers Tab */}
          <TabPanel value={tabValue} index={2}>
            {aggregatedProviderAnalysis ? (
              <ProviderAnalysisTable providerAnalysis={aggregatedProviderAnalysis} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                No provider analysis data available.
              </Typography>
            )}
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
};

export default AnalysisDetailPage;
