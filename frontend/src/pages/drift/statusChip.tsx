import { Chip } from '@mui/material'
import { type DriftRun } from '../../services/api'

// One run's status as a chip. A completed run is reported by its outcome
// (drift detected / no drift) rather than by the word "completed", so this
// mapping has to be identical in the runs table and in the run detail dialog —
// hence one module rather than a copy in each.
export function statusChip(run: DriftRun, t: (k: string) => string) {
  if (run.status === 'failed') return <Chip size="small" color="error" label={t('pages.drift.statusFailed')} />
  if (run.status === 'dispatched' || run.status === 'running')
    return <Chip size="small" color="info" label={run.status} />
  // completed. An unparseable result never inspected a plan, so its counts are
  // unknown — it must not read as "no drift". Checked before the outcome branch
  // so the green chip is never rendered beside the "not verified" marker.
  if (run.unparseable)
    return <Chip size="small" variant="outlined" label={t('pages.drift.statusUnverified')} />
  return run.drifted ? (
    <Chip size="small" color="warning" label={t('pages.drift.statusDriftDetected')} />
  ) : (
    <Chip size="small" color="success" label={t('pages.drift.statusNoDrift')} />
  )
}
