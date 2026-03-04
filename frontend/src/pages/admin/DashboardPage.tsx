import React, { useState, useEffect } from 'react';
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
          <Typography variant="h4" fontWeight={700}>
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
          {React.cloneElement(icon, { sx: { color, fontSize: 28 } })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/v1/admin/stats/dashboard');
        setStats(response.data);
      } catch {
        setError('Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {stats && (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Total Users" value={stats.total_users} icon={<PeopleIcon />} color="#7B61FF" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Organizations" value={stats.total_organizations} icon={<OrgIcon />} color="#00BFA5" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="API Keys" value={stats.total_api_keys} icon={<KeyIcon />} color="#FF6B35" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Recent Events" value={stats.recent_audit_events} icon={<AuditIcon />} color="#2196F3" />
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default DashboardPage;
