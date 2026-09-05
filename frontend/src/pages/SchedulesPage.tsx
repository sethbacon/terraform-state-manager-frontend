import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { Link as RouterLink } from 'react-router-dom'
import {
  api,
  type DriftTargetItem,
  type PipelineConnection,
  type Schedule,
  type ScheduleInput,
  type StateSource,
} from '../services/api'
import { queryKeys } from '../services/queryKeys'
import { nextRuns, validateCron } from '../utils/cron'
import PageHeader from '../components/PageHeader'
import PageTitleIcon from '@mui/icons-material/Schedule'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import ConfirmDialog from '../components/ConfirmDialog'

import { extractApiError as apiErr } from '../utils/apiError'

function statusColor(status?: string | null): 'success' | 'error' | 'warning' | 'default' {
  switch (status) {
    case 'success':
      return 'success'
    case 'failed':
      return 'error'
    case 'skipped':
      return 'warning'
    default:
      return 'default'
  }
}

export default function SchedulesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Schedule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null)
  const [error, setError] = useState<string | null>(null)

  const schedulesQuery = useQuery({ queryKey: queryKeys.schedules.list(), queryFn: api.listSchedules })
  const pipelinesQuery = useQuery({ queryKey: queryKeys.pipelines.list(), queryFn: api.listPipelines })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all })

  const deleteMutation = useMutation({
    mutationFn: api.deleteSchedule,
    onSuccess: invalidate,
  })
  const runMutation = useMutation({
    mutationFn: api.runSchedule,
    onSuccess: invalidate,
    onError: (e) => setError(apiErr(e)),
  })
  const toggleMutation = useMutation({
    mutationFn: ({ s, enabled }: { s: Schedule; enabled: boolean }) =>
      api.updateSchedule(s.id, { ...toInput(s), enabled }),
    onSuccess: invalidate,
    onError: (e) => setError(apiErr(e)),
  })

  const pipelineName = (id: string) => pipelinesQuery.data?.find((p) => p.id === id)?.name ?? id

  return (
    <Box>
      <PageHeader
        icon={<PageTitleIcon />}
        title={t('pages.schedules.title')}
        description={t('pages.schedules.description')}
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            {t('pages.schedules.add')}
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {schedulesQuery.isLoading && <TableSkeleton rows={4} columns={6} />}
      {schedulesQuery.isError && <Alert severity="error">{t('common.error')}</Alert>}
      {schedulesQuery.data && schedulesQuery.data.length === 0 && (
        <Alert severity="info">{t('pages.schedules.noSchedules')}</Alert>
      )}

      {schedulesQuery.data && schedulesQuery.data.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('common.name')}</TableCell>
              <TableCell>{t('pages.schedules.cron')}</TableCell>
              <TableCell>{t('pages.schedules.pipeline')}</TableCell>
              <TableCell>{t('pages.schedules.enabled')}</TableCell>
              <TableCell>{t('pages.schedules.lastRun')}</TableCell>
              <TableCell>{t('pages.schedules.nextRun')}</TableCell>
              <TableCell align="right">{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {schedulesQuery.data.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell>{s.name}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{s.cron_expr}</TableCell>
                <TableCell>{pipelineName(s.target_config.pipeline_connection_id)}</TableCell>
                <TableCell>
                  <Switch
                    size="small"
                    checked={s.enabled}
                    onChange={(e) => toggleMutation.mutate({ s, enabled: e.target.checked })}
                    slotProps={{ input: { 'aria-label': t('pages.schedules.enabled') } }}
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    {s.last_status ? (
                      <Chip size="small" color={statusColor(s.last_status)} label={s.last_status} />
                    ) : (
                      <Box component="span" sx={{ color: 'text.secondary' }}>
                        {t('pages.schedules.never')}
                      </Box>
                    )}
                    {s.last_run_id && (
                      <Tooltip title={t('pages.schedules.viewRun')}>
                        <IconButton
                          size="small"
                          component={RouterLink}
                          to={`/drift?batch=${s.last_run_id}`}
                          aria-label={t('pages.schedules.viewRun')}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>
                  {s.enabled && s.next_run_at ? new Date(s.next_run_at).toLocaleString() : '—'}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={t('pages.schedules.runNow')}>
                    <IconButton size="small" onClick={() => runMutation.mutate(s.id)} disabled={runMutation.isPending}>
                      <PlayArrowIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.edit')}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditing(s)
                        setFormOpen(true)
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.delete')}>
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(s)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ScheduleFormDialog
        open={formOpen}
        schedule={editing}
        pipelines={pipelinesQuery.data ?? []}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false)
          invalidate()
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t('pages.schedules.deleteTitle')}
        severity="error"
        description={t('pages.schedules.deleteConfirm', { name: deleteTarget?.name ?? '' })}
        confirmLabel={t('common.delete')}
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return
          await deleteMutation.mutateAsync(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </Box>
  )
}

function toInput(s: Schedule): ScheduleInput {
  return {
    name: s.name,
    cron_expr: s.cron_expr,
    target_type: s.target_type,
    target_config: s.target_config,
    enabled: s.enabled,
  }
}

// One row of the fan-out targets repeater: its own state (source, state key,
// working dir) plus its own states-for-source query. Extracted to its own
// component rather than called inline in a .map() because each row's
// useQuery must have a stable per-row identity — hook order inside a mapped
// array at the parent's render level would drift as rows are added/removed.
function ScheduleTargetRow({
  target,
  sources,
  onChange,
  onRemove,
}: {
  target: DriftTargetItem
  sources: StateSource[]
  onChange: (patch: Partial<DriftTargetItem>) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const statesQuery = useQuery({
    queryKey: queryKeys.sources.states(target.source_id),
    queryFn: () => api.listStates(target.source_id),
    enabled: Boolean(target.source_id),
  })

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <TextField
        select
        label={t('pages.schedules.targetSource')}
        value={target.source_id}
        onChange={(e) => onChange({ source_id: e.target.value, state_key: '' })}
        size="small"
        sx={{ minWidth: 160 }}
      >
        <MenuItem value="">{t('common.none')}</MenuItem>
        {sources.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.name}
          </MenuItem>
        ))}
      </TextField>
      <Autocomplete
        size="small"
        options={statesQuery.data ?? []}
        loading={statesQuery.isLoading}
        getOptionLabel={(st) => st.name || st.key}
        value={(statesQuery.data ?? []).find((st) => st.key === target.state_key) ?? null}
        onChange={(_, v) => onChange({ state_key: v?.key ?? '' })}
        disabled={!target.source_id || statesQuery.isLoading}
        sx={{ minWidth: 200, flexGrow: 1 }}
        renderInput={(params) => <TextField {...params} label={t('pages.schedules.targetState')} />}
      />
      <TextField
        label={t('pages.schedules.targetWorkingDir')}
        value={target.working_dir}
        onChange={(e) => onChange({ working_dir: e.target.value })}
        size="small"
      />
      <IconButton size="small" aria-label={t('pages.schedules.removeTarget')} onClick={onRemove}>
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Stack>
  )
}

