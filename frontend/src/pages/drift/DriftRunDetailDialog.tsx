import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { type DriftRun } from '../../services/api'
import CompletenessChips from '../../components/CompletenessChips'
import { isSafeExternalUrl } from '../../utils/externalUrl'
import { statusChip } from './statusChip'

function actionColor(actions: string[]): 'success' | 'warning' | 'error' | 'default' {
  if (actions.includes('delete')) return 'error'
  if (actions.includes('create')) return 'success'
  if (actions.includes('update')) return 'warning'
  return 'default'
}

// Cap how many per-resource drift rows the detail dialog renders at once: a drift
// run against large/heavily-drifted infrastructure can produce a very large summary,
// and rendering every row into the dialog's DOM at once could freeze the tab. Beyond
// the cap we show a note pointing at the full plan (#233). The outer runs list is
// already paginated (see the runs query); this bounds the per-run detail view too.
const SUMMARY_RENDER_CAP = 200

// Read-only detail for one drift run: its status line and the per-resource
// change summary the CI job posted back.
export default function DriftRunDetailDialog({ run, onClose }: { run: DriftRun | null; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <Dialog open={Boolean(run)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{t('pages.drift.runDetailTitle')}</DialogTitle>
      <DialogContent>
        {run && (
          <Stack spacing={2}>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                {statusChip(run, t)}
                <CompletenessChips completeness={run} />
                {isSafeExternalUrl(run.ci_run_url) && (
                  <Link href={run.ci_run_url} target="_blank" rel="noopener noreferrer">
                    {t('pages.drift.openCiRun')}
                  </Link>
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {run.repo_ref || t('pages.drift.defaultRef')} · {run.working_dir || '.'} ·{' '}
                {run.added != null
                  ? t('pages.drift.addedChangedDestroyed', {
                    added: run.added,
                    changed: run.changed,
                    destroyed: run.destroyed,
                  })
                  : t('pages.drift.pending')}
              </Typography>
              {run.detail && (
                <Typography variant="caption" color="text.secondary">
                  {run.detail}
                </Typography>
              )}
            </Box>
            {run.summary && run.summary.length > SUMMARY_RENDER_CAP && (
              <Alert severity="info">
                {t('pages.drift.summaryTruncated', {
                  shown: SUMMARY_RENDER_CAP,
                  total: run.summary.length,
                })}
              </Alert>
            )}
            {run.summary && run.summary.length > 0 ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('pages.drift.resource')}</TableCell>
                    <TableCell>{t('pages.drift.change')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {run.summary.slice(0, SUMMARY_RENDER_CAP).map((c) => (
                    <TableRow key={c.address}>
                      <TableCell sx={{ wordBreak: 'break-all', verticalAlign: 'top' }}>
                        {c.address}
                        {c.attrs && c.attrs.length > 0 && (
                          <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2 }}>
                            {c.attrs.map((at) => (
                              <Box
                                component="li"
                                key={at.name}
                                sx={{ fontSize: '0.72rem', color: 'text.secondary', wordBreak: 'break-all' }}
                              >
                                <Box component="span" sx={{ color: 'text.primary' }}>{at.name}</Box>:{' '}
                                {at.before ?? '∅'} → {at.after ?? '∅'}
                              </Box>
                            ))}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell sx={{ verticalAlign: 'top' }}>
                        {c.actions.map((a) => (
                          <Chip key={a} size="small" label={a} color={actionColor(c.actions)} sx={{ mr: 0.5 }} />
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography color="text.secondary">
                {run.status === 'completed' ? t('pages.drift.noResourceDrift') : t('pages.drift.noDetailsYet')}
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}
