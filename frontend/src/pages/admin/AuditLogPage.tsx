import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Alert, Box, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import { api } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import PageHeader from '../../components/PageHeader'
import TableSkeleton from '../../components/skeletons/TableSkeleton'

export default function AuditLogPage() {
  const { t } = useTranslation()
  const q = useQuery({ queryKey: queryKeys.admin.auditLogs(), queryFn: api.listAuditLogs })

  return (
    <Box>
      <PageHeader title={t('nav.admin.auditLogs')} />
      {q.isLoading && <TableSkeleton rows={8} columns={5} />}
      {q.isError && <Alert severity="error">{t('common.error')}</Alert>}
      {q.data && q.data.length === 0 && <Alert severity="info">{t('pages.admin.noAudit')}</Alert>}
      {q.data && q.data.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('pages.admin.time')}</TableCell>
              <TableCell>{t('pages.admin.action')}</TableCell>
              <TableCell>{t('pages.admin.resource')}</TableCell>
              <TableCell>{t('pages.admin.user')}</TableCell>
              <TableCell>{t('pages.admin.ip')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {q.data.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{new Date(l.created_at).toLocaleString()}</TableCell>
                <TableCell>{l.action}</TableCell>
                <TableCell>
                  {l.resource_type ? `${l.resource_type}${l.resource_id ? ` (${l.resource_id.slice(0, 8)})` : ''}` : '—'}
                </TableCell>
                <TableCell>{l.user_email ?? l.user_name ?? '—'}</TableCell>
                <TableCell>{l.ip_address ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  )
}
