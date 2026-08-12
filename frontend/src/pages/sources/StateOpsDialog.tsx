import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Trans, useTranslation } from 'react-i18next'
import { api } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import { extractApiError as errMsg } from '../../utils/apiError'
import { indexToken } from './addresses'

// `terraform state rm` / `terraform state mv` against a stored state, with the
// resource address picked from the state's own resource list rather than typed.
export default function StateOpsDialog({
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
  const queryClient = useQueryClient()
  const [op, setOp] = useState<'rm' | 'mv'>('rm')
  const [address, setAddress] = useState('')
  const [instanceIdx, setInstanceIdx] = useState('')
  const [to, setTo] = useState('')

  // Resources in this state, so the address can be picked instead of typed.
  // Same query key as the Resources tab, so it's usually already cached.
  const resourcesQuery = useQuery({
    queryKey: queryKeys.sources.resources(sourceId, stateKey),
    queryFn: () => api.listStateResources(sourceId, stateKey),
    enabled: open,
  })

  // Addresses in the exact form the backend parses: "[module.X.]type.name"
  // (no prefix for the root module). Deduped; meta drives the option display and
  // the per-instance (for_each/count) picker.
  const { addressOptions, addressMeta } = useMemo(() => {
    const meta = new Map<string, { mode: string; instances: number; module: string; instanceKeys: (string | number)[] }>()
    for (const r of resourcesQuery.data ?? []) {
      const addr = `${r.module === 'root' ? '' : `${r.module}.`}${r.type}.${r.name}`
      if (!meta.has(addr))
        meta.set(addr, { mode: r.mode, instances: r.instances, module: r.module, instanceKeys: r.instance_keys ?? [] })
    }
    return { addressOptions: [...meta.keys()], addressMeta: meta }
  }, [resourcesQuery.data])

  // Instance keys for the currently-selected base address (empty for singletons
  // or a free-typed address). Selecting one appends its index to the address.
  const instanceKeys = addressMeta.get(address)?.instanceKeys ?? []
  const effectiveAddress = instanceIdx ? `${address}${instanceIdx}` : address

  // Picking a different base address clears any stale instance selection.
  useEffect(() => {
    setInstanceIdx('')
  }, [address])

  const mutation = useMutation({
    mutationFn: () => api.stateOperation(sourceId, stateKey, op, effectiveAddress, op === 'mv' ? to : undefined),
    onSuccess: () => {
      setAddress('')
      setInstanceIdx('')
      setTo('')
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
      onClose()
    },
  })

  const valid = Boolean(address) && (op === 'rm' || Boolean(to))

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('pages.sources.stateOpTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <Trans
              i18nKey="pages.sources.stateOpDesc"
              values={{ name: stateName ?? stateKey }}
              components={{ 1: <b /> }}
            />
          </Typography>
          <TextField select label={t('pages.sources.operation')} value={op} onChange={(e) => setOp(e.target.value as 'rm' | 'mv')} fullWidth>
            <MenuItem value="rm">{t('pages.sources.opRemove')}</MenuItem>
            <MenuItem value="mv">{t('pages.sources.opMove')}</MenuItem>
          </TextField>
          <Autocomplete
            freeSolo
            options={addressOptions}
            loading={resourcesQuery.isLoading}
            groupBy={(option) => addressMeta.get(option)?.module ?? ''}
            inputValue={address}
            onInputChange={(_, v) => setAddress(v)}
            renderOption={(props, option) => {
              const meta = addressMeta.get(option)
              return (
                <Box component="li" {...props} key={option} sx={{ display: 'flex', gap: 1 }}>
                  <Typography variant="body2" sx={{ flexGrow: 1, wordBreak: 'break-all' }}>
                    {option}
                  </Typography>
                  {meta?.mode === 'data' && <Chip size="small" label="data" />}
                  {(meta?.instances ?? 0) > 1 && <Chip size="small" variant="outlined" label={`×${meta?.instances}`} />}
                </Box>
              )
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('pages.sources.resourceAddress')}
                placeholder="aws_instance.web or module.vpc.aws_subnet.private"
                fullWidth
              />
            )}
          />
          {instanceKeys.length > 0 && (
            <TextField
              select
              label={t('pages.sources.instance')}
              value={instanceIdx}
              onChange={(e) => setInstanceIdx(e.target.value)}
              helperText={t('pages.sources.instanceHelper')}
              fullWidth
            >
              <MenuItem value="">{t('pages.sources.instanceAll')}</MenuItem>
              {instanceKeys.map((key) => (
                <MenuItem key={String(key)} value={indexToken(key)}>
                  {String(key)}
                </MenuItem>
              ))}
            </TextField>
          )}
          {op === 'mv' && (
            <TextField
              label={t('pages.sources.newAddress')}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={instanceIdx ? 'aws_instance.web2["b"]' : 'aws_instance.web2'}
              helperText={instanceIdx ? t('pages.sources.newAddressInstanceHelper') : undefined}
              fullWidth
            />
          )}
          {mutation.isError && <Alert severity="error">{errMsg(mutation.error)}</Alert>}
        </Stack>
      </DialogContent>
      {/* Divergence, preserved: these two action labels are hard-coded English
          while the rest of this dialog is translated. */}
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="warning" variant="contained" disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  )
}
