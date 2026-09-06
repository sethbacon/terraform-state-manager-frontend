import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { statusChip, infraDriftChip } from './statusChip'
import { type DriftRun } from '../../services/api'
import i18n from '../../i18n'

const t = (k: string) => i18n.t(k) as string

const baseRun: DriftRun = {
  id: 'd1',
  pipeline_connection_id: 'p1',
  source_id: 's1',
  state_key: 'app.tfstate',
  repo_ref: 'main',
  working_dir: 'envs/prod',
  status: 'completed',
  added: 0,
  changed: 0,
  destroyed: 0,
  drifted: false,
  summary: [],
  detail: '',
  actor: 'alice',
  created_at: '2026-06-11T08:00:00Z',
  updated_at: '2026-06-11T08:05:00Z',
  batch_id: null,
  ci_run_id: '',
  ci_run_url: '',
  truncated: false,
  omitted_entries: 0,
  omitted_attrs: 0,
  unparseable: false,
  unmasked: false,
  drift_added: 0,
  drift_changed: 0,
  drift_destroyed: 0,
  drift_summary: [],
}

describe('infraDriftChip', () => {
  it('renders nothing for a run that has not completed (dispatched/running/failed)', () => {
    for (const status of ['dispatched', 'running', 'failed']) {
      const { container } = render(<>{infraDriftChip({ ...baseRun, status }, t)}</>)
      expect(container).toBeEmptyDOMElement()
    }
  })

  it('shows "no infra drift" for a completed, parseable run with zero infra counts', () => {
    render(<>{infraDriftChip(baseRun, t)}</>)
    expect(screen.getByText(t('pages.drift.infraNoDrift'))).toBeInTheDocument()
  })

  it('shows "infra drift detected" when any infra count is non-zero', () => {
    render(<>{infraDriftChip({ ...baseRun, drift_added: 1 }, t)}</>)
    expect(screen.getByText(t('pages.drift.infraDriftDetected'))).toBeInTheDocument()
  })

  it('flags an unparseable run as infra-unverified rather than clean, even with non-zero counts', () => {
    // An unparseable result never inspected a plan, so ITS infra counts are
    // unknown too — the same rule statusChip already applies to the unapplied
    // triplet. Non-zero counts here (an unrealistic combination, deliberately
    // chosen) must not defeat the guard.
    render(<>{infraDriftChip({ ...baseRun, unparseable: true, drift_added: 3 }, t)}</>)
    expect(screen.getByText(t('pages.drift.infraUnverified'))).toBeInTheDocument()
    expect(screen.queryByText(t('pages.drift.infraDriftDetected'))).not.toBeInTheDocument()
    expect(screen.queryByText(t('pages.drift.infraNoDrift'))).not.toBeInTheDocument()
  })

  // The property that must not break (drift-fleet-scale.md Phase 5): infra
  // drift must never make the UNAPPLIED signal read as drifted, and drifted
  // must never absorb infra counts. Each direction is its own case so a
  // regression that conflates either one fails here first.
  it('does not let a non-zero infra count flip the main status chip to "drift detected"', () => {
    const run = { ...baseRun, drifted: false, drift_added: 1, drift_changed: 2, drift_destroyed: 3 }
    render(
      <>
        {statusChip(run, t)}
        {infraDriftChip(run, t)}
      </>,
    )
    expect(screen.getByText(t('pages.drift.statusNoDrift'))).toBeInTheDocument()
    expect(screen.queryByText(t('pages.drift.statusDriftDetected'))).not.toBeInTheDocument()
    expect(screen.getByText(t('pages.drift.infraDriftDetected'))).toBeInTheDocument()
  })

  it('does not let unapplied drift flip the infra chip to "infra drift detected"', () => {
    const run = { ...baseRun, drifted: true, added: 1, drift_added: 0, drift_changed: 0, drift_destroyed: 0 }
    render(
      <>
        {statusChip(run, t)}
        {infraDriftChip(run, t)}
      </>,
    )
    expect(screen.getByText(t('pages.drift.statusDriftDetected'))).toBeInTheDocument()
    expect(screen.getByText(t('pages.drift.infraNoDrift'))).toBeInTheDocument()
    expect(screen.queryByText(t('pages.drift.infraDriftDetected'))).not.toBeInTheDocument()
  })
})
