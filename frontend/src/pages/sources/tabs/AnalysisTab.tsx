import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { api, type AnalysisResult } from '../../../services/api'
import { queryKeys } from '../../../services/queryKeys'

function BreakdownTable({ title, rows }: { title: string; rows: { key: string; count: number }[] }) {
  const { t } = useTranslation()
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Divider sx={{ mb: 1 }} />
        {rows.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            {t('common.none')}
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common.name')}</TableCell>
                <TableCell align="right">{t('pages.sources.count')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell sx={{ wordBreak: 'break-all' }}>{r.key}</TableCell>
                  <TableCell align="right">{r.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// AnalysisView renders an already-fetched analysis. It is exported because the
// page reuses it for the upload-and-analyze dialog, which analyses a file the
// operator picked rather than a stored state — same result shape, no query.
export function AnalysisView({ result }: { result: AnalysisResult }) {
  const a = result.analysis
  const { t } = useTranslation()
  const stats: { label: string; value: string | number }[] = [
    { label: t('pages.sources.rum'), value: a.rum },
    { label: t('pages.sources.managed'), value: a.managed_resources },
    { label: t('pages.sources.dataSources'), value: a.data_sources },
    { label: t('pages.sources.totalInstances'), value: a.total_resources },
    { label: t('pages.sources.terraform'), value: a.terraform_version || '—' },
    { label: t('pages.sources.serial'), value: a.serial },
  ]

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        {stats.map((s) => (
          <Card key={s.label} variant="outlined">
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="overline" color="text.secondary">
                {s.label}
              </Typography>
              <Typography variant="h6">{s.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <BreakdownTable title={t('pages.sources.topResourceTypes')} rows={a.resource_types.slice(0, 10)} />
        <BreakdownTable title={t('pages.sources.providers')} rows={a.providers} />
      </Box>
    </Stack>
  )
}

export default function AnalysisTab({ sourceId, stateKey }: { sourceId: string; stateKey: string }) {
  const { t } = useTranslation()
  const q = useQuery({
    queryKey: queryKeys.sources.analysis(sourceId, stateKey),
    queryFn: () => api.analyzeState(sourceId, stateKey),
  })
  if (q.isLoading) return <CircularProgress />
  if (q.isError || !q.data) return <Alert severity="error">{t('pages.sources.analyzeFailed')}</Alert>
  return <AnalysisView result={q.data} />
}
