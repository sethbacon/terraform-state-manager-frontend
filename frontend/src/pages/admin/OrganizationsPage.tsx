import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Alert, Box, Chip, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import { api } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import PageHeader from '../../components/PageHeader'
import TableSkeleton from '../../components/skeletons/TableSkeleton'

export default function OrganizationsPage() {
  const { t } = useTranslation()
  const q = useQuery({ queryKey: queryKeys.admin.organizations(), queryFn: api.listAdminOrganizations })

  return (
    <Box>
      <PageHeader title={t('nav.admin.organizations')} />
      {q.isLoading && <TableSkeleton rows={4} columns={3} />}
      {q.isError && <Alert severity="error">{t('common.error')}</Alert>}
      {q.data && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('common.name')}</TableCell>
              <TableCell>{t('pages.admin.displayName')}</TableCell>
              <TableCell>{t('pages.admin.idp')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {q.data.map((o) => (
              <TableRow key={o.id}>
                <TableCell>{o.name}</TableCell>
                <TableCell>{o.display_name}</TableCell>
                <TableCell>
                  {o.idp_type ? (
                    <Chip size="small" label={o.idp_name ? `${o.idp_type} · ${o.idp_name}` : o.idp_type} />
                  ) : (
                    t('common.none')
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  )
}