function ScheduleFormDialog({
  open,
  schedule,
  pipelines,
  onClose,
  onSaved,
}: {
  open: boolean
  schedule: Schedule | null
  pipelines: PipelineConnection[]
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [cron, setCron] = useState('daily')
  const [pipelineId, setPipelineId] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [stateKey, setStateKey] = useState('')
  const [repoRef, setRepoRef] = useState('')
  const [workingDir, setWorkingDir] = useState('')
  const [targets, setTargets] = useState<DriftTargetItem[]>([])
  const [bulkSourceId, setBulkSourceId] = useState('')
  const [bulkPattern, setBulkPattern] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Reset the form whenever the dialog opens for a new target.
  const [seededFor, setSeededFor] = useState<string | null>(null)
  const seedKey = schedule?.id ?? 'new'
  if (open && seededFor !== seedKey) {
    setSeededFor(seedKey)
    setError(null)
    setName(schedule?.name ?? '')
    setCron(schedule?.cron_expr ?? 'daily')
    setPipelineId(schedule?.target_config.pipeline_connection_id ?? '')
    setSourceId(schedule?.target_config.source_id ?? '')
    setStateKey(schedule?.target_config.state_key ?? '')
    setRepoRef(schedule?.target_config.repo_ref ?? '')
    setWorkingDir(schedule?.target_config.working_dir ?? '')
    setTargets(schedule?.target_config.targets ?? [])
    setBulkSourceId('')
    setBulkPattern('')
    setEnabled(schedule?.enabled ?? true)
  }
  if (!open && seededFor !== null) setSeededFor(null)

  // Validate the cron field live and preview its next fire times, so a
  // malformed or unintended expression is caught before save instead of on
  // the next (missed or mistimed) run. Grammar matches the backend's
  // ComputeNextRun; the preview is computed client-side in local time.
  const cronError = validateCron(cron) === 'invalid'
  const cronPreview = useMemo(
    () => (cron.trim() && !cronError ? nextRuns(cron, new Date(), 3) : []),
    [cron, cronError],
  )

  const sourcesQuery = useQuery({ queryKey: queryKeys.sources.list(), queryFn: api.listSources, enabled: open })
  const statesQuery = useQuery({
    queryKey: queryKeys.sources.states(sourceId),
    queryFn: () => api.listStates(sourceId),
    enabled: Boolean(sourceId),
  })
  // Backs the "add all states matching /regex/" bulk helper below the
  // repeater — a separate source picker from any one row's, since it adds
  // NEW rows rather than editing an existing one.
  const bulkStatesQuery = useQuery({
    queryKey: queryKeys.sources.states(bulkSourceId),
    queryFn: () => api.listStates(bulkSourceId),
    enabled: Boolean(bulkSourceId),
  })

  // A connection flagged fan_out plans 2+ states in one CI job — the targets
  // repeater replaces the single source/state/working-dir trio for it.
  const selectedPipeline = pipelines.find((p) => p.id === pipelineId)
  const fanOut = Boolean(selectedPipeline?.config?.fan_out)
  const validTargets = targets.filter((tg) => tg.source_id && tg.state_key)

  const addTarget = () => setTargets((prev) => [...prev, { source_id: '', state_key: '', working_dir: '' }])
  const updateTarget = (i: number, patch: Partial<DriftTargetItem>) =>
    setTargets((prev) => prev.map((tg, idx) => (idx === i ? { ...tg, ...patch } : tg)))
  const removeTarget = (i: number) => setTargets((prev) => prev.filter((_, idx) => idx !== i))
  const addMatching = () => {
    if (!bulkSourceId || !bulkPattern.trim()) return
    let re: RegExp
    try {
      re = new RegExp(bulkPattern)
    } catch {
      return
    }
    setTargets((prev) => {
      const existing = new Set(prev.map((tg) => JSON.stringify([tg.source_id, tg.state_key])))
      const additions = (bulkStatesQuery.data ?? [])
        .filter((s) => re.test(s.key) && !existing.has(JSON.stringify([bulkSourceId, s.key])))
        .map((s) => ({ source_id: bulkSourceId, state_key: s.key, working_dir: '' }))
      return [...prev, ...additions]
    })
  }

  const mutation = useMutation({
    mutationFn: () => {
      const input: ScheduleInput = {
        name,
        cron_expr: cron,
        target_type: 'drift',
        target_config: fanOut
          ? { pipeline_connection_id: pipelineId, repo_ref: repoRef || undefined, targets: validTargets }
          : {
            pipeline_connection_id: pipelineId,
            source_id: sourceId || undefined,
            state_key: stateKey || undefined,
            repo_ref: repoRef || undefined,
            working_dir: workingDir || undefined,
          },
        enabled,
      }
      return schedule ? api.updateSchedule(schedule.id, input) : api.createSchedule(input)
    },
    onSuccess: onSaved,
    onError: (e) => setError(apiErr(e)),
  })

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{schedule ? t('pages.schedules.edit') : t('pages.schedules.add')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label={t('common.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
            size="small"
          />
          <TextField
            label={t('pages.schedules.cron')}
            value={cron}
            onChange={(e) => setCron(e.target.value)}
            required
            fullWidth
            size="small"
            error={cronError}
            helperText={
              cronError
                ? t('pages.schedules.cronInvalid')
                : cronPreview.length > 0
                  ? t('pages.schedules.cronNextRuns', {
                      runs: cronPreview.map((d) => d.toLocaleString()).join(' · '),
                    })
                  : t('pages.schedules.cronHelp')
            }
          />
          <Autocomplete
            size="small"
            options={pipelines}
            getOptionLabel={(p) => p.name}
            value={pipelines.find((p) => p.id === pipelineId) ?? null}
            onChange={(_, v) => setPipelineId(v?.id ?? '')}
            fullWidth
            renderInput={(params) => <TextField {...params} label={t('pages.schedules.pipeline')} required />}
          />
          <TextField
            label={t('pages.schedules.repoRef')}
            value={repoRef}
            onChange={(e) => setRepoRef(e.target.value)}
            fullWidth
            size="small"
          />
          {!fanOut && (
            <>
              <TextField
                label={t('pages.schedules.workingDir')}
                value={workingDir}
                onChange={(e) => setWorkingDir(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                select
                label={t('pages.schedules.sourceOptional')}
                value={sourceId}
                onChange={(e) => {
                  setSourceId(e.target.value)
                  setStateKey('')
                }}
                fullWidth
                size="small"
              >
                <MenuItem value="">{t('common.none')}</MenuItem>
                {(sourcesQuery.data ?? []).map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
              <Autocomplete
                size="small"
                options={statesQuery.data ?? []}
                loading={statesQuery.isLoading}
                getOptionLabel={(st) => st.name || st.key}
                value={(statesQuery.data ?? []).find((st) => st.key === stateKey) ?? null}
                onChange={(_, v) => setStateKey(v?.key ?? '')}
                disabled={!sourceId || statesQuery.isLoading}
                fullWidth
                renderInput={(params) => <TextField {...params} label={t('pages.schedules.stateOptional')} />}
              />
            </>
          )}
          {fanOut && (
            <Box>
              <Typography variant="subtitle2">{t('pages.schedules.fanOutTargets')}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {t('pages.schedules.fanOutTargetsHelp')}
              </Typography>
              <Stack spacing={1}>
                {targets.map((tg, i) => (
                  <ScheduleTargetRow
                    key={i}
                    target={tg}
                    sources={sourcesQuery.data ?? []}
                    onChange={(patch) => updateTarget(i, patch)}
                    onRemove={() => removeTarget(i)}
                  />
                ))}
              </Stack>
              <Button size="small" startIcon={<AddIcon />} onClick={addTarget} sx={{ mt: 1 }}>
                {t('pages.schedules.addTarget')}
              </Button>
              {targets.length === 0 && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                  {t('pages.schedules.targetsRequired')}
                </Typography>
              )}
              <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: 'flex-start' }}>
                <TextField
                  select
                  label={t('pages.schedules.bulkSourceLabel')}
                  value={bulkSourceId}
                  onChange={(e) => setBulkSourceId(e.target.value)}
                  size="small"
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="">{t('common.none')}</MenuItem>
                  {(sourcesQuery.data ?? []).map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label={t('pages.schedules.bulkPattern')}
                  value={bulkPattern}
                  onChange={(e) => setBulkPattern(e.target.value)}
                  size="small"
                  sx={{ flexGrow: 1 }}
                />
                <Button
                  size="small"
                  disabled={!bulkSourceId || !bulkPattern.trim() || bulkStatesQuery.isLoading}
                  onClick={addMatching}
                >
                  {t('pages.schedules.bulkAdd')}
                </Button>
              </Stack>
            </Box>
          )}
          <FormControlLabel
            control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
            label={t('pages.schedules.enabled')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          disabled={
            mutation.isPending || !name || !cron || cronError || !pipelineId || (fanOut && validTargets.length === 0)
          }
          onClick={() => mutation.mutate()}
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
