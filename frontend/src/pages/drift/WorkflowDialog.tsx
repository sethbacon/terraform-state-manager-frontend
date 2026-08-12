import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  TextField,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useTranslation } from 'react-i18next'
import { api } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import { extractApiError as apiErr } from '../../utils/apiError'
import { PROVIDERS } from './providers'

// Shows the CI workflow template an operator has to commit to their repo for a
// drift run to call back, copyable, per provider and template style.
export default function WorkflowDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const [provider, setProvider] = useState('github_actions')
  const [variant, setVariant] = useState('default')
  const q = useQuery({
    queryKey: queryKeys.drift.workflow(provider, variant),
    queryFn: () => api.getDriftWorkflow(provider, variant),
    enabled: open,
  })

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{t('pages.drift.workflowTemplateTitle')}</DialogTitle>
      <DialogContent>
        <TextField
          select
          size="small"
          label={t('common.provider')}
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          sx={{ mb: 2, mt: 1, mr: 2, minWidth: 220 }}
        >
          {PROVIDERS.map((p) => (
            <MenuItem key={p.value} value={p.value}>
              {p.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('common.templateStyle')}
          value={variant}
          onChange={(e) => setVariant(e.target.value)}
          sx={{ mb: 2, mt: 1, minWidth: 260 }}
        >
          <MenuItem value="default">{t('common.templateBuiltin')}</MenuItem>
          <MenuItem value="suite">{t('common.templateSuite')}</MenuItem>
        </TextField>
        <Divider sx={{ mb: 1 }} />
        {q.isLoading ? (
          <CircularProgress />
        ) : q.isError ? (
          <Alert severity="error">{apiErr(q.error)}</Alert>
        ) : (
          <Box
            component="pre"
            sx={{ m: 0, p: 2, maxHeight: 460, overflow: 'auto', fontSize: 12, bgcolor: 'action.hover', borderRadius: 1, whiteSpace: 'pre' }}
          >
            {q.data}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          startIcon={<ContentCopyIcon />}
          disabled={!q.data}
          onClick={() => q.data && void navigator.clipboard.writeText(q.data)}
        >
          {t('common.copy')}
        </Button>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}
