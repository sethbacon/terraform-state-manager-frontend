import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
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
import { useTranslation } from 'react-i18next'
import {
  api,
  type CIPipelineRef,
  type CIRepoRef,
  type CIWorkflowRef,
} from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import { extractApiError as apiErr } from '../../utils/apiError'
import { PROVIDERS } from './providers'

// Creates a pipeline connection, in either of two modes. Picking a CI source
// switches the form to live discovery through that source's credential (ADO
// pipelines, or GitHub repos then their workflows) and the created connection
// resolves its credential from the source at dispatch time. Leaving the source
// as "manual entry" falls back to typing the provider's coordinates and its
// own token.
export default function AddPipelineDialog({
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
  const [sourceId, setSourceId] = useState('') // '' = manual entry
  const [provider, setProvider] = useState('github_actions')
  const [values, setValues] = useState<Record<string, string>>({})
  const [token, setToken] = useState('')
  // Discovery selections (CI-source mode).
  const [pipeline, setPipeline] = useState<CIPipelineRef | null>(null)
  const [repo, setRepo] = useState<CIRepoRef | null>(null)
  const [workflow, setWorkflow] = useState<CIWorkflowRef | null>(null)
  const [ref, setRef] = useState('')

  const sourcesQuery = useQuery({ queryKey: queryKeys.ciSources.list(), queryFn: api.listCISources, enabled: open })
  const source = sourcesQuery.data?.find((s) => s.id === sourceId) ?? null

  // What the selected source can dispatch to, fetched live through its credential.
  const adoPipelinesQuery = useQuery({
    queryKey: queryKeys.ciSources.pipelines(sourceId),
    queryFn: () => api.listCISourcePipelines(sourceId),
    enabled: open && source?.provider === 'azure_devops',
  })
  const reposQuery = useQuery({
    queryKey: queryKeys.ciSources.repos(sourceId),
    queryFn: () => api.listCISourceRepos(sourceId),
    enabled: open && source?.provider === 'github_actions',
  })
  const workflowsQuery = useQuery({
    queryKey: queryKeys.ciSources.workflows(sourceId, repo?.name ?? ''),
    queryFn: () => api.listCISourceWorkflows(sourceId, repo?.name ?? ''),
    enabled: open && source?.provider === 'github_actions' && Boolean(repo),
  })

  const def = PROVIDERS.find((p) => p.value === provider) ?? PROVIDERS[0]

  const resetSelections = () => {
    setPipeline(null)
    setRepo(null)
    setWorkflow(null)
    setRef('')
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (source) {
        // Built from a CI source: coordinates come from the selection; the
        // credential stays on the source (resolved at dispatch via ci_source_id).
        const config: Record<string, unknown> = { ci_source_id: source.id }
        if (source.provider === 'azure_devops') {
          config.organization = source.organization
          config.project = source.project ?? ''
          config.pipeline_id = String(pipeline?.id ?? '')
        } else {
          config.owner = source.organization
          config.repo = repo?.name ?? ''
          config.workflow_id = workflow?.file ?? ''
        }
        if (ref.trim()) config.ref = ref.trim()
        return api.createPipeline({ name, provider: source.provider, config })
      }
      const config: Record<string, unknown> = {}
      for (const f of def.fields) {
        const v = values[f.key]?.trim()
        if (v) config[f.key] = v
      }
      return api.createPipeline({ name, provider, config, token: token || undefined })
    },
    onSuccess: () => {
      setName('')
      setValues({})
      setToken('')
      setSourceId('')
      resetSelections()
      onCreated()
    },
  })

  const valid = source
    ? Boolean(name) && (source.provider === 'azure_devops' ? Boolean(pipeline) : Boolean(repo && workflow))
    : Boolean(name) && def.fields.filter((f) => !f.optional).every((f) => values[f.key]?.trim())

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('pages.drift.addPipelineTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField
            select
            label={t('pages.drift.ciSource')}
            value={sourceId}
            onChange={(e) => {
              setSourceId(e.target.value)
              resetSelections()
            }}
            helperText={t('pages.drift.ciSourceHelp')}
            fullWidth
          >
            <MenuItem value="">{t('pages.drift.manualEntry')}</MenuItem>
            {(sourcesQuery.data ?? []).map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name} ({s.provider === 'azure_devops' ? `${s.organization}/${s.project ?? ''}` : s.organization})
              </MenuItem>
            ))}
          </TextField>

          {source && source.provider === 'azure_devops' && (
            <Autocomplete
              options={adoPipelinesQuery.data ?? []}
              loading={adoPipelinesQuery.isLoading}
              getOptionLabel={(p) => p.name}
              value={pipeline}
              onChange={(_, v) => {
                setPipeline(v)
                if (v && !name) setName(v.name)
              }}
              renderOption={(props, p) => (
                <Box component="li" {...props} key={p.id} sx={{ display: 'flex', gap: 1 }}>
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {p.name}
                  </Typography>
                  {p.folder && p.folder !== '\\' && <Chip size="small" variant="outlined" label={p.folder} />}
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('pages.drift.pipeline')}
                  helperText={adoPipelinesQuery.isError ? apiErr(adoPipelinesQuery.error) : t('pages.drift.pipelineHelp')}
                  error={adoPipelinesQuery.isError}
                />
              )}
            />
          )}

          {source && source.provider === 'github_actions' && (
            <>
              <Autocomplete
                options={reposQuery.data ?? []}
                loading={reposQuery.isLoading}
                getOptionLabel={(r) => r.name}
                value={repo}
                onChange={(_, v) => {
                  setRepo(v)
                  setWorkflow(null)
                  setRef(v?.default_branch ?? '')
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('pages.drift.repository')}
                    helperText={reposQuery.isError ? apiErr(reposQuery.error) : t('pages.drift.repositoryHelp')}
                    error={reposQuery.isError}
                  />
                )}
              />
              <Autocomplete
                options={workflowsQuery.data ?? []}
                loading={workflowsQuery.isLoading}
                getOptionLabel={(w) => w.name}
                value={workflow}
                onChange={(_, v) => {
                  setWorkflow(v)
                  if (v && !name) setName(`${repo?.name} · ${v.name}`)
                }}
                disabled={!repo}
                renderOption={(props, w) => (
                  <Box component="li" {...props} key={w.id} sx={{ display: 'flex', gap: 1 }}>
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                      {w.name}
                    </Typography>
                    <Chip size="small" variant="outlined" label={w.file} />
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('pages.drift.workflow')}
                    helperText={workflowsQuery.isError ? apiErr(workflowsQuery.error) : t('pages.drift.workflowHelp')}
                    error={workflowsQuery.isError}
                  />
                )}
              />
            </>
          )}

          {source && (
            <>
              <TextField
                label={t('pages.drift.defaultRefOptional')}
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder={source.provider === 'azure_devops' ? 'refs/heads/main' : 'main'}
                fullWidth
              />
              <Typography variant="caption" color="text.secondary">
                {t('pages.drift.credentialInherited')}
              </Typography>
            </>
          )}

          {!source && (
            <>
              <TextField
                select
                label={t('common.provider')}
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value)
                  setValues({})
                }}
                fullWidth
              >
                {PROVIDERS.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    {p.label}
                  </MenuItem>
                ))}
              </TextField>
              {def.fields.map((f) => {
                const label = t(`pages.drift.fields.${provider}.${f.key}.label`, f.label)
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
              <TextField
                label={t('pages.drift.apiToken')}
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                helperText={t('pages.drift.tokenHelp')}
                fullWidth
              />
            </>
          )}
          {mutation.isError && <Alert severity="error">{apiErr(mutation.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
          {t('common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
