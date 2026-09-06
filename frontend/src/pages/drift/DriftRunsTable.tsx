import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Card,
  Chip,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { api, type DriftRun } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import TableSkeleton from '../../components/skeletons/TableSkeleton'
import CompletenessChips from '../../components/CompletenessChips'
import DriftRunDetailDialog from './DriftRunDetailDialog'
import { statusChip, infraDriftChip } from './statusChip'

const RUNS_PAGE_SIZE = 20

// The recent-runs section: a status filter, the paginated table, and the detail
// dialog a row opens. The paging and filter state stay here with the query they
// parameterize, and the detail dialog stays here because the only way to open
// it is clicking a row of this table.
export default function DriftRunsTable() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const batchId = searchParams.get('batch') ?? ''
  const [runsPage, setRunsPage] = useState(0)
  const [runsStatus, setRunsStatus] = useState('')
  const [selectedRun, setSelectedRun] = useState<DriftRun | null>(null)

  const runsQuery = useQuery({
    queryKey: queryKeys.drift.runs(runsPage, runsStatus, batchId),
    queryFn: () =>
      api.listDriftRuns({
        limit: RUNS_PAGE_SIZE,
        offset: runsPage * RUNS_PAGE_SIZE,
        status: runsStatus || undefined,
        batchId: batchId || undefined,
      }),
    // Poll while any run is still in flight so results appear when the CI job calls back.
    refetchInterval: (q) =>
      (q.state.data?.runs ?? []).some((r) => r.status === 'dispatched' || r.status === 'running') ? 4000 : false,
  })
  const runs = runsQuery.data?.runs ?? []
  const runsTotal = runsQuery.data?.total ?? 0

  return (
    <>
      <Stack direction="row" sx={{ mb: 1, alignItems: 'center' }} spacing={1}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {t('pages.drift.recentRuns')}
        </Typography>
        {batchId && (
          <Chip
            size="small"
            label={t('pages.drift.batchFilter', { id: batchId })}
            onDelete={() => {
              searchParams.delete('batch')
              setSearchParams(searchParams)
              setRunsPage(0)
            }}
          />
        )}
        <TextField
          select
          size="small"
          label={t('common.status')}
          value={runsStatus}
          onChange={(e) => {
            setRunsStatus(e.target.value)
            setRunsPage(0)
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          {['dispatched', 'running', 'completed', 'failed'].map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {runsQuery.isLoading && <TableSkeleton rows={4} columns={6} />}
      {!runsQuery.isLoading && runsTotal === 0 && <Alert severity="info">{t('pages.drift.noRuns')}</Alert>}
      {!runsQuery.isLoading && runsTotal > 0 && (
        <>
          <Card variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('common.status')}</TableCell>
                  <TableCell>{t('common.ref')}</TableCell>
                  <TableCell>{t('pages.drift.dir')}</TableCell>
                  <TableCell align="right">{t('pages.drift.unappliedColumn')}</TableCell>
                  <TableCell align="right">{t('pages.drift.infraColumn')}</TableCell>
                  <TableCell align="center">{t('pages.drift.completenessColumn')}</TableCell>
                  <TableCell>{t('common.created')}</TableCell>
                  <TableCell>{t('common.detail')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedRun(r)}>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        {statusChip(r, t)}
                        {infraDriftChip(r, t)}
                      </Stack>
                    </TableCell>
                    <TableCell>{r.repo_ref || '—'}</TableCell>
                    <TableCell>{r.working_dir || '.'}</TableCell>
                    <TableCell align="right">
                      {r.added != null ? `${r.added} / ${r.changed} / ${r.destroyed}` : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {r.status === 'completed'
                        ? `${r.drift_added} / ${r.drift_changed} / ${r.drift_destroyed}`
                        : '—'}
                    </TableCell>
                    <TableCell align="center">
                      <CompletenessChips completeness={r} variant="icon" />
                    </TableCell>
                    <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell sx={{ maxWidth: 220, wordBreak: 'break-word' }}>{r.detail || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            <Typography variant="body2" color="text.secondary">
              {t('pages.versionLab.showing', {
                from: runsPage * RUNS_PAGE_SIZE + 1,
                to: Math.min((runsPage + 1) * RUNS_PAGE_SIZE, runsTotal),
                total: runsTotal,
              })}
            </Typography>
            <Button size="small" disabled={runsPage === 0} onClick={() => setRunsPage((p) => Math.max(0, p - 1))}>
              {t('common.previous')}
            </Button>
            <Button
              size="small"
              disabled={(runsPage + 1) * RUNS_PAGE_SIZE >= runsTotal}
              onClick={() => setRunsPage((p) => p + 1)}
            >
              {t('common.next')}
            </Button>
          </Stack>
        </>
      )}
      <DriftRunDetailDialog run={selectedRun} onClose={() => setSelectedRun(null)} />
    </>
  )
}
