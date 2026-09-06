import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import DriftRunDetailDialog from './DriftRunDetailDialog'
import { type DriftRun } from '../../services/api'
import i18n from '../../i18n'

const baseRun: DriftRun = {
  id: 'd1',
  pipeline_connection_id: 'p1',
  source_id: 's1',
  state_key: 'app.tfstate',
  repo_ref: 'main',
  working_dir: 'envs/prod',
  status: 'completed',
  added: 1,
  changed: 0,
  destroyed: 0,
  drifted: true,
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

describe('DriftRunDetailDialog', () => {
  it('renders nothing extra for a fully-verified, clean run', () => {
    render(<DriftRunDetailDialog run={baseRun} onClose={() => {}} />)
    expect(screen.queryByText(i18n.t('pages.drift.completeness.unparseable') as string)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: i18n.t('pages.drift.openCiRun') as string })).not.toBeInTheDocument()
  })

  it('flags an unparseable run as not verified rather than clean', () => {
    render(<DriftRunDetailDialog run={{ ...baseRun, unparseable: true }} onClose={() => {}} />)
    expect(screen.getByText(i18n.t('pages.drift.completeness.unparseable') as string)).toBeInTheDocument()
    // The status chip itself must say so too: neither outcome label may render
    // for a run whose plan was never inspected.
    expect(screen.getByText(i18n.t('pages.drift.statusUnverified') as string)).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('pages.drift.statusNoDrift') as string)).not.toBeInTheDocument()
    expect(screen.queryByText(i18n.t('pages.drift.statusDriftDetected') as string)).not.toBeInTheDocument()
  })

  it('shows the truncated chip with omitted counts', () => {
    render(
      <DriftRunDetailDialog
        run={{ ...baseRun, truncated: true, omitted_entries: 2, omitted_attrs: 5 }}
        onClose={() => {}}
      />,
    )
    expect(
      screen.getByText(i18n.t('pages.drift.completeness.truncated', { entries: 2, attrs: 5 }) as string),
    ).toBeInTheDocument()
  })

  it('links out to the CI run when ci_run_url is set', () => {
    render(<DriftRunDetailDialog run={{ ...baseRun, ci_run_url: 'https://dev.azure.com/org/proj/_build/1' }} onClose={() => {}} />)
    const link = screen.getByRole('link', { name: i18n.t('pages.drift.openCiRun') as string })
    expect(link).toHaveAttribute('href', 'https://dev.azure.com/org/proj/_build/1')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('does not render a CI link for an unsafe URL', () => {
    render(<DriftRunDetailDialog run={{ ...baseRun, ci_run_url: 'javascript:alert(1)' }} onClose={() => {}} />)
    expect(screen.queryByRole('link', { name: i18n.t('pages.drift.openCiRun') as string })).not.toBeInTheDocument()
  })

  it('shows both count triplets, distinctly labelled, for a run with only infra drift', () => {
    // added=0/drifted=false but infra drift present — the case Phase 5 exists
    // to surface: the main status must stay "no drift" while the infra chip
    // and its own count line report the resource_drift finding.
    const infraOnly = { ...baseRun, added: 0, changed: 0, destroyed: 0, drifted: false, drift_added: 2 }
    render(<DriftRunDetailDialog run={infraOnly} onClose={() => {}} />)
    expect(screen.getByText(i18n.t('pages.drift.statusNoDrift') as string)).toBeInTheDocument()
    expect(screen.getByText(i18n.t('pages.drift.infraDriftDetected') as string)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`^${i18n.t('pages.drift.unappliedLabel')}:`))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`^${i18n.t('pages.drift.infraLabel')}:`))).toBeInTheDocument()
  })

  it('shows the infra chip as unverified, not clean, for an unparseable run', () => {
    render(<DriftRunDetailDialog run={{ ...baseRun, unparseable: true }} onClose={() => {}} />)
    expect(screen.getByText(i18n.t('pages.drift.infraUnverified') as string)).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('pages.drift.infraNoDrift') as string)).not.toBeInTheDocument()
  })
})
