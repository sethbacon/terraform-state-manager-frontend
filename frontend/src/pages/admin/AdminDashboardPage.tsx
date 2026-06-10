import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Alert, Box } from '@mui/material'
import { api } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import PageHeader from '../../components/PageHeader'
import DashboardCard from '../../components/DashboardCard'
import CardGridSkeleton from '../../components/skeletons/CardGridSkeleton'

export default function AdminDashboardPage() {
  const { t } = useTranslation()
  const q = useQuery({ queryKey: queryKeys.admin.stats(), queryFn: api.getAdminStats })

  return (
    <Box>
      <PageHeader title={t('nav.admin.dashboard')} description={t('pages.admin.overview')} />
      {q.isLoading && <CardGridSkeleton count={3} />}
      {q.isError && <Alert severity="error">{t('common.error')}</Alert>}
      {q.data && (
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', mb: 3 }}>
          <DashboardCard label={t('pages.admin.users')} value={q.data.users} to="/admin/users" />
          <DashboardCard label={t('pages.admin.organizations')} value={q.data.organizations} to="/admin/organizations" />
          <DashboardCard label={t('pages.admin.roles')} value={q.data.roles} to="/admin/roles" />
        </Box>
      )}
    </Box>
  )
}
