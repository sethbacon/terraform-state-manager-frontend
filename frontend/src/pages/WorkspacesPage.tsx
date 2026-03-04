import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, CardActionArea, TextField,
  InputAdornment, CircularProgress, Chip, Stack, Button,
} from '@mui/material';
import Search from '@mui/icons-material/Search';
import api from '../services/api';

interface Workspace {
  workspace_name: string;
  source_name: string;
  last_analyzed: string | null;
  resource_count: number;
  rum_count: number;
  status: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function statusChipProps(status: string): {
  label: string;
  color: 'success' | 'warning' | 'error' | 'default';
} {
  switch (status) {
    case 'healthy':
      return { label: 'Healthy', color: 'success' };
    case 'stale':
      return { label: 'Stale', color: 'warning' };
    case 'failed':
      return { label: 'Failed', color: 'error' };
    default:
      return {
        label: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
        color: 'default',
      };
  }
}

const WorkspacesPage: React.FC = () => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchWorkspaces = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.getDashboardWorkspaces();
        const data = res.data ?? res ?? [];
        setWorkspaces(Array.isArray(data) ? data : []);
      } catch {
        setError('Failed to load workspaces.');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return workspaces;
    const term = search.toLowerCase();
    return workspaces.filter(
      (ws) =>
        ws.workspace_name.toLowerCase().includes(term) ||
        ws.source_name?.toLowerCase().includes(term),
    );
  }, [workspaces, search]);

  return (
    <Box>
      {/* Header */}
      <Typography variant="h4" gutterBottom>
        Workspaces
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Browse and inspect Terraform workspaces that have been analyzed across all configured sources.
      </Typography>

      {/* Search bar */}
      <TextField
        placeholder="Search workspaces..."
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3, width: { xs: '100%', sm: 360 } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search color="action" />
            </InputAdornment>
          ),
        }}
      />

      {/* Loading state */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error state */}
      {!loading && error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && workspaces.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            No workspaces analyzed yet.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/analysis')}
          >
            Run Analysis
          </Button>
        </Box>
      )}

      {/* No search results */}
      {!loading && !error && filtered.length === 0 && workspaces.length > 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary">
            No workspaces match your search.
          </Typography>
        </Box>
      )}

      {/* Workspace cards grid */}
      {!loading && filtered.length > 0 && (
        <Grid container spacing={3}>
          {filtered.map((ws) => {
            const chip = statusChipProps(ws.status);
            return (
              <Grid item xs={12} sm={6} md={4} key={ws.workspace_name}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardActionArea
                    onClick={() =>
                      navigate(`/workspaces/${encodeURIComponent(ws.workspace_name)}`)
                    }
                    sx={{ height: '100%' }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          mb: 1,
                        }}
                      >
                        <Typography variant="h6" noWrap sx={{ flex: 1, mr: 1 }}>
                          {ws.workspace_name}
                        </Typography>
                        <Chip
                          label={chip.label}
                          color={chip.color}
                          size="small"
                          variant="filled"
                        />
                      </Box>

                      <Typography variant="caption" color="text.secondary" display="block">
                        Source: {ws.source_name ?? 'Unknown'}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ mb: 1.5 }}
                      >
                        Last analyzed: {formatDate(ws.last_analyzed)}
                      </Typography>

                      <Stack direction="row" spacing={3}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Resources
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {(ws.resource_count ?? 0).toLocaleString()}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            RUM
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {(ws.rum_count ?? 0).toLocaleString()}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default WorkspacesPage;
