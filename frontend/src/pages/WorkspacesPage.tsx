import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Box, Typography, Grid, Card, CardContent, CardActionArea, TextField,
  InputAdornment, CircularProgress, Chip, Stack, Button,
} from '@mui/material';
import Search from '@mui/icons-material/Search';
import api from '../services/api';
import PageHeader from '../components/PageHeader';

interface Workspace {
  workspace_name: string;
  source_name: string;
  last_analyzed: string | null;
  resource_count: number;
  rum_count: number;
  status: string;
}

function formatDate(dateStr: string | null, t: TFunction): string {
  if (!dateStr) return t('workspaces.never');
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function statusChipProps(status: string, t: TFunction): {
  label: string;
  color: 'success' | 'warning' | 'error' | 'default';
} {
  switch (status) {
    case 'healthy':
      return { label: t('workspaces.statusHealthy'), color: 'success' };
    case 'stale':
      return { label: t('workspaces.statusStale'), color: 'warning' };
    case 'failed':
      return { label: t('workspaces.statusFailed'), color: 'error' };
    default:
      return {
        label: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
        color: 'default',
      };
  }
}

const WorkspacesPage: React.FC = () => {
  const { t } = useTranslation();
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
        setError(t('workspaces.errLoad'));
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, [t]);

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
      <PageHeader title={t('workspaces.title')} description={t('workspaces.subtitle')} />

      {/* Search bar */}
      <TextField
        placeholder={t('workspaces.searchPlaceholder')}
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3, width: { xs: '100%', sm: 360 } }}
        slotProps={{ input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search color="action" />
            </InputAdornment>
          ),
        } }}
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
            {t('workspaces.empty')}
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/analysis')}
          >
            {t('workspaces.runAnalysis')}
          </Button>
        </Box>
      )}

      {/* No search results */}
      {!loading && !error && filtered.length === 0 && workspaces.length > 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary">
            {t('workspaces.noMatch')}
          </Typography>
        </Box>
      )}

      {/* Workspace cards grid */}
      {!loading && filtered.length > 0 && (
        <Grid container spacing={3}>
          {filtered.map((ws) => {
            const chip = statusChipProps(ws.status, t);
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={ws.workspace_name}>
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

                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {t('workspaces.cardSource', { source: ws.source_name ?? t('workspaces.unknownSource') })}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"

                        sx={{ display: "block",  mb: 1.5 }}
                      >
                        {t('workspaces.cardLastAnalyzed', { date: formatDate(ws.last_analyzed, t) })}
                      </Typography>

                      <Stack direction="row" spacing={3}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t('workspaces.cardResources')}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {(ws.resource_count ?? 0).toLocaleString()}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t('workspaces.cardRum')}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
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
