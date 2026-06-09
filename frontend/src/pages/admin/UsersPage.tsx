import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Alert, Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import { api } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import PageHeader from '../../components/PageHeader'
import TableSkeleton from '../../components/skeletons/TableSkeleton'

export default function UsersPage() {
  const { t } = useTranslation()
  const q = useQuery({ queryKey: queryKeys.admin.users(), queryFn: api.listAdminUsers })

  return (
    <Box>
      <PageHeader title={t('nav.admin.users')} />
      {q.isLoading && <TableSkeleton rows={6} columns={3} />}
      {q.isError && <Alert severity="error">{t('common.error')}</Alert>}
      {q.data && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('pages.admin.email')}</TableCell>
              <TableCell>{t('common.name')}</TableCell>
              <TableCell>{t('pages.admin.memberships')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {q.data.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.name}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {(u.memberships ?? []).map((m, i) => (
                      <Chip
                        key={i}
                        size="small"
                        label={`${m.organization_name ?? '—'} · ${m.role_template_name ?? '—'}`}
                      />
                    ))}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  )
}
