import { useState } from 'react'
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
import { api, type TestSourceConfigInput } from '../../services/api'
import DialogTestConnection from './DialogTestConnection'
import { SOURCE_TYPES } from './sourceTypes'

// Add dialog: pick a connector type, fill its field set, optionally test the
// config, then create. Kept separate from EditSourceDialog because the two
// differ in more than a flag — the type is selectable here and immutable there,
// credentials are required here and "blank keeps the stored secret" there, and
// edit overlays the existing config instead of building a fresh one.
export default function AddSourceDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [type, setType] = useState('local')
  const [values, setValues] = useState<Record<string, string>>({})

  const def = SOURCE_TYPES.find((t) => t.value === type) ?? SOURCE_TYPES[0]

  const reset = () => {
    setName('')
    setValues({})
  }

  const createMutation = useMutation({
    mutationFn: () => {
      const config: Record<string, unknown> = {}
      const credentials: Record<string, unknown> = {}
      for (const f of def.fields) {
        const v = values[f.key]?.trim()
        if (!v) continue
        if (f.credential) credentials[f.key] = v
        else config[f.key] = v
      }
      return api.createSource({
        name,
        type,
        config,
        ...(Object.keys(credentials).length ? { credentials } : {}),
      })
    },
    onSuccess: () => {
      reset()
      onCreated()
    },
  })

  const valid = Boolean(name) && def.fields.filter((f) => !f.optional).every((f) => values[f.key]?.trim())

  // Test the config being entered before it is persisted; null until the
  // required fields are filled so the button stays disabled.
  const buildTestInput = (): TestSourceConfigInput | null => {
    if (!valid) return null
    const config: Record<string, unknown> = {}
    const credentials: Record<string, unknown> = {}
    for (const f of def.fields) {
      const v = values[f.key]?.trim()
      if (!v) continue
      if (f.credential) credentials[f.key] = v
      else config[f.key] = v
    }
    return { type, config, ...(Object.keys(credentials).length ? { credentials } : {}) }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('pages.sources.addSourceTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField
            select
            label={t('pages.sources.type')}
            value={type}
            onChange={(e) => {
              setType(e.target.value)
              setValues({})
            }}
            fullWidth
          >
            {SOURCE_TYPES.map((st) => (
              <MenuItem key={st.value} value={st.value}>
                {t(`pages.sources.types.${st.value}`, st.label)}
              </MenuItem>
            ))}
          </TextField>

          {def.fields.map((f) => {
            const label = t(`pages.sources.fields.${type}.${f.key}.label`, f.label)
            return (
              <TextField
                key={f.key}
                label={f.optional ? t('pages.sources.optionalField', { label }) : label}
                type={f.secret ? 'password' : 'text'}
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                helperText={f.helper ? t(`pages.sources.fields.${type}.${f.key}.helper`, f.helper) : undefined}
                fullWidth
              />
            )
          })}

          {/* Divergence, preserved: create falls back to the translated
              pages.sources.createFailed, where every other dialog on this page
              falls back to the bare 'Request failed.' of extractApiError. */}
          {createMutation.isError && (
            <Alert severity="error">
              {(createMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                t('pages.sources.createFailed')}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DialogTestConnection build={buildTestInput} />
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={() => createMutation.mutate()} disabled={!valid || createMutation.isPending}>
          {t('common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
