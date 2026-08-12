import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { api, type ResourceSummary } from '../../../services/api'
import { queryKeys } from '../../../services/queryKeys'
import { useAuth } from '../../../contexts/AuthContext'
import { extractApiError as errMsg } from '../../../utils/apiError'

// BackupContentDialog shows a stored backup's full state JSON (pretty-printed
// like the Raw tab), fetched only while open.
function BackupContentDialog({
  sourceId,
  backupId,
  onClose,
}: {
  sourceId: string
  backupId: string | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const q = useQuery({
    queryKey: queryKeys.sources.backupContent(sourceId, backupId ?? ''),
    queryFn: () => api.getBackupContent(sourceId, backupId ?? ''),
    enabled: backupId !== null,
  })

  let pretty = q.data ?? ''
  try {
    pretty = JSON.stringify(JSON.parse(pretty), null, 2)
  } catch {
    // not valid JSON — show as-is
  }

  return (
    <Dialog open={backupId !== null} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('pages.sources.backupContentTitle')}</DialogTitle>
      <DialogContent>
        {q.isLoading && <CircularProgress size={20} />}
        {q.isError && <Alert severity="error">{t('pages.sources.backupsFailed')}</Alert>}
        {q.data !== undefined && (
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 2,
              maxHeight: 480,
              overflow: 'auto',
              fontSize: 12,
              bgcolor: 'action.hover',
              borderRadius: 1,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
            }}
          >
            {pretty}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}

// BackupDiffDialog previews what restoring a backup would change, with a
// restore button so the preview doubles as the confirmation step.
function BackupDiffDialog({
  sourceId,
  stateKey,
  backupId,
  canRestore,
  onRestore,
  onClose,
}: {
  sourceId: string
  stateKey: string
  backupId: string | null
  canRestore: boolean
  onRestore: (backupId: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const q = useQuery({
    queryKey: queryKeys.sources.backupDiff(sourceId, backupId ?? ''),
    queryFn: () => api.getBackupDiff(sourceId, backupId ?? ''),
    enabled: backupId !== null,
  })

  const address = (r: ResourceSummary) =>
    `${r.module && r.module !== 'root' ? r.module + '.' : ''}${r.type}.${r.name}`

  const buckets: { key: string; title: string; color: 'success' | 'error' | 'warning'; sign: string; rows: ResourceSummary[] }[] =
    q.data
      ? [
        { key: 'added', title: t('pages.sources.diffAdded'), color: 'success', sign: '+', rows: q.data.added },
        { key: 'removed', title: t('pages.sources.diffRemoved'), color: 'error', sign: '−', rows: q.data.removed },
        { key: 'changed', title: t('pages.sources.diffChanged'), color: 'warning', sign: '~', rows: q.data.changed },
      ]
      : []
  const noChanges = q.data && buckets.every((b) => b.rows.length === 0)

  return (
    <Dialog open={backupId !== null} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('pages.sources.restoreDiffTitle', { key: stateKey })}</DialogTitle>
      <DialogContent>
        {q.isLoading && <CircularProgress size={20} />}
        {q.isError && <Alert severity="error">{errMsg(q.error)}</Alert>}
        {q.data && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {t('pages.sources.restoreDiffSerials', {
                backup: q.data.backup_serial ?? '—',
                current: q.data.current_serial ?? '—',
              })}
            </Typography>
            {noChanges && <Alert severity="info">{t('pages.sources.diffNoChanges')}</Alert>}
            {buckets
              .filter((b) => b.rows.length > 0)
              .map((b) => (
                <Box key={b.key}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    {b.title}
                  </Typography>
                  <Stack spacing={0.5}>
                    {b.rows.map((r) => (
                      <Stack key={address(r)} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Chip size="small" color={b.color} variant="outlined" label={b.sign} />
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {address(r)}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              ))}
            {q.data.changed.length > 0 && (
              <Alert severity="info">{t('pages.sources.diffApproxNote')}</Alert>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
        <Button
          color="warning"
          variant="contained"
          disabled={!canRestore || !backupId}
          onClick={() => backupId && onRestore(backupId)}
          data-testid="diff-restore-button"
        >
          {t('pages.sources.restore')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// The backups table and both of its dialogs. The two dialogs stay in this module
// because neither can own its state independently: the restore mutation lives on
// the table (its error banner renders above the table, and its isPending gates
// both the row buttons and the diff dialog's restore button), and confirming a
// restore from inside the diff dialog closes it and fires that same mutation.
export default function BackupsTab({ sourceId, stateKey }: { sourceId: string; stateKey: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { hasScope } = useAuth()
  const canEdit = hasScope('state:write')
  const [viewBackupId, setViewBackupId] = useState<string | null>(null)
  const [diffBackupId, setDiffBackupId] = useState<string | null>(null)

  const q = useQuery({
    queryKey: queryKeys.sources.backups(sourceId, stateKey),
    queryFn: () => api.listBackups(sourceId, stateKey),
  })

  const restoreMutation = useMutation({
    mutationFn: (backupId: string) => api.restoreBackup(sourceId, backupId, stateKey),
    onSuccess: () => {
      for (const key of [
        queryKeys.sources.raw(sourceId, stateKey),
        queryKeys.sources.analysis(sourceId, stateKey),
        queryKeys.sources.resources(sourceId, stateKey),
        queryKeys.sources.backups(sourceId, stateKey),
        // The browse panel's list shows size/serial-affected metadata too.
        queryKeys.sources.states(sourceId),
      ]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })

  if (q.isLoading) return <CircularProgress />
  if (q.isError || !q.data) return <Alert severity="error">{t('pages.sources.backupsFailed')}</Alert>
  if (q.data.length === 0) {
    return (
      <Typography color="text.secondary">
        {t('pages.sources.noBackups')}
      </Typography>
    )
  }

  return (
    <Stack spacing={1}>
      {restoreMutation.isError && <Alert severity="error">{errMsg(restoreMutation.error)}</Alert>}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('common.created')}</TableCell>
            <TableCell align="right">{t('pages.sources.serialHeader')}</TableCell>
            {/* Divergence, preserved: this column header is hard-coded English
                while its three siblings in the same row go through i18n. */}
            <TableCell>By</TableCell>
            <TableCell align="right">{t('pages.sources.action')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {q.data.map((b) => (
            <TableRow key={b.id}>
              <TableCell>{new Date(b.created_at).toLocaleString()}</TableCell>
              <TableCell align="right">{b.serial ?? '—'}</TableCell>
              <TableCell sx={{ wordBreak: 'break-all' }}>{b.created_by || '—'}</TableCell>
              <TableCell align="right">
                <Button size="small" onClick={() => setViewBackupId(b.id)}>
                  {t('pages.sources.viewBackup')}
                </Button>
                <Button size="small" onClick={() => setDiffBackupId(b.id)}>
                  {t('pages.sources.previewRestore')}
                </Button>
                <Button
                  size="small"
                  disabled={!canEdit || restoreMutation.isPending}
                  onClick={() => restoreMutation.mutate(b.id)}
                >
                  {t('pages.sources.restore')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <BackupContentDialog
        sourceId={sourceId}
        backupId={viewBackupId}
        onClose={() => setViewBackupId(null)}
      />
      <BackupDiffDialog
        sourceId={sourceId}
        stateKey={stateKey}
        backupId={diffBackupId}
        canRestore={canEdit && !restoreMutation.isPending}
        onRestore={(backupId) => {
          setDiffBackupId(null)
          restoreMutation.mutate(backupId)
        }}
        onClose={() => setDiffBackupId(null)}
      />
    </Stack>
  )
}
