import { Stack, Tooltip } from '@mui/material'
import Chip from '@mui/material/Chip'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { useTranslation } from 'react-i18next'
import type { DriftCompleteness } from '../services/api'

// The five completeness markers a drift check can carry — DriftRun and
// DriftRecord always send all five, but the /drift/coverage projection sends
// only unparseable/truncated, so the optional fields default to falsy/zero
// rather than being required.
export type CompletenessLike = Pick<DriftCompleteness, 'unparseable' | 'truncated'> &
  Partial<Pick<DriftCompleteness, 'omitted_entries' | 'omitted_attrs' | 'unmasked'>>

// Renders what a drift check did NOT do — the highest-value surface of the
// fleet dashboard read-path: a run whose plan could not be parsed produced no
// record and no error, so without this it reads exactly like a clean check.
// ONE component backs every place these markers are shown (the run detail
// dialog, the record detail chips row, and an icon in the runs/records/
// coverage tables) so the vocabulary can't drift between them.
export default function CompletenessChips({
  completeness,
  variant = 'chips',
}: {
  completeness: CompletenessLike
  variant?: 'chips' | 'icon'
}) {
  const { t } = useTranslation()
  const { unparseable, truncated, unmasked = false, omitted_entries = 0, omitted_attrs = 0 } = completeness

  if (!unparseable && !truncated && !unmasked) return null

  if (variant === 'icon') {
    // Unparseable is the most severe: it means the result is unverified, not
    // clean. Only one icon is shown even when multiple markers are set — the
    // chips variant (detail views) is where every marker gets its own label.
    const hint = unparseable
      ? t('pages.drift.completeness.unparseableHint')
      : truncated
        ? t('pages.drift.completeness.truncatedHint', { entries: omitted_entries, attrs: omitted_attrs })
        : t('pages.drift.completeness.unmaskedHint')
    const Icon = unparseable ? ErrorOutlineIcon : WarningAmberIcon
    return (
      <Tooltip title={hint}>
        <Icon fontSize="small" color={unparseable ? 'error' : 'warning'} aria-label={hint} />
      </Tooltip>
    )
  }

  return (
    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', display: 'inline-flex' }}>
      {unparseable && <Chip size="small" color="error" label={t('pages.drift.completeness.unparseable')} />}
      {truncated && (
        <Chip
          size="small"
          color="warning"
          label={t('pages.drift.completeness.truncated', { entries: omitted_entries, attrs: omitted_attrs })}
        />
      )}
      {unmasked && <Chip size="small" color="warning" label={t('pages.drift.completeness.unmasked')} />}
    </Stack>
  )
}
