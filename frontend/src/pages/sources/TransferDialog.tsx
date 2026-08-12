import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Trans, useTranslation } from 'react-i18next'
import { api, type TransferResult } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import TargetBackendHint from '../../components/TargetBackendHint'
import { extractApiError as errMsg } from '../../utils/apiError'

// Copies (backup) or moves (migrate) one state object to another source, then
// reports the backend's verification result in place of the form.
export default function TransferDialog({
  open,
  onClose,
  sourceId,
  stateKey,
  stateName,
}: {
  open: boolean
  onClose: () => void
  sourceId: string
  stateKey: string
  stateName?: string
}) {
  const { t } = useTranslation()
  // Destination defaults to the friendly name (HCP keys are workspace ids),
  // with .tfstate appended so file-based targets list the result.
  const friendly = stateName ?? stateKey
  const defaultTarget = friendly.endsWith('.tfstate') ? friendly : `${friendly}.tfstate`
  // Re-prime the destination when the dialog opens for a (possibly different)
  // state — the component stays mounted across selection changes.
  useEffect(() => {
    if (open) setTargetKey(defaultTarget)
  }, [open, defaultTarget])
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'backup' | 'migrate'>('backup')
  const [targetSourceId, setTargetSourceId] = useState('')
  const [targetKey, setTargetKey] = useState(defaultTarget)
  const [decommission, setDecommission] = useState(false)
  const [result, setResult] = useState<TransferResult | null>(null)

  const sourcesQuery = useQuery({ queryKey: queryKeys.sources.list(), queryFn: api.listSources, enabled: open })

  const mutation = useMutation({
    mutationFn: () =>
      mode === 'backup'
        ? api.backupToSource(sourceId, stateKey, targetSourceId, targetKey)
        : api.migrateToSource(sourceId, stateKey, targetSourceId, targetKey, decommission),
    onSuccess: (r) => {
      setResult(r)
      queryClient.invalidateQueries({ queryKey: queryKeys.sources.all })
    },
  })

  const close = () => {
    setResult(null)
    mutation.reset()
    onClose()
  }

  const valid = Boolean(targetSourceId && targetKey)
  const severity: 'success' | 'warning' | 'error' =
    result?.status === 'success' ? 'success' : result?.status === 'verification_failed' ? 'warning' : 'error'

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>{t('pages.sources.transferTitle')}</DialogTitle>
      <DialogContent>
        {result ? (
          <Alert severity={severity}>
            {result.mode} {result.status}
            {result.verified != null ? ` · verified: ${result.verified ? 'yes' : 'no'}` : ''}
            {result.decommissioned ? ' · source decommissioned' : ''}
            {result.detail ? ` — ${result.detail}` : ''}
          </Alert>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <Trans i18nKey="pages.sources.copyTo" values={{ name: stateName ?? stateKey }} components={{ 1: <b /> }} />
            </Typography>
            <TextField
              select
              label={t('pages.transfer.mode')}
              value={mode}
              onChange={(e) => setMode(e.target.value as 'backup' | 'migrate')}
              fullWidth
            >
              <MenuItem value="backup">{t('pages.transfer.modeBackup')}</MenuItem>
              <MenuItem value="migrate">{t('pages.transfer.modeMigrate')}</MenuItem>
            </TextField>
            <TextField
              select
              label={t('pages.transfer.targetSource')}
              value={targetSourceId}
              onChange={(e) => setTargetSourceId(e.target.value)}
              fullWidth
            >
              {sourcesQuery.data?.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} ({s.type})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t('pages.transfer.targetKey')}
              value={targetKey}
              onChange={(e) => setTargetKey(e.target.value)}
              helperText={t('pages.transfer.targetKeyHelp')}
              fullWidth
            />
            <TargetBackendHint type={sourcesQuery.data?.find((s) => s.id === targetSourceId)?.type} />
            {mode === 'migrate' && (
              <FormControlLabel
                control={<Checkbox checked={decommission} onChange={(e) => setDecommission(e.target.checked)} />}
                label={t('pages.transfer.decommissionLabel')}
              />
            )}
            {mutation.isError && <Alert severity="error">{errMsg(mutation.error)}</Alert>}
          </Stack>
        )}
      </DialogContent>
      {/* Divergence, preserved: the transfer result banner and these four action
          labels are hard-coded English while the form above them is translated. */}
      <DialogActions>
        <Button onClick={close}>{result ? 'Close' : 'Cancel'}</Button>
        {!result && (
          <Button variant="contained" disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
            {mode === 'backup' ? 'Backup' : 'Migrate'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
