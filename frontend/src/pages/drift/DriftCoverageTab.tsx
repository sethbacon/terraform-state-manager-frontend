import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Card,
  Chip,
  Link,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { api, type DriftCoverageState } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import CompletenessChips from '../../components/CompletenessChips'
import { isSafeExternalUrl } from '../../utils/externalUrl'

// Coverage is computed, not stored (drift-fleet-scale.md design decision #5):
// the backend joins the connector's live state listing against the latest
// run, live record, and schedule membership per source, defaulting its own
// staleness window to 24h. This mirrors that SAME window client-side for the
// "stale" filter (the endpoint doesn't return a per-state boolean, only the
// aggregate count in `summary`), so the filter and the summary chip agree.
const STALE_AFTER_MS = 24 * 60 * 60 * 1000

function isStale(state: DriftCoverageState): boolean {
  if (!state.last_run_at) return true
  const t = new Date(state.last_run_at).getTime()
  if (Number.isNaN(t)) return true
  return Date.now() - t >= STALE_AFTER_MS
}

type Filter = '' | 'unscheduled' | 'stale' | 'incomplete' | 'drifted'

function statusChipFor(state: DriftCoverageState, t: (k: string) => string) {
  if (!state.last_status) return <Chip size="small" variant="outlined" label={t('pages.drift.coverage.neverChecked')} />
  if (state.last_status === 'failed') return <Chip size="small" color="error" label={t('pages.drift.statusFailed')} />
  if (state.last_status === 'dispatched' || state.last_status === 'running') {
    return <Chip size="small" color="info" label={state.last_status} />
  }
  // Same rule as statusChip(): an unparseable last check is unknown, not clean.
  if (state.unparseable) {
    return <Chip size="small" variant="outlined" label={t('pages.drift.statusUnverified')} />
  }
  return state.drifted ? (
    <Chip size="small" color="warning" label={t('pages.drift.statusDriftDetected')} />
  ) : (
    <Chip size="small" color="success" label={t('pages.drift.statusNoDrift')} />
  )
}

