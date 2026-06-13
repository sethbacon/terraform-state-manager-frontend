import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import { useTranslation } from 'react-i18next'
import { api, type DriftRecord } from '../services/api'
import TableSkeleton from './skeletons/TableSkeleton'
import { queryKeys } from '../services/queryKeys'
import { useAuth } from '../contexts/AuthContext'

function recordApiErr(e: unknown): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Request failed.'
}

function recordStatusChip(status: DriftRecord['status'], t: (k: string) => string) {
  switch (status) {
    case 'open':
      return <Chip size="small" color="warning" label={t('pages.drift.recordOpen')} />
    case 'acknowledged':
      return <Chip size="small" color="info" label={t('pages.drift.recordAcknowledged')} />
    default:
      return <Chip size="small" color="success" label={t('pages.drift.recordResolved')} />
  }
}

// DriftRecordsSection renders the durable drift layer: one acknowledgeable
// record per currently-drifted state (re-detections collapse onto it), with
// resolved history on demand. Runs remain the mechanism listed below it.
export default function DriftRecordsSection({ sourceNames }: { sourceNames: Record<string, string> }) {
  const { t } = useTranslation()
  const { hasScope } = useAuth()
  const queryClient = useQueryClient()
  const canAct = hasScope('state:drift')

  const [view, setView] = useState<'active' | 'all'>('active')
  const [ackTarget, setAckTarget] = useState<DriftRecord | null>(null)
  const [ackNote, setAckNote] = useState('')
  const [detail, setDetail] = useState<DriftRecord | null>(null)
  const [notice, setNotice] = useState('')

  const statuses = view === 'active' ? ['open', 'acknowledged'] : undefined
  const recordsQuery = useQuery({
    queryKey: queryKeys.drift.records(statuses),
    queryFn: () => api.listDriftRecords(statuses),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.drift.all })

  const acknowledge = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => api.acknowledgeDriftRecord(id, note),
    onSuccess: () => {
      setAckTarget(null)
      setAckNote('')
      invalidate()
    },
    onError: (e) => setNotice(recordApiErr(e)),
  })
  const resolve = useMutation({
    mutationFn: (id: string) => api.resolveDriftRecord(id),
    onSuccess: invalidate,
    onError: (e) => setNotice(recordApiErr(e)),
  })

  const records = recordsQuery.data?.records ?? []
  const counts = recordsQuery.data?.counts ?? {}
  const sourceLabel = (r: DriftRecord) => (r.source_id ? (sourceNames[r.source_id] ?? r.source_id) : '—')

  return (
    <Box sx={{ mb: 4 }}>
      <Stack direction="row" sx={{ mb: 1, alignItems: 'center' }} spacing={1}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {t('pages.drift.recordsTitle')}
        </Typography>
        <Chip size="small" color="warning" variant="outlined" label={`${t('pages.drift.recordOpen')}: ${counts.open ?? 0}`} />
        <Chip
          size="small"
          color="info"
          variant="outlined"
          label={`${t('pages.drift.recordAcknowledged')}: ${counts.acknowledged ?? 0}`}
        />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_, v: 'active' | 'all' | null) => v && setView(v)}
          aria-label={t('pages.drift.recordsFilter')}
        >
          <ToggleButton value="active">{t('pages.drift.recordsActive')}</ToggleButton>
          <ToggleButton value="all">{t('pages.drift.recordsAll')}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {notice && (
        <Alert severity="error" onClose={() => setNotice('')} sx={{ mb: 1 }}>
          {notice}
        </Alert>
      )}

      {recordsQuery.isLoading && <TableSkeleton rows={3} columns={7} />}
      {!recordsQuery.isLoading && records.length === 0 && (
        <Alert severity="success">{view === 'active' ? t('pages.drift.noActiveRecords') : t('pages.drift.noRecords')}</Alert>
      )}
      {records.length > 0 && (
        <Card variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('pages.drift.recordSeverity')}</TableCell>
                <TableCell>{t('pages.drift.recordState')}</TableCell>
                <TableCell align="right">+ / ~ / -</TableCell>
                <TableCell align="right">{t('pages.drift.recordDetections')}</TableCell>
                <TableCell>{t('pages.drift.recordLastDetected')}</TableCell>
                <TableCell align="right">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => setDetail(r)}>
                  <TableCell>{recordStatusChip(r.status, t)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      color={r.severity === 'critical' ? 'error' : 'warning'}
                      label={r.severity}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280, wordBreak: 'break-word' }}>
                    {sourceLabel(r)} / {r.state_key}
                  </TableCell>
                  <TableCell align="right">{`${r.added} / ${r.changed} / ${r.destroyed}`}</TableCell>
                  <TableCell align="right">{r.detections}</TableCell>
                  <TableCell>{new Date(r.last_detected_at).toLocaleString()}</TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    {canAct && r.status === 'open' && (
                      <Tooltip title={t('pages.drift.acknowledge')}>
                        <Button
                          size="small"
                          startIcon={<TaskAltIcon />}
                          onClick={() => {
                            setAckNote('')
                            setAckTarget(r)
                          }}
                        >
                          {t('pages.drift.acknowledge')}
                        </Button>
                      </Tooltip>
                    )}
                    {canAct && r.status !== 'resolved' && (
                      <Tooltip title={t('pages.drift.resolve')}>
                        <Button size="small" startIcon={<DoneAllIcon />} onClick={() => resolve.mutate(r.id)}>
                          {t('pages.drift.resolve')}
                        </Button>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Acknowledge dialog */}
      <Dialog open={Boolean(ackTarget)} onClose={() => setAckTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t('pages.drift.acknowledgeTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('pages.drift.acknowledgeBody')}
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label={t('pages.drift.ackNoteLabel')}
            value={ackNote}
            onChange={(e) => setAckNote(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAckTarget(null)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            disabled={acknowledge.isPending}
            onClick={() => ackTarget && acknowledge.mutate({ id: ackTarget.id, note: ackNote })}
          >
            {t('pages.drift.acknowledge')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record detail dialog */}
      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="md">
        <DialogTitle>{t('pages.drift.recordDetailTitle')}</DialogTitle>
        <DialogContent>
          {detail && (
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {recordStatusChip(detail.status, t)}
                <Chip
                  size="small"
                  variant="outlined"
                  color={detail.severity === 'critical' ? 'error' : 'warning'}
                  label={detail.severity}
                />
                <Chip size="small" variant="outlined" label={detail.origin} />
                <Typography variant="body2" color="text.secondary">
                  {sourceLabel(detail)} / {detail.state_key}
                </Typography>
              </Stack>
              <Typography variant="body2">
                {t('pages.drift.recordFirstDetected')}: {new Date(detail.first_detected_at).toLocaleString()} ·{' '}
                {t('pages.drift.recordLastDetected')}: {new Date(detail.last_detected_at).toLocaleString()} ·{' '}
                {t('pages.drift.recordDetections')}: {detail.detections}
              </Typography>
              {detail.status === 'acknowledged' && (
                <Alert severity="info">
                  {t('pages.drift.ackedBy', { actor: detail.acknowledged_by || '—' })}
                  {detail.ack_note ? ` — ${detail.ack_note}` : ''}
                </Alert>
              )}
              {(detail.summary?.length ?? 0) > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('pages.drift.resource')}</TableCell>
                      <TableCell>{t('pages.drift.change')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.summary!.map((s) => (
                      <TableRow key={s.address}>
                        <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{s.address}</TableCell>
                        <TableCell>
                          {s.actions.map((a) => (
                            <Chip key={a} size="small" label={a} sx={{ mr: 0.5 }} />
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('pages.drift.noResourceDrift')}
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
