import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import CompletenessChips from './CompletenessChips'
import i18n from '../i18n'

const clean = {
  truncated: false,
  omitted_entries: 0,
  omitted_attrs: 0,
  unparseable: false,
  unmasked: false,
}

describe('CompletenessChips', () => {
  it('renders nothing for a fully-verified check', () => {
    const { container } = render(<CompletenessChips completeness={clean} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders an error chip for an unparseable check — a run that could not be verified must not read as clean', () => {
    render(<CompletenessChips completeness={{ ...clean, unparseable: true }} />)
    expect(screen.getByText(i18n.t('pages.drift.completeness.unparseable') as string)).toBeInTheDocument()
  })

  it('renders a truncated chip with the omitted counts', () => {
    render(<CompletenessChips completeness={{ ...clean, truncated: true, omitted_entries: 3, omitted_attrs: 7 }} />)
    expect(
      screen.getByText(i18n.t('pages.drift.completeness.truncated', { entries: 3, attrs: 7 }) as string),
    ).toBeInTheDocument()
  })

  it('renders an unmasked chip', () => {
    render(<CompletenessChips completeness={{ ...clean, unmasked: true }} />)
    expect(screen.getByText(i18n.t('pages.drift.completeness.unmasked') as string)).toBeInTheDocument()
  })

  it('renders all applicable chips together', () => {
    render(<CompletenessChips completeness={{ ...clean, unparseable: true, truncated: true, unmasked: true }} />)
    expect(screen.getByText(i18n.t('pages.drift.completeness.unparseable') as string)).toBeInTheDocument()
    expect(screen.getByText(i18n.t('pages.drift.completeness.unmasked') as string)).toBeInTheDocument()
  })

  it('tolerates a partial (coverage-row) shape with no omitted counts or unmasked field', () => {
    render(<CompletenessChips completeness={{ unparseable: false, truncated: true }} />)
    expect(
      screen.getByText(i18n.t('pages.drift.completeness.truncated', { entries: 0, attrs: 0 }) as string),
    ).toBeInTheDocument()
  })

  it('renders a single compact icon in the icon variant instead of labeled chips', () => {
    render(<CompletenessChips completeness={{ ...clean, unparseable: true }} variant="icon" />)
    expect(screen.queryByText(i18n.t('pages.drift.completeness.unparseable') as string)).not.toBeInTheDocument()
    expect(screen.getByLabelText(i18n.t('pages.drift.completeness.unparseableHint') as string)).toBeInTheDocument()
  })

  it('renders nothing in the icon variant for a clean check', () => {
    const { container } = render(<CompletenessChips completeness={clean} variant="icon" />)
    expect(container).toBeEmptyDOMElement()
  })
})
