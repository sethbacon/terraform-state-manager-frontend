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
  FormControlLabel,
  FormGroup,
  IconButton,
  MenuItem,
  Stack,
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
import AutorenewIcon from '@mui/icons-material/Autorenew'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { useTranslation } from 'react-i18next'
import { api, type APIKey, type APIKeyInput } from '../../services/api'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHeader from '../../components/PageHeader'
import TableSkeleton from '../../components/skeletons/TableSkeleton'
import { queryKeys } from '../../services/queryKeys'
import { useAuth } from '../../contexts/AuthContext'

function keysApiErr(e: unknown): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Request failed.'
}

// Mirrors the backend's assignable set (SCIM keeps its own token path).
const ASSIGNABLE_SCOPES = [
  'state:read',
  'state:write',
  'state:drift',
  'state:execute',
  'state:transfer',
  'sources:manage',
  'admin',
]

// Registry palette: admin red, write/manage orange, read green.
function scopeColor(scope: string): 'error' | 'warning' | 'success' {
  if (scope === 'admin') return 'error'
  if (scope.endsWith(':write') || scope.endsWith(':manage') || scope.endsWith(':transfer')) return 'warning'
  return 'success'
}

function expiryStatus(key: APIKey): 'never' | 'active' | 'expired' {
  if (!key.expires_at) return 'never'
  return new Date(key.expires_at) < new Date() ? 'expired' : 'active'
}

