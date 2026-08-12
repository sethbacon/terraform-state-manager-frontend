import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { api, type StateSource, type TestSourceConfigInput } from '../../services/api'
import { extractApiError as errMsg } from '../../utils/apiError'
import DialogTestConnection from './DialogTestConnection'
import { SOURCE_TYPES } from './sourceTypes'

// Edit dialog: same field definitions as Add, but the type is immutable and
// credential fields left blank keep the stored secret.
export default function EditSourceDialog({
  source,
  onClose,
  onSaved,
}: {
  source: StateSource | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})

  const type = source?.type ?? 'local'
  const def = SOURCE_TYPES.find((st) => st.value === type) ?? SOURCE_TYPES[0]

  useEffect(() => {
    if (!source) return
    setName(source.name)
    const initial: Record<string, string> = {}
    for (const [k, v] of Object.entries(source.config ?? {})) {
      if (typeof v === 'string') initial[k] = v
    }
    setValues(initial)
  }, [source])

  const saveMutation = useMutation({
    mutationFn: () => {
      // The backend replaces config wholesale on update, so start from the
      // existing config and overlay only the known fields — otherwise config
      // keys the UI does not model (e.g. a git source's author_name/
      // author_email set out-of-band) would be silently dropped on any edit.
      const config: Record<string, unknown> = { ...(source?.config ?? {}) }
      const credentials: Record<string, unknown> = {}
      for (const f of def.fields) {
        const v = values[f.key]?.trim()
        if (f.credential) {
          // Credentials never live in config; keep them out of the config blob.
          delete config[f.key]
          if (v) credentials[f.key] = v
          continue
        }
        if (v) config[f.key] = v
        else delete config[f.key]
      }
      return api.updateSource(source!.id, {
        name,
        config,
        ...(Object.keys(credentials).length ? { credentials } : {}),
      })
    },
    onSuccess: onSaved,
  })

  // Credential fields may stay blank on edit (the stored secret is kept).
  const valid =
    Boolean(name) && def.fields.filter((f) => !f.optional && !f.credential).every((f) => values[f.key]?.trim())

  // Test the config the operator is about to save; blank credentials reuse the
  // source's stored secret via source_id (mirroring UpdateSource). Null until
  // the required non-credential fields are filled.
  const buildTestInput = (): TestSourceConfigInput | null => {
    if (!source || !valid) return null
    const config: Record<string, unknown> = {}
    const credentials: Record<string, unknown> = {}
    for (const f of def.fields) {
      const v = values[f.key]?.trim()
      if (!v) continue
      if (f.credential) credentials[f.key] = v
      else config[f.key] = v
    }
    return {
      type,
      config,
      source_id: source.id,
      ...(Object.keys(credentials).length ? { credentials } : {}),
    }
  }

  return (
    <Dialog open={Boolean(source)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('pages.sources.editSourceTitle', { name: source?.name })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField select label={t('pages.sources.type')} value={type} disabled fullWidth>
            <MenuItem value={type}>{t(`pages.sources.types.${type}`, def.label)}</MenuItem>
          </TextField>

          {def.fields.map((f) => {
            const label = t(`pages.sources.fields.${type}.${f.key}.label`, f.label)
            return (
              <TextField
                key={f.key}
                label={f.optional || f.credential ? t('pages.sources.optionalField', { label }) : label}
                type={f.secret ? 'password' : 'text'}
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                helperText={
                  f.credential
                    ? t('pages.sources.keepCredentialHelper')
                    : f.helper
                      ? t(`pages.sources.fields.${type}.${f.key}.helper`, f.helper)
                      : undefined
                }
                fullWidth
              />
            )
          })}

          {saveMutation.isError && <Alert severity="error">{errMsg(saveMutation.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DialogTestConnection build={buildTestInput} />
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={() => saveMutation.mutate()} disabled={!valid || saveMutation.isPending}>
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
