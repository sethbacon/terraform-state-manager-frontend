import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Alert, Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import { api } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import PageHeader from '../../components/PageHeader'
import TableSkeleton from '../../components/skeletons/TableSkeleton'

export default function RolesPage() {
  const { t } = useTranslation()
  const q = useQuery({ queryKey: queryKeys.admin.roles(), queryFn: api.listAdminRoles })

  return (
    <Box>
      <PageHeader title={t('nav.admin.roles')} />
      {q.isLoading && <TableSkeleton rows={4} columns={3} />}
      {q.isError && <Alert severity="error">{t('common.error')}</Alert>}
      {q.data && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('pages.admin.displayName')}</TableCell>
              <TableCell>{t('pages.admin.scopes')}</TableCell>
              <TableCell>{t('pages.admin.system')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {q.data.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.display_name || r.name}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {r.scopes.map((s) => (
                      <Chip key={s} size="small" variant="outlined" label={s} />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>{r.is_system ? t('common.yes') : t('common.no')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  )
}
