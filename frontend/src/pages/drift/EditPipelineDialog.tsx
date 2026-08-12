import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { api, type PipelineConnection, type UpdatePipelineInput } from '../../services/api'
import { extractApiError as apiErr } from '../../utils/apiError'
import { PROVIDERS } from './providers'

// Edits an existing connection: rename it and adjust its coordinates. The
// provider is fixed (it determines the field set). Connections built from a CI
// source inherit that source's credential, so the token field is hidden for them.
export default function EditPipelineDialog({
  pipeline,
  onClose,
  onSaved,
}: {
  pipeline: PipelineConnection | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [token, setToken] = useState('')

  const def = PROVIDERS.find((p) => p.value === pipeline?.provider) ?? PROVIDERS[0]
  const fromCISource = Boolean(pipeline?.config?.ci_source_id)

  // Re-seed the form from config whenever a different connection is opened.
  useEffect(() => {
    if (!pipeline) return
    setName(pipeline.name)
    const seeded: Record<string, string> = {}
    for (const f of def.fields) {
      const v = pipeline.config?.[f.key]
      seeded[f.key] = v == null ? '' : String(v)
    }
    setValues(seeded)
    setToken('')
  }, [pipeline, def])

  const mutation = useMutation({
    mutationFn: () => {
      // Keep config keys we don't render (e.g. ci_source_id) and overlay edits.
      const config: Record<string, unknown> = { ...(pipeline?.config ?? {}) }
      for (const f of def.fields) {
        const v = values[f.key]?.trim()
        if (v) config[f.key] = v
        else delete config[f.key]
      }
      const input: UpdatePipelineInput = { name: name.trim(), config }
      if (!fromCISource && token) input.token = token
      return api.updatePipeline(pipeline!.id, input)
    },
    onSuccess: () => onSaved(),
  })

  const valid =
    Boolean(name.trim()) && def.fields.filter((f) => !f.optional).every((f) => values[f.key]?.trim())

  return (
    <Dialog open={Boolean(pipeline)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('pages.drift.editPipelineTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <Chip size="small" variant="outlined" label={def.label} sx={{ alignSelf: 'flex-start' }} />
          {def.fields.map((f) => {
            const label = t(`pages.drift.fields.${pipeline?.provider}.${f.key}.label`, f.label)
            return (
              <TextField
                key={f.key}
                label={f.optional ? t('pages.sources.optionalField', { label }) : label}
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                fullWidth
              />
            )
          })}
          {fromCISource ? (
            <Typography variant="caption" color="text.secondary">
              {t('pages.drift.credentialInherited')}
            </Typography>
          ) : (
            <TextField
              label={t('pages.drift.apiToken')}
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              helperText={t('pages.drift.tokenHelpEdit')}
              fullWidth
            />
          )}
          {mutation.isError && <Alert severity="error">{apiErr(mutation.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
