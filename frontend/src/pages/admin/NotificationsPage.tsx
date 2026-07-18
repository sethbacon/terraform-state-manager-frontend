import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { NotificationChannelsSection, type NotificationChannelTypeOption } from '@sethbacon/terraform-suite-ui'
import { api, type NotificationChannelInput } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import PageHeader from '../../components/PageHeader'
import PageTitleIcon from '@mui/icons-material/Notifications'

const EVENT_TYPES = ['drift_detected', 'run_failed'] as const

const CHANNEL_TYPE_OPTIONS: NotificationChannelTypeOption[] = [
  { value: 'webhook', label: 'Webhook' },
  { value: 'slack', label: 'Slack' },
  { value: 'teams', label: 'Microsoft Teams' },
  { value: 'email', label: 'Email', isEmail: true },
]

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
  const [notice, setNotice] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)

  const channelsQuery = useQuery({ queryKey: queryKeys.admin.notifications(), queryFn: api.listNotificationChannels })
  const invalidateChannels = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.notifications() })
  const channelEventOptions = EVENT_TYPES.map((e) => ({ value: e, label: t(`pages.notifications.event.${e}`) }))

  return (
    <Box>
      <PageHeader
        icon={<PageTitleIcon />}
        title={t('pages.notifications.title')}
        description={t('pages.notifications.description')}
      />

      <SMTPSettingsPanel />

      {notice && (
        <Alert severity={notice.severity} sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice.text}
        </Alert>
      )}

      <NotificationChannelsSection
        channels={channelsQuery.data ?? []}
        isLoading={channelsQuery.isLoading}
        isError={channelsQuery.isError}
        channelTypes={CHANNEL_TYPE_OPTIONS}
        eventOptions={channelEventOptions}
        onCreate={async (input) => {
          await api.createNotificationChannel(input as NotificationChannelInput)
          invalidateChannels()
        }}
        onUpdate={async (id, input) => {
          await api.updateNotificationChannel(id, input as NotificationChannelInput)
          invalidateChannels()
        }}
        onDelete={async (id) => {
          await api.deleteNotificationChannel(id)
          invalidateChannels()
        }}
        onTest={async (id) => {
          await api.testNotificationChannel(id)
          invalidateChannels()
        }}
        onToggleEnabled={async (channel, enabled) => {
          await api.updateNotificationChannel(channel.id, {
            name: channel.name,
            type: channel.type,
            events: channel.events,
            enabled,
          })
          invalidateChannels()
        }}
      />
    </Box>
  )
}
