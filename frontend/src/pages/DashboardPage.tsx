import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Skeleton,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
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
          setError('Failed to load dashboard data. Please try again later.');
        }
      } catch {
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const successRate = overview
    ? overview.total_workspaces > 0
      ? Math.round((overview.successful_workspaces / overview.total_workspaces) * 100)
      : 0
    : 0;

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
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
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <DashboardCard
            title="RUM Count"
            value={overview?.total_rum ?? 0}
            subtitle="Resources Under Management"
            accentColor="#FF9800"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <DashboardCard
            title="Managed Resources"
            value={overview?.total_managed ?? 0}
            subtitle="Total managed resources"
            accentColor="#4CAF50"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <DashboardCard
            title="Total Resources"
            value={overview?.total_resources ?? 0}
            subtitle="All resource types"
            accentColor="#2196F3"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <DashboardCard
            title="Data Sources"
            value={overview?.total_data_sources ?? 0}
            subtitle="Data source resources"
            accentColor="#9C27B0"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <DashboardCard
            title="Workspaces"
            value={overview?.total_workspaces ?? 0}
            subtitle={`${overview?.successful_workspaces ?? 0} successful`}
            accentColor="#00BCD4"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <DashboardCard
            title="Success Rate"
            value={successRate}
            subtitle={`${successRate}% of workspaces`}
            accentColor="#7B61FF"
          />
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Resource Overview Trends
            </Typography>
            <ResourceOverviewChart data={trends} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Provider Distribution
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
              Top Resource Types
            </Typography>
            <TopResourceTypesChart data={resources} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Terraform Versions
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
              RUM Trend Over Time
            </Typography>
            <RUMTrendChart data={trends} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
