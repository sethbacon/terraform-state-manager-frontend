import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { api, type StateAnalysisSnapshot } from '../services/api'
import TableSkeleton from './skeletons/TableSkeleton'
import { queryKeys } from '../services/queryKeys'

// delta renders the change vs the previous (older) snapshot as a signed chip.
function delta(curr: number, prev: number | undefined) {
  if (prev === undefined || curr === prev) return null
  const diff = curr - prev
  return (
    <Chip
      size="small"
      variant="outlined"
      color={diff > 0 ? 'info' : 'warning'}
      label={diff > 0 ? `+${diff}` : `${diff}`}
      sx={{ ml: 0.5 }}
    />
  )
}

// StateHistoryTab charts and lists the append-only analysis snapshots the
// statesync service records each time it observes the state change.
export default function StateHistoryTab({ sourceId, stateKey }: { sourceId: string; stateKey: string }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const historyQuery = useQuery({
    queryKey: queryKeys.sources.history(sourceId, stateKey),
    queryFn: () => api.getStateHistory(sourceId, stateKey),
  })

  if (historyQuery.isLoading) return <TableSkeleton rows={4} columns={6} />
  if (historyQuery.isError) return <Alert severity="error">{t('pages.sources.historyError')}</Alert>

  const newestFirst = historyQuery.data ?? []
  if (newestFirst.length === 0) {
    return <Alert severity="info">{t('pages.sources.historyEmpty')}</Alert>
  }

  const chartData = [...newestFirst].reverse().map((h) => ({
    time: new Date(h.analyzed_at).toLocaleDateString(),
    rum: h.rum,
    resources: h.total_resources,
  }))

  return (
    <Box>
      {newestFirst.length > 1 && (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <RTooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="rum"
              name={t('pages.sources.historyRum')}
              stroke={theme.palette.primary.main}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="resources"
              name={t('pages.sources.historyResources')}
              stroke={theme.palette.success.main}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        {t('pages.sources.historySnapshots', { count: newestFirst.length })}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('pages.sources.historyAnalyzedAt')}</TableCell>
            <TableCell align="right">{t('pages.sources.historySerial')}</TableCell>
            <TableCell align="right">{t('pages.sources.historyRum')}</TableCell>
            <TableCell align="right">{t('pages.sources.historyResources')}</TableCell>
            <TableCell>{t('pages.sources.historyTfVersion')}</TableCell>
            <TableCell align="right">{t('pages.sources.historySize')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {newestFirst.map((h: StateAnalysisSnapshot, i: number) => {
            const prev = newestFirst[i + 1] // table is newest-first; prev = older
            return (
              <TableRow key={h.analyzed_at}>
                <TableCell>{new Date(h.analyzed_at).toLocaleString()}</TableCell>
                <TableCell align="right">{h.serial}</TableCell>
                <TableCell align="right">
                  {h.rum}
                  {delta(h.rum, prev?.rum)}
                </TableCell>
                <TableCell align="right">
                  {h.total_resources}
                  {delta(h.total_resources, prev?.total_resources)}
                </TableCell>
                <TableCell>
                  {h.terraform_version || '—'}
                  {prev && prev.terraform_version !== h.terraform_version && prev.terraform_version !== '' && (
                    <Chip size="small" variant="outlined" color="info" label={`← ${prev.terraform_version}`} sx={{ ml: 0.5 }} />
                  )}
                </TableCell>
                <TableCell align="right">{(h.size / 1024).toFixed(1)} KB</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Box>
  )
}