// The Coverage tab of /drift (Phase 4b): per-source, per-state visibility into
// what a run/record-centric list cannot show — which states have no schedule
// at all, and which "last run" is too old or was never actually verified.
export default function DriftCoverageTab() {
  const { t } = useTranslation()
  const [sourceId, setSourceId] = useState('')
  const [filter, setFilter] = useState<Filter>('')

  const sourcesQuery = useQuery({ queryKey: queryKeys.sources.list(), queryFn: api.listSources })
  const coverageQuery = useQuery({
    queryKey: queryKeys.drift.coverage(sourceId),
    queryFn: () => api.getDriftCoverage(sourceId),
    enabled: Boolean(sourceId),
  })

  const states = useMemo(() => coverageQuery.data?.states ?? [], [coverageQuery.data])
  const summary = coverageQuery.data?.summary
  const filtered = useMemo(() => {
    switch (filter) {
      case 'unscheduled':
        return states.filter((s) => !s.scheduled)
      case 'stale':
        return states.filter(isStale)
      case 'incomplete':
        return states.filter((s) => s.unparseable || s.truncated)
      case 'drifted':
        return states.filter((s) => s.drifted === true)
      default:
        return states
    }
  }, [states, filter])

  return (
    <Stack spacing={2}>
      <TextField
        select
        label={t('pages.drift.coverage.sourceLabel')}
        value={sourceId}
        onChange={(e) => setSourceId(e.target.value)}
        sx={{ minWidth: 260 }}
        size="small"
      >
        <MenuItem value="">{t('common.none')}</MenuItem>
        {(sourcesQuery.data ?? []).map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.name}
          </MenuItem>
        ))}
      </TextField>

      {!sourceId && <Alert severity="info">{t('pages.drift.coverage.chooseSource')}</Alert>}

      {sourceId && coverageQuery.isLoading && <Typography color="text.secondary">{t('common.loading')}</Typography>}

      {sourceId && summary && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Chip size="small" variant="outlined" label={t('pages.drift.coverage.summaryTotal', { count: summary.total })} />
          <Chip size="small" variant="outlined" label={t('pages.drift.coverage.summaryScheduled', { count: summary.scheduled })} />
          <Chip
            size="small"
            variant="outlined"
            color={summary.unscheduled > 0 ? 'warning' : 'default'}
            label={t('pages.drift.coverage.summaryUnscheduled', { count: summary.unscheduled })}
          />
          <Chip
            size="small"
            variant="outlined"
            color={summary.stale > 0 ? 'warning' : 'default'}
            label={t('pages.drift.coverage.summaryStale', { count: summary.stale })}
          />
          <Chip
            size="small"
            variant="outlined"
            color={summary.incomplete > 0 ? 'error' : 'default'}
            label={t('pages.drift.coverage.summaryIncomplete', { count: summary.incomplete })}
          />
          <Chip size="small" variant="outlined" label={t('pages.drift.coverage.summaryOpen', { count: summary.open })} />
          <Chip
            size="small"
            variant="outlined"
            color={summary.critical > 0 ? 'error' : 'default'}
            label={t('pages.drift.coverage.summaryCritical', { count: summary.critical })}
          />
        </Stack>
      )}

      {sourceId && states.length > 0 && (
        <ToggleButtonGroup
          size="small"
          exclusive
          value={filter}
          onChange={(_, v: Filter | null) => setFilter(v ?? '')}
          aria-label={t('common.filter')}
        >
          <ToggleButton value="">{t('pages.drift.coverage.filterAll')}</ToggleButton>
          <ToggleButton value="unscheduled">{t('pages.drift.coverage.filterUnscheduled')}</ToggleButton>
          <ToggleButton value="stale">{t('pages.drift.coverage.filterStale')}</ToggleButton>
          <ToggleButton value="incomplete">{t('pages.drift.coverage.filterIncomplete')}</ToggleButton>
          <ToggleButton value="drifted">{t('pages.drift.coverage.filterDrifted')}</ToggleButton>
        </ToggleButtonGroup>
      )}

      {sourceId && !coverageQuery.isLoading && states.length === 0 && (
        <Alert severity="info">{t('pages.drift.coverage.empty')}</Alert>
      )}

      {sourceId && filtered.length > 0 && (
        <Card variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('pages.drift.coverage.colState')}</TableCell>
                <TableCell align="center">{t('pages.drift.coverage.colScheduled')}</TableCell>
                <TableCell>{t('pages.drift.coverage.colLastChecked')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell align="center">{t('pages.drift.coverage.colDrifted')}</TableCell>
                <TableCell align="center">{t('pages.drift.completenessColumn')}</TableCell>
                <TableCell>{t('pages.drift.coverage.colRecord')}</TableCell>
                <TableCell>{t('pages.drift.coverage.colCi')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.key} hover>
                  <TableCell sx={{ wordBreak: 'break-word' }}>{s.key}</TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      variant="outlined"
                      color={s.scheduled ? 'success' : 'default'}
                      label={s.scheduled ? t('common.yes') : t('common.no')}
                    />
                  </TableCell>
                  <TableCell>{s.last_run_at ? new Date(s.last_run_at).toLocaleString() : t('pages.drift.coverage.neverChecked')}</TableCell>
                  <TableCell>{statusChipFor(s, t)}</TableCell>
                  <TableCell align="center">
                    {s.drifted == null ? '—' : s.drifted ? t('common.yes') : t('common.no')}
                  </TableCell>
                  <TableCell align="center">
                    <CompletenessChips completeness={s} variant="icon" />
                  </TableCell>
                  <TableCell>{s.record_status ?? '—'}</TableCell>
                  <TableCell>
                    {isSafeExternalUrl(s.ci_run_url) ? (
                      <Link href={s.ci_run_url} target="_blank" rel="noopener noreferrer">
                        {t('pages.drift.openCiRun')}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </Stack>
  )
}
