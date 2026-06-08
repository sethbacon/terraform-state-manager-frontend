import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Typography,
  Paper,
  Skeleton,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import PageHeader from '../components/PageHeader';
import Page from '../components/Page';
import DashboardCard from '../components/DashboardCard';
import ResourceOverviewChart from '../components/charts/ResourceOverviewChart';
import ProviderDistributionChart from '../components/charts/ProviderDistributionChart';
import TopResourceTypesChart from '../components/charts/TopResourceTypesChart';
import TerraformVersionsChart from '../components/charts/TerraformVersionsChart';
import RUMTrendChart from '../components/charts/RUMTrendChart';
import api from '../services/api';
import type {
  DashboardOverview,
  TrendDataPoint,
  ProviderDistribution,
  ResourceBreakdown,
  TerraformVersionInfo,
} from '../types/dashboard';

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [providers, setProviders] = useState<ProviderDistribution[]>([]);
  const [resources, setResources] = useState<ResourceBreakdown[]>([]);
  const [versions, setVersions] = useState<TerraformVersionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');
      try {
        const [overviewRes, trendsRes, providersRes, resourcesRes, versionsRes] =
          await Promise.allSettled([
            api.get('/api/v1/dashboard/overview'),
            api.get('/api/v1/dashboard/trends'),
            api.get('/api/v1/dashboard/providers'),
            api.get('/api/v1/dashboard/resources'),
            api.get('/api/v1/dashboard/terraform-versions'),
          ]);

        if (overviewRes.status === 'fulfilled') {
          const d = overviewRes.value.data;
          setOverview(Array.isArray(d) ? null : (d?.data ?? d ?? null));
        }
        if (trendsRes.status === 'fulfilled') {
          const d = trendsRes.value.data?.data;
          setTrends(Array.isArray(d) ? d : []);
        }
        if (providersRes.status === 'fulfilled') {
          const d = providersRes.value.data?.data;
          setProviders(Array.isArray(d) ? d : []);
        }
        if (resourcesRes.status === 'fulfilled') {
          const d = resourcesRes.value.data?.data;
          setResources(Array.isArray(d) ? d : []);
        }
        if (versionsRes.status === 'fulfilled') {
          const d = versionsRes.value.data?.data;
          setVersions(Array.isArray(d) ? d : []);
        }

        const allFailed = [overviewRes, trendsRes, providersRes, resourcesRes, versionsRes]
          .every((r) => r.status === 'rejected');
        if (allFailed) {
          setError(t('dashboards.errLoad'));
        }
      } catch {
        setError(t('dashboards.errLoad'));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [t]);

  const successRate = overview
    ? overview.total_workspaces > 0
      ? Math.round((overview.successful_workspaces / overview.total_workspaces) * 100)
      : 0
    : 0;

  if (loading) {
    return (
      <Page>
        <PageHeader title={t('dashboards.title')} description={t('dashboards.subtitle')} />
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1 }} />
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1 }} />
          </Grid>
        </Grid>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader title={t('dashboards.title')} description={t('dashboards.subtitle')} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <DashboardCard
            title={t('dashboards.cards.rumCount')}
            value={overview?.total_rum ?? 0}
            subtitle={t('dashboards.cards.rumCountSubtitle')}
            accentColor="#FF9800"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <DashboardCard
            title={t('dashboards.cards.managedResources')}
            value={overview?.total_managed ?? 0}
            subtitle={t('dashboards.cards.managedResourcesSubtitle')}
            accentColor="#4CAF50"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <DashboardCard
            title={t('dashboards.cards.totalResources')}
            value={overview?.total_resources ?? 0}
            subtitle={t('dashboards.cards.totalResourcesSubtitle')}
            accentColor="#2196F3"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <DashboardCard
            title={t('dashboards.cards.dataSources')}
            value={overview?.total_data_sources ?? 0}
            subtitle={t('dashboards.cards.dataSourcesSubtitle')}
            accentColor="#9C27B0"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <DashboardCard
            title={t('dashboards.cards.workspaces')}
            value={overview?.total_workspaces ?? 0}
            subtitle={t('dashboards.cards.workspacesSubtitle', { count: overview?.successful_workspaces ?? 0 })}
            accentColor="#00BCD4"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <DashboardCard
            title={t('dashboards.cards.successRate')}
            value={successRate}
            subtitle={t('dashboards.cards.successRateSubtitle', { percent: successRate })}
            accentColor="#7B61FF"
          />
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('dashboards.charts.resourceOverviewTrends')}
            </Typography>
            <ResourceOverviewChart data={trends} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              {t('dashboards.charts.providerDistribution')}
            </Typography>
            <ProviderDistributionChart data={providers} />
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('dashboards.charts.topResourceTypes')}
            </Typography>
            <TopResourceTypesChart data={resources} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('dashboards.charts.terraformVersions')}
            </Typography>
            <TerraformVersionsChart data={versions} />
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row 3 */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('dashboards.charts.rumTrendOverTime')}
            </Typography>
            <RUMTrendChart data={trends} />
          </Paper>
        </Grid>
      </Grid>
    </Page>
  );
};

export default DashboardPage;
