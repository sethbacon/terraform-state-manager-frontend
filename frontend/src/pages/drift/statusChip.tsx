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

// One run's INFRA drift outcome as its own chip — the drift contract's second
// triplet (resource_drift: changes made outside Terraform), rendered
// alongside statusChip rather than folded into it. drift-fleet-scale.md
// Phase 5's whole point is that these are two independent signals: infra
// drift must never make this read as (or influence) run.drifted above, and
// run.drifted must never be derived from drift_added/changed/destroyed. This
// mirrors statusChip's own precedent for the unapplied triplet — an
// unparseable result never inspected a plan, so ITS infra counts are unknown
// too and must not read as "no infra drift" — and returns null (nothing
// rendered) for a run that has not completed, matching statusChip's own
// choice not to guess at an outcome before one exists.
export function infraDriftChip(run: DriftRun, t: (k: string) => string) {
  if (run.status !== 'completed') return null
  if (run.unparseable) return <Chip size="small" variant="outlined" label={t('pages.drift.infraUnverified')} />
  const infraDrifted = run.drift_added > 0 || run.drift_changed > 0 || run.drift_destroyed > 0
  return infraDrifted ? (
    <Chip size="small" color="secondary" label={t('pages.drift.infraDriftDetected')} />
  ) : (
    <Chip size="small" variant="outlined" label={t('pages.drift.infraNoDrift')} />
  )
}
