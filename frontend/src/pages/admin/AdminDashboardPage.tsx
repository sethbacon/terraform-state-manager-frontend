import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Alert, Box, CircularProgress, Divider, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { api } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import { useAuth } from '../../contexts/AuthContext'
import PageHeader from '../../components/PageHeader'
import PageTitleIcon from '@mui/icons-material/DashboardCustomize'
import DashboardCard from '../../components/DashboardCard'
import CardGridSkeleton from '../../components/skeletons/CardGridSkeleton'
import EstateOverview from '../../components/EstateOverview'

/**
 * The authenticated dashboard. Every signed-in user sees the cross-source estate
 * overview; the identity counts (users/organizations/roles) are an admin-only
 * section, so the stats query is skipped for non-admins.
 */
export default function AdminDashboardPage() {
  const { t } = useTranslation()
  const { hasScope } = useAuth()
  const isAdmin = hasScope('admin')
  const queryClient = useQueryClient()
  const overview = useQuery({ queryKey: queryKeys.dashboard.overview(), queryFn: () => api.getDashboardOverview() })
  const stats = useQuery({ queryKey: queryKeys.admin.stats(), queryFn: api.getAdminStats, enabled: isAdmin })
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

  return (
    <Box>
      <PageHeader
        icon={<PageTitleIcon />}
        title={t('nav.admin.dashboard')}
        description={t('help.pages.dashboard.body')}
        actions={
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {overview.data?.refreshed_at && (
              <Typography variant="caption" color="text.secondary">
                {t('pages.dashboard.asOf', { time: new Date(overview.data.refreshed_at).toLocaleTimeString() })}
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

      <EstateOverview data={overview.data} isLoading={overview.isLoading} isError={overview.isError} />

      {isAdmin && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            {t('pages.admin.identity')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t('pages.admin.overview')}
          </Typography>
          {stats.isLoading && <CardGridSkeleton count={3} />}
          {stats.isError && <Alert severity="error">{t('common.error')}</Alert>}
          {stats.data && (
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
              <DashboardCard label={t('pages.admin.users')} value={stats.data.users} to="/admin/users" />
              <DashboardCard label={t('pages.admin.organizations')} value={stats.data.organizations} to="/admin/organizations" />
              <DashboardCard label={t('pages.admin.roles')} value={stats.data.roles} to="/admin/roles" />
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}
