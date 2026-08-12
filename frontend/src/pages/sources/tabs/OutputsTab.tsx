import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { api } from '../../../services/api'
import { queryKeys } from '../../../services/queryKeys'

export default function OutputsTab({ sourceId, stateKey }: { sourceId: string; stateKey: string }) {
  const { t } = useTranslation()
  const q = useQuery({
    queryKey: queryKeys.sources.outputs(sourceId, stateKey),
    queryFn: () => api.listStateOutputs(sourceId, stateKey),
  })
  if (q.isLoading) return <CircularProgress />
  if (q.isError || !q.data) return <Alert severity="error">{t('pages.sources.outputsFailed')}</Alert>
  if (q.data.length === 0) {
    return <Typography color="text.secondary">{t('pages.sources.noOutputs')}</Typography>
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 600 }}>{t('pages.sources.outputName')}</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>{t('pages.sources.outputType')}</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>{t('pages.sources.outputValue')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {q.data.map((o) => (
          <TableRow key={o.name}>
            <TableCell sx={{ fontFamily: 'monospace' }}>{o.name}</TableCell>
            <TableCell>
              <Chip size="small" variant="outlined" label={o.type || '—'} />
            </TableCell>
            <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: 480 }}>
              {o.sensitive ? (
                <Chip size="small" color="warning" label={t('pages.sources.sensitiveValue')} />
              ) : (
                JSON.stringify(o.value)
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
