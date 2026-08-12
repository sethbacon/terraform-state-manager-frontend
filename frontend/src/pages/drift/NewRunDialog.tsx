import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Alert,
  Autocomplete,
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
import { api, type PipelineConnection } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import { extractApiError as apiErr } from '../../utils/apiError'

// Dispatches a drift run against a pipeline connection, optionally pinned to a
// state object so the resulting drift record is attributable to it.
export default function NewRunDialog({
  open,
  onClose,
  pipelines,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  pipelines: PipelineConnection[]
  onCreated: () => void
}) {
  const { t } = useTranslation()
  const [pipelineId, setPipelineId] = useState('')
  const [repoRef, setRepoRef] = useState('')
  const [workingDir, setWorkingDir] = useState('.')
  const [sourceId, setSourceId] = useState('')
  const [stateKey, setStateKey] = useState('')

  const sourcesQuery = useQuery({ queryKey: queryKeys.sources.list(), queryFn: api.listSources, enabled: open })
  const statesQuery = useQuery({
    queryKey: queryKeys.sources.states(sourceId),
    queryFn: () => api.listStates(sourceId),
    enabled: Boolean(sourceId),
  })

  const mutation = useMutation({
    mutationFn: () =>
      api.createDriftRun({
        pipeline_connection_id: pipelineId,
        repo_ref: repoRef || undefined,
        working_dir: workingDir || undefined,
        source_id: sourceId || undefined,
        state_key: stateKey || undefined,
      }),
    // Divergence, preserved: a successful dispatch clears the ref and the
    // state pinning but deliberately leaves the selected pipeline and working
    // directory in place, so dispatching several runs against the same
    // pipeline does not mean re-picking it each time.
    onSuccess: () => {
      setRepoRef('')
      setSourceId('')
      setStateKey('')
      onCreated()
    },
  })

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('pages.drift.newRunTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField select label={t('pages.drift.pipeline')} value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} fullWidth>
            {pipelines.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} ({p.provider})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t('pages.drift.gitRefOptional')}
            value={repoRef}
            onChange={(e) => setRepoRef(e.target.value)}
            placeholder={t('pages.drift.placeholderPipelineDefault')}
            helperText={t('pages.drift.gitRefHelp')}
            fullWidth
          />
          <TextField
            label={t('pages.drift.workingDir')}
            value={workingDir}
            onChange={(e) => setWorkingDir(e.target.value)}
            fullWidth
          />
          <TextField
            select
            label={t('pages.drift.sourceOptional')}
            value={sourceId}
            onChange={(e) => {
              setSourceId(e.target.value)
              setStateKey('')
            }}
            fullWidth
          >
            <MenuItem value="">{t('common.none')}</MenuItem>
            {(sourcesQuery.data ?? []).map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
          <Autocomplete
            options={statesQuery.data ?? []}
            loading={statesQuery.isLoading}
            getOptionLabel={(st) => st.name || st.key}
            value={(statesQuery.data ?? []).find((st) => st.key === stateKey) ?? null}
            onChange={(_, v) => setStateKey(v?.key ?? '')}
            disabled={!sourceId || statesQuery.isLoading}
            fullWidth
            renderInput={(params) => <TextField {...params} label={t('pages.drift.stateOptional')} />}
          />
          {mutation.isError && <Alert severity="error">{apiErr(mutation.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" disabled={!pipelineId || mutation.isPending} onClick={() => mutation.mutate()}>
          {t('pages.drift.dispatch')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
