import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert as MuiAlert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import RuleFolderOutlined from '@mui/icons-material/RuleFolderOutlined';
import api from '../services/api';
import { queryKeys } from '../services/queryKeys';
import PageHeader from '../components/PageHeader';
import Page from '../components/Page';
import DashboardCard from '../components/DashboardCard';
import EmptyState from '../components/EmptyState';
import type { VersionDriftEntry } from '../types/dashboard';

type StatusColor = 'success' | 'error' | 'default';

const statusColor = (status: string): StatusColor => {
  switch (status) {
    case 'satisfied':
      return 'success';
    case 'drift':
      return 'error';
    default:
      return 'default';
  }
};

const VersionDriftPage: React.FC = () => {
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.dashboard.versionDrift(),
    queryFn: () => api.getVersionDrift(),
  });

  const statusLabel = (status: VersionDriftEntry['status']): string => {
    switch (status) {
      case 'satisfied':
        return t('versionDrift.status.satisfied');
      case 'drift':
        return t('versionDrift.status.drift');
      default:
        return t('versionDrift.status.unknown');
    }
  };

  return (
    <Page>
      <PageHeader title={t('versionDrift.title')} description={t('versionDrift.subtitle')} />

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {!isLoading && isError && (
        <MuiAlert severity="error" sx={{ mb: 2 }}>
          {t('versionDrift.loadError')}
        </MuiAlert>
      )}

      {!isLoading && !isError && data && (
        <>
          {/* Rollup summary cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DashboardCard
                title={t('versionDrift.summary.satisfied')}
                value={data.satisfied}
                accentColor="#4CAF50"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DashboardCard
                title={t('versionDrift.summary.drift')}
                value={data.drift}
                accentColor="#F44336"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DashboardCard
                title={t('versionDrift.summary.unknown')}
                value={data.unknown}
                accentColor="#9E9E9E"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DashboardCard
                title={t('versionDrift.summary.total')}
                value={data.total}
                accentColor="#2196F3"
              />
            </Grid>
          </Grid>

          {/* Per-workspace table or empty state */}
          {data.entries.length === 0 ? (
            <Paper>
              <EmptyState
                icon={<RuleFolderOutlined />}
                title={t('versionDrift.empty.title')}
                description={t('versionDrift.empty.description')}
              />
            </Paper>
          ) : (
            <Paper>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('versionDrift.table.workspace')}</TableCell>
                      <TableCell>{t('versionDrift.table.required')}</TableCell>
                      <TableCell>{t('versionDrift.table.actual')}</TableCell>
                      <TableCell>{t('versionDrift.table.status')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.entries.map((entry) => (
                      <TableRow key={entry.workspace_name} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {entry.workspace_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace' }}>
                            {entry.required || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace' }}>
                            {entry.actual || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabel(entry.status)}
                            color={statusColor(entry.status)}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}
    </Page>
  );
};

export default VersionDriftPage;
