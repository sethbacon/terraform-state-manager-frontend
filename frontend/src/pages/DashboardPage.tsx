import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import StorageIcon from '@mui/icons-material/Storage'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api, type Count } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import PageHeader from '../components/PageHeader'
import DashboardCard from '../components/DashboardCard'
import EmptyState from '../components/EmptyState'
import CardGridSkeleton from '../components/skeletons/CardGridSkeleton'

export default function DashboardPage() {
  const { t } = useTranslation()
  const theme = useTheme()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const q = useQuery({ queryKey: queryKeys.dashboard.overview(), queryFn: () => api.getDashboardOverview() })
  const [refreshing, setRefreshing] = useState(false)
  const forceRefresh = async () => {
    setRefreshing(true)
    try {
      const fresh = await api.getDashboardOverview(true)
      queryClient.setQueryData(queryKeys.dashboard.overview(), fresh)
    } finally {
      setRefreshing(false)
    }
  }

  const palette = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.main,
    '#7e57c2',
    '#26a69a',
  ]

  return (
    <Box>
      <PageHeader
        title={t('nav.dashboard')}
        description={t('help.pages.dashboard.body')}
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            {q.data?.refreshed_at && (
              <Typography variant="caption" color="text.secondary">
                {t('pages.dashboard.asOf', { time: new Date(q.data.refreshed_at).toLocaleTimeString() })}
              </Typography>
            )}
            <Tooltip title={t('common.refresh')}>
              <span>
                <IconButton size="small" onClick={forceRefresh} disabled={refreshing} aria-label={t('common.refresh')}>
                  {refreshing ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        }
      />

      {q.isLoading && <CardGridSkeleton count={6} />}
      {q.isError && <Alert severity="error">{t('common.error')}</Alert>}

      {q.data && q.data.sources === 0 && (
        <EmptyState
          icon={<StorageIcon />}
          title={t('pages.dashboard.empty')}
          primaryAction={{ label: t('pages.dashboard.goToSources'), onClick: () => navigate('/sources') }}
        />
      )}

      {q.data && q.data.sources > 0 && (
        <>
          {q.data.source_errors > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('pages.dashboard.sourceErrors', { count: q.data.source_errors })}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', mb: 3 }}>
            <DashboardCard label={t('pages.dashboard.rum')} hint={t('pages.dashboard.rumHint')} value={q.data.rum} />
            <DashboardCard label={t('pages.dashboard.managed')} value={q.data.managed_resources} />
            <DashboardCard label={t('pages.dashboard.dataSources')} value={q.data.data_sources} />
            <DashboardCard label={t('pages.dashboard.totalInstances')} value={q.data.total_resources} />
            <DashboardCard label={t('pages.dashboard.sources')} value={q.data.sources} />
            <DashboardCard label={t('pages.dashboard.states')} value={q.data.states} />
          </Box>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <ChartCard title={t('pages.dashboard.providerDistribution')}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={q.data.providers.slice(0, 8)}
                    dataKey="count"
                    nameKey="key"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                  >
                    {q.data.providers.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={palette[i % palette.length]} />
                    ))}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t('pages.dashboard.terraformVersions')}>
              <CountBarChart data={q.data.terraform_versions} color={theme.palette.secondary.main} />
            </ChartCard>

            <ChartCard title={t('pages.dashboard.topResourceTypes')} span2>
              <CountBarChart data={q.data.resource_types} color={theme.palette.primary.main} />
            </ChartCard>
          </Box>
        </>
      )}
    </Box>
  )
}

function ChartCard({ title, span2, children }: { title: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <Card variant="outlined" sx={span2 ? { gridColumn: { md: '1 / -1' } } : undefined}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Divider sx={{ mb: 1 }} />
        {children}
      </CardContent>
    </Card>
  )
}

function CountBarChart({ data, color }: { data: Count[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="key" width={120} tick={{ fontSize: 12 }} />
        <RTooltip />
        <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
