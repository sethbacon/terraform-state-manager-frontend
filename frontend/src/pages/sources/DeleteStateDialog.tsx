import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Trans, useTranslation } from 'react-i18next'
import { api } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import { extractApiError as errMsg } from '../../utils/apiError'

// DeleteStateDialog is the admin-only destructive delete of a state object. It
// reminds the operator that a final backup is taken (and that they can download
// first), offers an explicit purge of backups, and requires typing the exact
// state key before the delete is enabled.
export default function DeleteStateDialog({
  open,
  onClose,
  sourceId,
  stateKey,
  stateName,
  onDeleted,
}: {
  open: boolean
  onClose: () => void
  sourceId: string
  stateKey: string
  stateName?: string
  onDeleted: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [purge, setPurge] = useState(false)
  const [confirmKey, setConfirmKey] = useState('')

  // Reset each time the dialog opens so a prior attempt never leaks in.
  useEffect(() => {
    if (open) {
      setPurge(false)
      setConfirmKey('')
    }
  }, [open])

  const mutation = useMutation({
    mutationFn: () => api.deleteState(sourceId, stateKey, purge),
    onSuccess: () => {
      for (const key of [
        queryKeys.sources.states(sourceId),
        queryKeys.sources.raw(sourceId, stateKey),
        queryKeys.sources.analysis(sourceId, stateKey),
        queryKeys.sources.resources(sourceId, stateKey),
        queryKeys.sources.backups(sourceId, stateKey),
      ]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      onClose()
      onDeleted()
    },
  })

  const confirmed = confirmKey === stateKey

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('pages.sources.deleteStateTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="error">
            <Trans
              i18nKey="pages.sources.deleteStateBody"
              values={{ name: stateName ?? stateKey }}
              components={{ 1: <b /> }}
            />
          </Alert>
          <Typography variant="body2" color="text.secondary">
            {t('pages.sources.deleteStateBackupNote')}
          </Typography>
          <FormControlLabel
            control={<Checkbox checked={purge} onChange={(e) => setPurge(e.target.checked)} color="error" />}
            label={t('pages.sources.deleteStatePurgeLabel')}
          />
          {purge && <Alert severity="warning">{t('pages.sources.deleteStatePurgeWarning')}</Alert>}
          <Typography variant="body2">
            <Trans
              i18nKey="pages.sources.deleteStateConfirmPrompt"
              values={{ key: stateKey }}
              components={{ 1: <code /> }}
            />
          </Typography>
          <TextField
            value={confirmKey}
            onChange={(e) => setConfirmKey(e.target.value)}
            placeholder={stateKey}
            fullWidth
            size="small"
            slotProps={{ htmlInput: { 'aria-label': t('pages.sources.deleteStateConfirmAria'), 'data-testid': 'delete-state-confirm-input' } }}
          />
          {mutation.isError && <Alert severity="error">{errMsg(mutation.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          color="error"
          variant="contained"
          disabled={!confirmed || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {t('pages.sources.deleteStateConfirmLabel')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
