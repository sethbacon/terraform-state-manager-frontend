import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Alert,
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
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { api, type PipelineConnection, type Schedule, type ScheduleInput } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import PageHeader from '../components/PageHeader'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import ConfirmDialog from '../components/ConfirmDialog'

function apiErr(e: unknown): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Request failed.'
}

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
                  {s.last_status ? (
                    <Chip size="small" color={statusColor(s.last_status)} label={s.last_status} />
                  ) : (
                    <Box component="span" sx={{ color: 'text.secondary' }}>
                      {t('pages.schedules.never')}
                    </Box>
                  )}
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
    setEnabled(schedule?.enabled ?? true)
  }
  if (!open && seededFor !== null) setSeededFor(null)

  const mutation = useMutation({
    mutationFn: () => {
      const input: ScheduleInput = {
        name,
        cron_expr: cron,
        target_type: 'drift',
        target_config: {
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
            helperText={t('pages.schedules.cronHelp')}
          />
          <TextField
            label={t('pages.schedules.pipeline')}
            value={pipelineId}
            onChange={(e) => setPipelineId(e.target.value)}
            select
            required
            fullWidth
            size="small"
          >
            {pipelines.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t('pages.schedules.repoRef')}
            value={repoRef}
            onChange={(e) => setRepoRef(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label={t('pages.schedules.workingDir')}
            value={workingDir}
            onChange={(e) => setWorkingDir(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label={t('pages.schedules.sourceId')}
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label={t('pages.schedules.stateKey')}
            value={stateKey}
            onChange={(e) => setStateKey(e.target.value)}
            fullWidth
            size="small"
          />
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
          disabled={mutation.isPending || !name || !cron || !pipelineId}
          onClick={() => mutation.mutate()}
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
