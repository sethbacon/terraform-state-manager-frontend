import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Autocomplete,
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/PageHeader'
import { api, type TransferResult } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import { useAuth } from '../contexts/AuthContext'

function apiErr(e: unknown): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Request failed.'
}

// defaultTargetKey derives a friendly destination key for a transfer: the
// ref's display name when it differs from the opaque key, with .tfstate
// appended so file-based targets (which list only *.tfstate) can see it.
function defaultTargetKey(refs: { key: string; name: string }[], key: string): string {
  const ref = refs.find((r) => r.key === key)
  const base = ref?.name || key
  return base.endsWith('.tfstate') ? base : `${base}.tfstate`
}

export default function TransferPage() {
  const { t } = useTranslation()
  const { hasScope } = useAuth()
  const queryClient = useQueryClient()
  const canTransfer = hasScope('state:transfer')

  const [sourceId, setSourceId] = useState('')
  const [stateKey, setStateKey] = useState('')
  const [mode, setMode] = useState<'backup' | 'migrate'>('backup')
  const [targetSourceId, setTargetSourceId] = useState('')
  const [targetKey, setTargetKey] = useState('')
  const [decommission, setDecommission] = useState(false)
  const [confirmKey, setConfirmKey] = useState('')
  const [result, setResult] = useState<TransferResult | null>(null)

  const sourcesQuery = useQuery({ queryKey: queryKeys.sources.list(), queryFn: api.listSources })
  const statesQuery = useQuery({
    queryKey: queryKeys.sources.states(sourceId),
    queryFn: () => api.listStates(sourceId),
    enabled: Boolean(sourceId),
  })

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

  const onPickSource = (id: string) => {
    setSourceId(id)
    setStateKey('')
    setTargetKey('')
    setResult(null)
    mutation.reset()
  }
  const onPickState = (key: string) => {
    setStateKey(key)
    // Default the destination to the friendly name, not the opaque key (HCP
    // keys are workspace ids); file-based targets list only .tfstate files.
    if (!targetKey) setTargetKey(defaultTargetKey(statesQuery.data ?? [], key))
  }

  // Decommission is destructive (empties the source), so require typing the exact
  // source state key to confirm before it can run.
  const decommissionConfirmed = !decommission || confirmKey === stateKey
  const sameTarget = targetSourceId === sourceId && targetKey === stateKey
  const valid =
    Boolean(sourceId && stateKey && targetSourceId && targetKey) && !sameTarget && decommissionConfirmed

  const severity: 'success' | 'warning' | 'error' =
    result?.status === 'success' ? 'success' : result?.status === 'verification_failed' ? 'warning' : 'error'

  const reset = () => {
    setResult(null)
    mutation.reset()
  }

  return (
    <Box>
      <PageHeader title={t('nav.transfer')} description={t('help.pages.transfer.body')} />

      {!canTransfer && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {t('pages.transfer.needScope')}
        </Alert>
      )}

      <Box sx={{ maxWidth: 560 }}>
        {result ? (
          <Stack spacing={2}>
            <Alert severity={severity}>
              <b>{result.mode}</b> — {result.status}
              {result.verified != null ? ` · verified: ${result.verified ? 'yes' : 'no'}` : ''}
              {result.decommissioned ? ' · source decommissioned' : ''}
              {result.detail ? ` — ${result.detail}` : ''}
            </Alert>
            <Box>
              <Button variant="outlined" onClick={reset}>
                New transfer
              </Button>
            </Box>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('pages.transfer.source')}
            </Typography>
            <TextField select label="Source" value={sourceId} onChange={(e) => onPickSource(e.target.value)} fullWidth>
              {(sourcesQuery.data ?? []).map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} ({s.type})
                </MenuItem>
              ))}
            </TextField>
            <Autocomplete
              options={statesQuery.data ?? []}
              loading={statesQuery.isLoading}
              getOptionLabel={(st) => st.name || st.key}
              value={(statesQuery.data ?? []).find((st) => st.key === stateKey) ?? null}
              onChange={(_, v) => onPickState(v?.key ?? '')}
              disabled={!sourceId || statesQuery.isLoading}
              fullWidth
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="State file"
                  helperText={sourceId && statesQuery.data?.length === 0 ? 'No state files in this source' : ' '}
                />
              )}
            />

            <Typography variant="subtitle2" color="text.secondary" sx={{ pt: 1 }}>
              {t('pages.transfer.destination')}
            </Typography>
            <TextField select label="Mode" value={mode} onChange={(e) => setMode(e.target.value as 'backup' | 'migrate')} fullWidth>
              <MenuItem value="backup">Backup (copy)</MenuItem>
              <MenuItem value="migrate">Migrate (copy + verify parity)</MenuItem>
            </TextField>
            <TextField
              select
              label="Target source"
              value={targetSourceId}
              onChange={(e) => setTargetSourceId(e.target.value)}
              fullWidth
            >
              {(sourcesQuery.data ?? []).map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} ({s.type})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Target key"
              value={targetKey}
              onChange={(e) => setTargetKey(e.target.value)}
              helperText="Destination path/key within the target source"
              fullWidth
            />
            {sameTarget && <Alert severity="warning">Target must differ from the source state.</Alert>}

            {mode === 'migrate' && (
              <Box>
                <FormControlLabel
                  control={<Checkbox checked={decommission} onChange={(e) => setDecommission(e.target.checked)} />}
                  label="Decommission source after a verified migrate (empties the original; backed up first)"
                />
                {decommission && (
                  <TextField
                    label="Type the source state key to confirm decommission"
                    value={confirmKey}
                    onChange={(e) => setConfirmKey(e.target.value)}
                    placeholder={stateKey}
                    error={confirmKey.length > 0 && confirmKey !== stateKey}
                    fullWidth
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
            )}

            {mutation.isError && <Alert severity="error">{apiErr(mutation.error)}</Alert>}

            <Box>
              <Button
                variant="contained"
                color={mode === 'migrate' && decommission ? 'error' : 'primary'}
                disabled={!canTransfer || !valid || mutation.isPending}
                startIcon={mutation.isPending ? <CircularProgress size={16} /> : <SwapHorizIcon />}
                onClick={() => mutation.mutate()}
              >
                {mode === 'backup' ? 'Backup' : decommission ? 'Migrate & decommission' : 'Migrate'}
              </Button>
            </Box>
          </Stack>
        )}
      </Box>
    </Box>
  )
}
