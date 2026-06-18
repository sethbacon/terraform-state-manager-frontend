import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
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
import type { TooltipProps } from 'recharts'
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
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
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
          {q.data.states_listed > q.data.states && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('pages.dashboard.syncPartial', {
                stored: q.data.states,
                listed: q.data.states_listed,
              })}
            </Alert>
          )}
          {q.data.source_errors > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('pages.dashboard.syncErrors', { count: q.data.source_errors })}
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

          {q.data.sync.length > 0 && (
            <Card variant="outlined" sx={{ mb: 3 }} data-testid="sync-status-panel">
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="overline" color="text.secondary">
                  {t('pages.dashboard.syncStatus')}
                </Typography>
                <Stack spacing={0.5}>
                  {q.data.sync.map((s) => (
                    <Stack key={s.source_id} direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {s.name}
                      </Typography>
                      <Chip size="small" variant="outlined" label={s.type} />
                      {s.synced ? (
                        <>
                          <Typography variant="caption" color="text.secondary">
                            {t('pages.dashboard.syncStates', {
                              stored: s.states_stored ?? 0,
                              listed: s.states_listed ?? 0,
                            })}
                          </Typography>
                          {s.last_sync_at && (
                            <Typography variant="caption" color="text.secondary">
                              {t('pages.dashboard.syncedAt', {
                                time: new Date(s.last_sync_at).toLocaleTimeString(),
                              })}
                            </Typography>
                          )}
                          {(s.read_errors ?? 0) > 0 && (
                            <Chip size="small" color="warning" label={t('pages.dashboard.syncReadErrors', { count: s.read_errors })} />
                          )}
                          {s.last_error && (
                            <Typography variant="caption" color="error" sx={{ wordBreak: 'break-all' }}>
                              {s.last_error}
                            </Typography>
                          )}
                        </>
                      ) : (
                        <Chip size="small" color="info" variant="outlined" label={t('pages.dashboard.syncPending')} />
                      )}
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

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
        <RTooltip content={<CountTooltip />} />
        <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/**
 * Tooltip for the horizontal count bars. The category (e.g. Terraform version)
 * is not always visible on the Y axis, so show it alongside the count rather
 * than relying on recharts' default content, which only renders the value.
 */
function CountTooltip({ active, payload }: TooltipProps<number, string>) {
  const { t } = useTranslation()
  if (!active || !payload || payload.length === 0) return null
  const datum = payload[0].payload as Count
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        boxShadow: 3,
        px: 1.5,
        py: 1,
        maxWidth: 260,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
        {datum.key}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t('pages.dashboard.count', { value: datum.count })}
      </Typography>
    </Box>
  )
}
