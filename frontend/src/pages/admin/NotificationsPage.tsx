import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
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
import SendIcon from '@mui/icons-material/Send'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { api, type NotificationChannel, type NotificationChannelInput } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import PageHeader from '../../components/PageHeader'
import TableSkeleton from '../../components/skeletons/TableSkeleton'
import ConfirmDialog from '../../components/ConfirmDialog'

const EVENT_TYPES = ['drift_detected', 'run_failed'] as const

function apiErr(e: unknown): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Request failed.'
}

export default function NotificationsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<NotificationChannel | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NotificationChannel | null>(null)
  const [notice, setNotice] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)

  const q = useQuery({ queryKey: queryKeys.admin.notifications(), queryFn: api.listNotificationChannels })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.notifications() })

  const deleteMutation = useMutation({ mutationFn: api.deleteNotificationChannel, onSuccess: invalidate })
  const testMutation = useMutation({
    mutationFn: api.testNotificationChannel,
    onSuccess: () => {
      setNotice({ severity: 'success', text: t('pages.notifications.testSent') })
      invalidate()
    },
    onError: (e) => setNotice({ severity: 'error', text: apiErr(e) }),
  })
  const toggleMutation = useMutation({
    mutationFn: ({ ch, enabled }: { ch: NotificationChannel; enabled: boolean }) =>
      api.updateNotificationChannel(ch.id, { name: ch.name, type: ch.type, events: ch.events, enabled }),
    onSuccess: invalidate,
    onError: (e) => setNotice({ severity: 'error', text: apiErr(e) }),
  })

  return (
    <Box>
      <PageHeader
        title={t('pages.notifications.title')}
        description={t('pages.notifications.description')}
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            {t('pages.notifications.add')}
          </Button>
        }
      />

      {notice && (
        <Alert severity={notice.severity} sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice.text}
        </Alert>
      )}

      {q.isLoading && <TableSkeleton rows={3} columns={5} />}
      {q.isError && <Alert severity="error">{t('common.error')}</Alert>}
      {q.data && q.data.length === 0 && <Alert severity="info">{t('pages.notifications.noChannels')}</Alert>}

      {q.data && q.data.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('common.name')}</TableCell>
              <TableCell>{t('common.type')}</TableCell>
              <TableCell>{t('pages.notifications.events')}</TableCell>
              <TableCell>{t('pages.schedules.enabled')}</TableCell>
              <TableCell>{t('pages.notifications.lastDelivery')}</TableCell>
              <TableCell align="right">{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {q.data.map((ch) => (
              <TableRow key={ch.id} hover>
                <TableCell>{ch.name}</TableCell>
                <TableCell>{ch.type}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    {ch.events.length === 0 ? (
                      <Chip size="small" variant="outlined" label={t('pages.notifications.allEvents')} />
                    ) : (
                      ch.events.map((e) => (
                        <Chip key={e} size="small" variant="outlined" label={t(`pages.notifications.event.${e}`)} />
                      ))
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Switch
                    size="small"
                    checked={ch.enabled}
                    onChange={(e) => toggleMutation.mutate({ ch, enabled: e.target.checked })}
                    slotProps={{ input: { 'aria-label': t('pages.schedules.enabled') } }}
                  />
                </TableCell>
                <TableCell>
                  {ch.last_status ? (
                    <Chip size="small" color={ch.last_status === 'sent' ? 'success' : 'error'} label={ch.last_status} />
                  ) : (
                    <Box component="span" sx={{ color: 'text.secondary' }}>
                      {t('pages.notifications.neverSent')}
                    </Box>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={t('pages.notifications.test')}>
                    <IconButton size="small" onClick={() => testMutation.mutate(ch.id)} disabled={testMutation.isPending}>
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.edit')}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditing(ch)
                        setFormOpen(true)
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.delete')}>
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(ch)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ChannelFormDialog
        open={formOpen}
        channel={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false)
          invalidate()
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t('pages.notifications.deleteTitle')}
        severity="error"
        description={t('pages.notifications.deleteConfirm', { name: deleteTarget?.name ?? '' })}
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

function ChannelFormDialog({
  open,
  channel,
  onClose,
  onSaved,
}: {
  open: boolean
  channel: NotificationChannel | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [type, setType] = useState('webhook')
  const [target, setTarget] = useState('')
  const [events, setEvents] = useState<string[]>([])
  const [enabled, setEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [seededFor, setSeededFor] = useState<string | null>(null)
  const seedKey = channel?.id ?? 'new'
  if (open && seededFor !== seedKey) {
    setSeededFor(seedKey)
    setError(null)
    setName(channel?.name ?? '')
    setType(channel?.type ?? 'webhook')
    setTarget('')
    setEvents(channel?.events ?? [])
    setEnabled(channel?.enabled ?? true)
  }
  if (!open && seededFor !== null) setSeededFor(null)

  const toggleEvent = (e: string) =>
    setEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]))

  const mutation = useMutation({
    mutationFn: () => {
      const input: NotificationChannelInput = {
        name,
        type,
        events,
        enabled,
        target: target || undefined,
      }
      return channel ? api.updateNotificationChannel(channel.id, input) : api.createNotificationChannel(input)
    },
    onSuccess: onSaved,
    onError: (e) => setError(apiErr(e)),
  })

  // On create the target is required; on edit a blank target keeps the existing one.
  const targetRequired = !channel
  const canSave = Boolean(name) && (!targetRequired || Boolean(target))

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{channel ? t('pages.notifications.edit') : t('pages.notifications.add')}</DialogTitle>
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
            label={t('common.type')}
            value={type}
            onChange={(e) => setType(e.target.value)}
            select
            fullWidth
            size="small"
          >
            <MenuItem value="webhook">{t('pages.notifications.typeWebhook')}</MenuItem>
            <MenuItem value="slack">{t('pages.notifications.typeSlack')}</MenuItem>
            <MenuItem value="teams">{t('pages.notifications.typeTeams')}</MenuItem>
          </TextField>
          <TextField
            label={t('pages.notifications.target')}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required={targetRequired}
            fullWidth
            size="small"
            type="url"
            placeholder="https://"
            helperText={channel ? t('pages.notifications.targetKeep') : t('pages.notifications.targetHelp')}
          />
          <Box>
            <FormGroup row>
              {EVENT_TYPES.map((e) => (
                <FormControlLabel
                  key={e}
                  control={<Checkbox size="small" checked={events.includes(e)} onChange={() => toggleEvent(e)} />}
                  label={t(`pages.notifications.event.${e}`)}
                />
              ))}
            </FormGroup>
            <Box sx={{ color: 'text.secondary', fontSize: 12 }}>{t('pages.notifications.eventsHelp')}</Box>
          </Box>
          <FormControlLabel
            control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
            label={t('pages.schedules.enabled')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" disabled={mutation.isPending || !canSave} onClick={() => mutation.mutate()}>
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