export default function APIKeysPage() {
  const { t } = useTranslation()
  const { hasScope } = useAuth()
  const queryClient = useQueryClient()

  const [editorOpen, setEditorOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<APIKey | null>(null)
  const [rotateTarget, setRotateTarget] = useState<APIKey | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<APIKey | null>(null)
  const [secret, setSecret] = useState('')
  const [notice, setNotice] = useState('')

  const keysQuery = useQuery({ queryKey: queryKeys.apiKeys.list(), queryFn: api.listAPIKeys })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all })

  const deleteKey = useMutation({
    mutationFn: (id: string) => api.deleteAPIKey(id),
    onSuccess: () => {
      setDeleteTarget(null)
      invalidate()
    },
    onError: (e) => setNotice(keysApiErr(e)),
  })

  // Scopes the caller can grant: only ones they hold (write implies read,
  // matching the backend's read-write pairing).
  const grantable = ASSIGNABLE_SCOPES.filter(
    (s) => hasScope(s) || (s === 'state:read' && hasScope('state:write')),
  )

  return (
    <Box>
      <PageHeader
        title={t('pages.apiKeys.title')}
        description={t('pages.apiKeys.description')}
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditTarget(null)
              setEditorOpen(true)
            }}
          >
            {t('pages.apiKeys.create')}
          </Button>
        }
      />

      {notice && (
        <Alert severity="error" onClose={() => setNotice('')} sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}

      {keysQuery.isLoading && <TableSkeleton rows={4} columns={6} />}
      {keysQuery.data && keysQuery.data.length === 0 && (
        <Alert severity="info">{t('pages.apiKeys.empty')}</Alert>
      )}
      {keysQuery.data && keysQuery.data.length > 0 && (
        <Card variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common.name')}</TableCell>
                <TableCell>{t('pages.apiKeys.prefix')}</TableCell>
                <TableCell>{t('pages.apiKeys.scopes')}</TableCell>
                <TableCell>{t('pages.apiKeys.expires')}</TableCell>
                <TableCell>{t('pages.apiKeys.lastUsed')}</TableCell>
                <TableCell align="right">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {keysQuery.data.map((k) => {
                const status = expiryStatus(k)
                return (
                  <TableRow key={k.id} sx={status === 'expired' ? { opacity: 0.55 } : undefined}>
                    <TableCell>
                      <Typography variant="body2">{k.name}</Typography>
                      {(k.user_name || k.description) && (
                        <Typography variant="caption" color="text.secondary">
                          {[k.user_name, k.description].filter(Boolean).join(' — ')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{k.key_prefix}…</TableCell>
                    <TableCell>
                      {k.scopes.map((s) => (
                        <Chip key={s} size="small" variant="outlined" color={scopeColor(s)} label={s} sx={{ mr: 0.5 }} />
                      ))}
                    </TableCell>
                    <TableCell>
                      {status === 'never' && t('pages.apiKeys.never')}
                      {status === 'active' && new Date(k.expires_at!).toLocaleString()}
                      {status === 'expired' && <Chip size="small" color="error" label={t('pages.apiKeys.expired')} />}
                    </TableCell>
                    <TableCell>
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : t('pages.apiKeys.neverUsed')}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('pages.apiKeys.rotate')}>
                        <IconButton size="small" onClick={() => setRotateTarget(k)}>
                          <AutorenewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('common.edit')}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditTarget(k)
                            setEditorOpen(true)
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('common.delete')}>
                        <IconButton size="small" onClick={() => setDeleteTarget(k)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <KeyEditorDialog
        open={editorOpen}
        existing={editTarget}
        grantable={grantable}
        onClose={() => setEditorOpen(false)}
        onSaved={(plaintext) => {
          setEditorOpen(false)
          invalidate()
          if (plaintext) setSecret(plaintext)
        }}
      />

      <RotateDialog
        target={rotateTarget}
        onClose={() => setRotateTarget(null)}
        onRotated={(plaintext) => {
          setRotateTarget(null)
          invalidate()
          setSecret(plaintext)
        }}
      />

      <SecretDialog secret={secret} onClose={() => setSecret('')} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('pages.apiKeys.deleteTitle')}
        description={t('pages.apiKeys.deleteBody', { name: deleteTarget?.name ?? '' })}
        severity="error"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteKey.mutate(deleteTarget.id)
        }}
      />
    </Box>
  )
}

// SecretDialog shows a freshly minted key — the only time it is visible.
function SecretDialog({ secret, onClose }: { secret: string; onClose: () => void }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  return (
    <Dialog open={Boolean(secret)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('pages.apiKeys.secretTitle')}</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('pages.apiKeys.secretWarning')}
        </Alert>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <TextField fullWidth value={secret} slotProps={{ htmlInput: { readOnly: true, 'aria-label': 'api key' } }} />
          <Tooltip title={copied ? t('common.copied') : t('common.copy')}>
            <IconButton
              aria-label={t('common.copy')}
              onClick={() => {
                void navigator.clipboard?.writeText(secret)
                setCopied(true)
              }}
            >
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          {t('pages.apiKeys.secretStored')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// KeyEditorDialog covers create (existing=null) and edit.
function KeyEditorDialog({
  open,
  existing,
  grantable,
  onClose,
  onSaved,
}: {
  open: boolean
  existing: APIKey | null
  grantable: string[]
  onClose: () => void
  onSaved: (plaintextSecret?: string) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [scopes, setScopes] = useState<string[]>([])
  const [expires, setExpires] = useState('') // datetime-local
  const [error, setError] = useState('')
  const [seededFor, setSeededFor] = useState<string | null>(null)

  // Seed fields when the dialog opens for a given target.
  const seedKey = existing ? existing.id : 'new'
  if (open && seededFor !== seedKey) {
    setSeededFor(seedKey)
    setName(existing?.name ?? '')
    setDescription(existing?.description ?? '')
    setScopes(existing?.scopes ?? [])
    setExpires(existing?.expires_at ? existing.expires_at.slice(0, 16) : '')
    setError('')
  }
  if (!open && seededFor !== null) setSeededFor(null)

  const save = useMutation({
    // Normalized result: the plaintext secret on create, nothing on edit.
    mutationFn: async (input: APIKeyInput): Promise<string | undefined> => {
      if (existing) {
        await api.updateAPIKey(existing.id, input)
        return undefined
      }
      return (await api.createAPIKey(input)).key
    },
    onSuccess: (plaintext) => onSaved(plaintext),
    onError: (e) => setError(keysApiErr(e)),
  })

  const toggleScope = (s: string) =>
    setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{existing ? t('pages.apiKeys.editTitle') : t('pages.apiKeys.createTitle')}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={t('common.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label={t('pages.apiKeys.descriptionLabel')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
          />
          <Box>
            <Typography variant="subtitle2">{t('pages.apiKeys.scopes')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('pages.apiKeys.scopesHelp')}
            </Typography>
            <FormGroup>
              {grantable.map((s) => (
                <FormControlLabel
                  key={s}
                  control={<Checkbox checked={scopes.includes(s)} onChange={() => toggleScope(s)} />}
                  label={s}
                />
              ))}
            </FormGroup>
          </Box>
          <TextField
            label={t('pages.apiKeys.expiresLabel')}
            type="datetime-local"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            helperText={t('pages.apiKeys.expiresHelp')}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          disabled={!name || scopes.length === 0 || save.isPending}
          onClick={() =>
            save.mutate({
              name,
              description: description || undefined,
              scopes,
              expires_at: expires ? new Date(expires).toISOString() : undefined,
            })
          }
        >
          {existing ? t('common.save') : t('pages.apiKeys.create')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// RotateDialog mints a replacement, optionally keeping the old key alive for
// a grace window so consumers can switch over.
function RotateDialog({
  target,
  onClose,
  onRotated,
}: {
  target: APIKey | null
  onClose: () => void
  onRotated: (plaintextSecret: string) => void
}) {
  const { t } = useTranslation()
  const [grace, setGrace] = useState(0)
  const [error, setError] = useState('')

  const rotate = useMutation({
    mutationFn: () => api.rotateAPIKey(target!.id, grace),
    onSuccess: (res) => onRotated(res.key),
    onError: (e) => setError(keysApiErr(e)),
  })

  return (
    <Dialog open={Boolean(target)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('pages.apiKeys.rotateTitle', { name: target?.name ?? '' })}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('pages.apiKeys.rotateBody')}
        </Typography>
        <TextField
          select
          fullWidth
          label={t('pages.apiKeys.graceLabel')}
          value={grace}
          onChange={(e) => setGrace(Number(e.target.value))}
        >
          <MenuItem value={0}>{t('pages.apiKeys.graceImmediate')}</MenuItem>
          {[1, 6, 24, 72].map((h) => (
            <MenuItem key={h} value={h}>
              {t('pages.apiKeys.graceHours', { count: h })}
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" disabled={rotate.isPending} onClick={() => rotate.mutate()}>
          {t('pages.apiKeys.rotate')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
