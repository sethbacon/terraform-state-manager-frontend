import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as OrgIcon,
  VpnKey as KeyIcon,
  History as AuditIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';

interface DashboardStats {
  total_users: number;
  total_organizations: number;
  total_api_keys: number;
  recent_audit_events: number;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactElement;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: `${color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {React.cloneElement(icon as React.ReactElement<Record<string, unknown>>, { sx: { color, fontSize: 28 } })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/v1/admin/stats/dashboard');
        setStats(response.data);
      } catch {
        setError(t('admin.dashboard.errLoadStats'));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [t]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={t('admin.dashboard.pageTitle')}
        description={t('admin.dashboard.subtitle')}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {stats && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard title={t('admin.dashboard.statTotalUsers')} value={stats.total_users} icon={<PeopleIcon />} color="#7B61FF" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard title={t('admin.dashboard.statOrganizations')} value={stats.total_organizations} icon={<OrgIcon />} color="#00BFA5" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard title={t('admin.dashboard.statApiKeys')} value={stats.total_api_keys} icon={<KeyIcon />} color="#FF6B35" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard title={t('admin.dashboard.statRecentEvents')} value={stats.recent_audit_events} icon={<AuditIcon />} color="#2196F3" />
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default DashboardPage;
