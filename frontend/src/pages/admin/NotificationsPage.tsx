import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  MenuItem,
  Paper,
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
import SendIcon from '@mui/icons-material/Send'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { api, type NotificationChannel, type NotificationChannelInput } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import PageHeader from '../../components/PageHeader'
import PageTitleIcon from '@mui/icons-material/Notifications'
import TableSkeleton from '../../components/skeletons/TableSkeleton'
import ConfirmDialog from '../../components/ConfirmDialog'

const EVENT_TYPES = ['drift_detected', 'run_failed'] as const

function apiErr(e: unknown): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Request failed.'
}

// SMTPSettingsPanel configures the single shared SMTP relay backing every
// "email" notification channel — host/port/credentials/from/use_tls, plus a
// standalone test-email action. Mirrors terraform-registry's admin
// notifications SMTP settings form for parity.
function SMTPSettingsPanel() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const q = useQuery({
    queryKey: queryKeys.admin.notificationsSMTP(),
    queryFn: api.getNotificationsSMTPConfig,
  })

  const [form, setForm] = useState({
    host: '',
    port: 587,
    username: '',
    password: '',
    from: '',
    use_tls: true,
  })
  const [seededFor, setSeededFor] = useState(false)
  const [testRecipients, setTestRecipients] = useState('')
  const [notice, setNotice] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)

  if (q.data && !seededFor) {
    setSeededFor(true)
    setForm({
      host: q.data.host,
      port: q.data.port,
      username: q.data.username,
      password: '',
      from: q.data.from,
      use_tls: q.data.use_tls,
    })
  }

  const saveMutation = useMutation({
    mutationFn: () => api.saveNotificationsSMTPConfig(form),
    onSuccess: () => {
      setNotice({ severity: 'success', text: t('pages.notifications.smtp.saveSuccess') })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.notificationsSMTP() })
    },
    onError: (e) => setNotice({ severity: 'error', text: apiErr(e) }),
  })

  const testMutation = useMutation({
    mutationFn: () =>
      api.sendNotificationsTestEmail({
        recipients: testRecipients
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean),
      }),
    onSuccess: (data) => {
      setNotice({
        severity: data.success ? 'success' : 'error',
        text: data.message || t('pages.notifications.smtp.testError'),
      })
    },
    onError: (e) => setNotice({ severity: 'error', text: apiErr(e) }),
  })

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {t('pages.notifications.smtp.title')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        {t('pages.notifications.smtp.description')}
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {notice && (
        <Alert severity={notice.severity} sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice.text}
        </Alert>
      )}

      {q.isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              size="small"
              label={t('pages.notifications.smtp.host')}
              value={form.host}
              onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label={t('pages.notifications.smtp.port')}
              value={form.port}
              onChange={(e) => setForm((f) => ({ ...f, port: Number(e.target.value) }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              size="small"
              label={t('pages.notifications.smtp.username')}
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              size="small"
              type="password"
              label={t('pages.notifications.smtp.password')}
              placeholder={t('pages.notifications.smtp.passwordPlaceholder')}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              helperText={q.data?.password_configured ? t('pages.notifications.smtp.passwordConfigured') : ''}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              size="small"
              label={t('pages.notifications.smtp.from')}
              value={form.from}
              onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.use_tls}
                  onChange={(e) => setForm((f) => ({ ...f, use_tls: e.target.checked }))}
                />
              }
              label={t('pages.notifications.smtp.useTls')}
            />
          </Grid>
        </Grid>
      )}

      <Box sx={{ mt: 2 }}>
        <Button variant="contained" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? <CircularProgress size={20} /> : t('common.save')}
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" gutterBottom>
        {t('pages.notifications.smtp.test')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label={t('pages.notifications.smtp.testRecipients')}
          value={testRecipients}
          onChange={(e) => setTestRecipients(e.target.value)}
          sx={{ minWidth: 300 }}
        />
        <Button
          variant="outlined"
          disabled={testMutation.isPending || !testRecipients.trim()}
          onClick={() => testMutation.mutate()}
        >
          {testMutation.isPending ? <CircularProgress size={20} /> : t('pages.notifications.smtp.test')}
        </Button>
      </Box>
    </Paper>
  )
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
        icon={<PageTitleIcon />}
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

      <SMTPSettingsPanel />

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
  // Email channels carry recipient address(es), not a URL — relabel the target field.
  const isEmail = type === 'email'

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
            <MenuItem value="email">{t('pages.notifications.typeEmail')}</MenuItem>
          </TextField>
          <TextField
            label={isEmail ? t('pages.notifications.targetEmail') : t('pages.notifications.target')}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required={targetRequired}
            fullWidth
            size="small"
            type={isEmail ? 'text' : 'url'}
            placeholder={isEmail ? 'ops@example.com, oncall@example.com' : 'https://'}
            helperText={
              channel
                ? isEmail
                  ? t('pages.notifications.targetEmailKeep')
                  : t('pages.notifications.targetKeep')
                : isEmail
                  ? t('pages.notifications.targetEmailHelp')
                  : t('pages.notifications.targetHelp')
            }
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
