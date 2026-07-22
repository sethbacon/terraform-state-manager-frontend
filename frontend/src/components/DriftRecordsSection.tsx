import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
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

const RECORDS_PAGE_SIZE = 25

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
  const [severity, setSeverity] = useState<'' | 'critical' | 'warning'>('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [page, setPage] = useState(0)
  const [ackTarget, setAckTarget] = useState<DriftRecord | null>(null)
  const [ackNote, setAckNote] = useState('')
  const [detail, setDetail] = useState<DriftRecord | null>(null)
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAckOpen, setBulkAckOpen] = useState(false)
  const [bulkAckNote, setBulkAckNote] = useState('')
  const [bulkPending, setBulkPending] = useState(false)

  const statuses = view === 'active' ? ['open', 'acknowledged'] : undefined
  const queryParams = {
    statuses,
    severity: severity || undefined,
    sourceId: sourceFilter || undefined,
    page: page + 1,
    perPage: RECORDS_PAGE_SIZE,
  }
  const recordsQuery = useQuery({
    queryKey: queryKeys.drift.records(queryParams),
    queryFn: () => api.listDriftRecords(queryParams),
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
  const total = recordsQuery.data?.total ?? 0
  const sourceLabel = (r: DriftRecord) => (r.source_id ? (sourceNames[r.source_id] ?? r.source_id) : '—')

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const selectableIds = records.map((r) => r.id)
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))
  const clearSelection = () => setSelected(new Set())

  const runBulk = async (ids: string[], action: (id: string) => Promise<unknown>) => {
    setBulkPending(true)
    const results = await Promise.allSettled(ids.map(action))
    const failed = results.filter((r) => r.status === 'rejected').length
    setBulkPending(false)
    clearSelection()
    invalidate()
    if (failed > 0) setNotice(t('pages.drift.bulkPartialFailure', { count: failed }))
  }

  const bulkAckIds = records.filter((r) => r.status === 'open' && selected.has(r.id)).map((r) => r.id)
  const bulkResolveIds = records.filter((r) => r.status !== 'resolved' && selected.has(r.id)).map((r) => r.id)

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
          onChange={(_, v: 'active' | 'all' | null) => {
            if (v) {
              setView(v)
              // Selection is scoped to the visible rows: bulk actions only touch
              // ids present on the current page, so a selection carried across a
              // view/filter/page change would silently under-act ("5 selected"
              // but only the visible ones processed). Reset it instead.
              clearSelection()
            }
          }}
          aria-label={t('pages.drift.recordsFilter')}
        >
          <ToggleButton value="active">{t('pages.drift.recordsActive')}</ToggleButton>
          <ToggleButton value="all">{t('pages.drift.recordsAll')}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Stack direction="row" sx={{ mb: 1, alignItems: 'center' }} spacing={1}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={severity}
          onChange={(_, v: '' | 'critical' | 'warning' | null) => {
            if (v !== null) {
              setSeverity(v)
              setPage(0)
              clearSelection()
            }
          }}
          aria-label={t('pages.drift.severityFilter')}
        >
          <ToggleButton value="">{t('pages.drift.severityAll')}</ToggleButton>
          <ToggleButton value="critical">Critical</ToggleButton>
          <ToggleButton value="warning">Warning</ToggleButton>
        </ToggleButtonGroup>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="drift-records-source-label">{t('pages.drift.sourceFilter')}</InputLabel>
          <Select
            labelId="drift-records-source-label"
            label={t('pages.drift.sourceFilter')}
            value={sourceFilter}
            onChange={(e: SelectChangeEvent) => {
              setSourceFilter(e.target.value)
              setPage(0)
              clearSelection()
            }}
          >
            <MenuItem value="">{t('pages.drift.allSources')}</MenuItem>
            {Object.entries(sourceNames).map(([id, name]) => (
              <MenuItem key={id} value={id}>
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {notice && (
        <Alert severity="error" onClose={() => setNotice('')} sx={{ mb: 1 }}>
          {notice}
        </Alert>
      )}

      {canAct && selected.size > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
          <Typography variant="body2">{t('pages.drift.selectedCount', { count: selected.size })}</Typography>
          <Button
            size="small"
            disabled={bulkAckIds.length === 0 || bulkPending}
            onClick={() => {
              setBulkAckNote('')
              setBulkAckOpen(true)
            }}
          >
            {t('pages.drift.acknowledgeSelected')}
          </Button>
          <Button
            size="small"
            disabled={bulkResolveIds.length === 0 || bulkPending}
            onClick={() => runBulk(bulkResolveIds, (id) => resolve.mutateAsync(id))}
          >
            {t('pages.drift.resolveSelected')}
          </Button>
        </Stack>
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
                {canAct && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={selected.size > 0 && !allSelected}
                      onChange={() =>
                        setSelected(allSelected ? new Set() : new Set(selectableIds))
                      }
                    />
                  </TableCell>
                )}
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
                  {canAct && (
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(r.id)} onChange={() => toggleSelected(r.id)} />
                    </TableCell>
                  )}
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
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => {
              setPage(p)
              clearSelection()
            }}
            rowsPerPage={RECORDS_PAGE_SIZE}
            rowsPerPageOptions={[RECORDS_PAGE_SIZE]}
          />
        </Card>
      )}

      {/* Bulk acknowledge dialog */}
      <Dialog open={bulkAckOpen} onClose={() => setBulkAckOpen(false)} fullWidth maxWidth="sm">
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
            value={bulkAckNote}
            onChange={(e) => setBulkAckNote(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkAckOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            disabled={bulkPending}
            onClick={() => {
              setBulkAckOpen(false)
              void runBulk(bulkAckIds, (id) => acknowledge.mutateAsync({ id, note: bulkAckNote }))
            }}
          >
            {t('pages.drift.acknowledge')}
          </Button>
        </DialogActions>
      </Dialog>

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
                        <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all', verticalAlign: 'top' }}>
                          {s.address}
                          {s.attrs && s.attrs.length > 0 && (
                            <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2 }}>
                              {s.attrs.map((at) => (
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
