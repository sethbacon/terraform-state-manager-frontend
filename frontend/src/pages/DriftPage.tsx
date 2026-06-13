import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import HubIcon from '@mui/icons-material/Hub'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import DescriptionIcon from '@mui/icons-material/Description'
import { Trans, useTranslation } from 'react-i18next'
import {
  api,
  type CIPipelineRef,
  type CIRepoRef,
  type CISource,
  type CIWorkflowRef,
  type DriftRun,
  type PipelineConnection,
} from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog'
import DriftRecordsSection from '../components/DriftRecordsSection'
import DriftRepoWizard from '../components/DriftRepoWizard'
import PageHeader from '../components/PageHeader'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import { queryKeys } from '../services/queryKeys'
import { useAuth } from '../contexts/AuthContext'

function apiErr(e: unknown): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Request failed.'
}

const PROVIDERS: { value: string; label: string; fields: { key: string; label: string; optional?: boolean; placeholder?: string }[] }[] = [
  {
    value: 'github_actions',
    label: 'GitHub Actions',
    fields: [
      { key: 'owner', label: 'Owner' },
      { key: 'repo', label: 'Repository' },
      { key: 'workflow_id', label: 'Workflow file or id', placeholder: 'tsm-drift.yml' },
      { key: 'ref', label: 'Default ref', optional: true, placeholder: 'main' },
    ],
  },
  {
    value: 'azure_devops',
    label: 'Azure DevOps',
    fields: [
      { key: 'organization', label: 'Organization' },
      { key: 'project', label: 'Project' },
      { key: 'pipeline_id', label: 'Pipeline id' },
      { key: 'ref', label: 'Default ref', optional: true, placeholder: 'refs/heads/main' },
    ],
  },
]

function statusChip(run: DriftRun, t: (k: string) => string) {
  if (run.status === 'failed') return <Chip size="small" color="error" label={t('pages.drift.statusFailed')} />
  if (run.status === 'dispatched' || run.status === 'running')
    return <Chip size="small" color="info" label={run.status} />
  // completed
  return run.drifted ? (
    <Chip size="small" color="warning" label={t('pages.drift.statusDriftDetected')} />
  ) : (
    <Chip size="small" color="success" label={t('pages.drift.statusNoDrift')} />
  )
}

export default function DriftPage() {
  const { t } = useTranslation()
  const { hasScope } = useAuth()
  const queryClient = useQueryClient()
  const canManage = hasScope('sources:manage')
  const canRun = hasScope('state:drift')

  const [addPipelineOpen, setAddPipelineOpen] = useState(false)
  const [ciSourcesOpen, setCiSourcesOpen] = useState(false)
  const [repoWizardOpen, setRepoWizardOpen] = useState(false)
  const [newRunOpen, setNewRunOpen] = useState(false)
  const [workflowOpen, setWorkflowOpen] = useState(false)
  const [selectedRun, setSelectedRun] = useState<DriftRun | null>(null)
  const [deletePipelineTarget, setDeletePipelineTarget] = useState<PipelineConnection | null>(null)

  const pipelinesQuery = useQuery({ queryKey: queryKeys.pipelines.list(), queryFn: api.listPipelines })

  // Source names label drift records (records key off source_id + state_key).
  const sourcesQuery = useQuery({ queryKey: queryKeys.sources.list(), queryFn: api.listSources })
  const sourceNames = Object.fromEntries((sourcesQuery.data ?? []).map((s) => [s.id, s.name]))

  const runsQuery = useQuery({
    queryKey: queryKeys.drift.runs(),
    queryFn: api.listDriftRuns,
    // Poll while any run is still in flight so results appear when the CI job calls back.
    refetchInterval: (q) =>
      (q.state.data ?? []).some((r) => r.status === 'dispatched' || r.status === 'running') ? 4000 : false,
  })

  const deletePipeline = useMutation({
    mutationFn: api.deletePipeline,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all }),
  })

  return (
    <Box>
      <PageHeader
        title={t('nav.drift')}
        description={t('help.pages.drift.body')}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={() => setWorkflowOpen(true)}>
              {t('actions.workflowTemplate')}
            </Button>
            {canRun && (
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                disabled={!pipelinesQuery.data?.length}
                onClick={() => setNewRunOpen(true)}
              >
                {t('actions.newDriftRun')}
              </Button>
            )}
          </Stack>
        }
      />

      {/* Drift records: the durable, acknowledgeable signal (runs are the mechanism) */}
      <DriftRecordsSection sourceNames={sourceNames} />

      {/* Pipeline connections */}
      <Stack direction="row" sx={{ mb: 1, alignItems: 'center' }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {t('pages.drift.pipelines')}
        </Typography>
        {canManage && (
          <>
            <Button size="small" startIcon={<AutoFixHighIcon />} onClick={() => setRepoWizardOpen(true)} sx={{ mr: 1 }}>
              {t('pages.drift.setUpRepo')}
            </Button>
            <Button size="small" startIcon={<HubIcon />} onClick={() => setCiSourcesOpen(true)} sx={{ mr: 1 }}>
              {t('pages.drift.ciSources')}
            </Button>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setAddPipelineOpen(true)}>
              {t('actions.addPipeline')}
            </Button>
          </>
        )}
      </Stack>
      {pipelinesQuery.isLoading && <CircularProgress size={20} />}
      {pipelinesQuery.data && pipelinesQuery.data.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No pipeline connections yet.
        </Alert>
      )}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', mb: 4 }}>
        {pipelinesQuery.data?.map((p) => (
          <Card key={p.id} variant="outlined">
            <CardContent>
              <Stack direction="row" sx={{ alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ flexGrow: 1, wordBreak: 'break-word' }}>
                  {p.name}
                </Typography>
                {canManage && (
                  <IconButton size="small" aria-label="delete" onClick={() => setDeletePipelineTarget(p)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
              <Chip size="small" label={p.provider} sx={{ mt: 0.5 }} />
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Drift runs */}
      <Typography variant="h6" sx={{ mb: 1 }}>
        {t('pages.drift.recentRuns')}
      </Typography>
      {runsQuery.isLoading && <TableSkeleton rows={4} columns={6} />}
      {runsQuery.data && runsQuery.data.length === 0 && <Alert severity="info">{t('pages.drift.noRuns')}</Alert>}
      {runsQuery.data && runsQuery.data.length > 0 && (
        <Card variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('common.ref')}</TableCell>
                <TableCell>{t('pages.drift.dir')}</TableCell>
                <TableCell align="right">+ / ~ / -</TableCell>
                <TableCell>{t('common.created')}</TableCell>
                <TableCell>{t('common.detail')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {runsQuery.data.map((r) => (
                <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedRun(r)}>
                  <TableCell>{statusChip(r, t)}</TableCell>
                  <TableCell>{r.repo_ref || '—'}</TableCell>
                  <TableCell>{r.working_dir || '.'}</TableCell>
                  <TableCell align="right">
                    {r.added != null ? `${r.added} / ${r.changed} / ${r.destroyed}` : '—'}
                  </TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell sx={{ maxWidth: 220, wordBreak: 'break-word' }}>{r.detail || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <AddPipelineDialog
        open={addPipelineOpen}
        onClose={() => setAddPipelineOpen(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all })
          setAddPipelineOpen(false)
        }}
      />
      <CISourcesDialog open={ciSourcesOpen} onClose={() => setCiSourcesOpen(false)} />
      <DriftRepoWizard
        open={repoWizardOpen}
        onClose={() => setRepoWizardOpen(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all })
          // The wizard may have dispatched a first run — surface it in the table.
          queryClient.invalidateQueries({ queryKey: queryKeys.drift.all })
        }}
      />
      <NewRunDialog
        open={newRunOpen}
        onClose={() => setNewRunOpen(false)}
        pipelines={pipelinesQuery.data ?? []}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.drift.all })
          setNewRunOpen(false)
        }}
      />
      <WorkflowDialog open={workflowOpen} onClose={() => setWorkflowOpen(false)} />
      <DriftRunDetailDialog run={selectedRun} onClose={() => setSelectedRun(null)} />

      <ConfirmDialog
        open={Boolean(deletePipelineTarget)}
        onClose={() => setDeletePipelineTarget(null)}
        title={t('pages.drift.deletePipelineTitle')}
        severity="error"
        description={
          <>
            <Trans i18nKey="pages.drift.deletePipelineBody" values={{ name: deletePipelineTarget?.name }} components={{ 1: <b /> }} />
          </>
        }
        confirmLabel={t('common.delete')}
        loading={deletePipeline.isPending}
        onConfirm={async () => {
          if (!deletePipelineTarget) return
          await deletePipeline.mutateAsync(deletePipelineTarget.id)
          setDeletePipelineTarget(null)
        }}
      />
    </Box>
  )
}

function actionColor(actions: string[]): 'success' | 'warning' | 'error' | 'default' {
  if (actions.includes('delete')) return 'error'
  if (actions.includes('create')) return 'success'
  if (actions.includes('update')) return 'warning'
  return 'default'
}

function DriftRunDetailDialog({ run, onClose }: { run: DriftRun | null; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <Dialog open={Boolean(run)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{t('pages.drift.runDetailTitle')}</DialogTitle>
      <DialogContent>
        {run && (
          <Stack spacing={2}>
            <Box>
              {statusChip(run, t)}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {run.repo_ref || t('pages.drift.defaultRef')} · {run.working_dir || '.'} ·{' '}
                {run.added != null
                  ? t('pages.drift.addedChangedDestroyed', {
                      added: run.added,
                      changed: run.changed,
                      destroyed: run.destroyed,
                    })
                  : t('pages.drift.pending')}
              </Typography>
              {run.detail && (
                <Typography variant="caption" color="text.secondary">
                  {run.detail}
                </Typography>
              )}
            </Box>
            {run.summary && run.summary.length > 0 ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('pages.drift.resource')}</TableCell>
                    <TableCell>{t('pages.drift.change')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {run.summary.map((c) => (
                    <TableRow key={c.address}>
                      <TableCell sx={{ wordBreak: 'break-all' }}>{c.address}</TableCell>
                      <TableCell>
                        {c.actions.map((a) => (
                          <Chip key={a} size="small" label={a} color={actionColor(c.actions)} sx={{ mr: 0.5 }} />
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography color="text.secondary">
                {run.status === 'completed' ? t('pages.drift.noResourceDrift') : t('pages.drift.noDetailsYet')}
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}

function AddPipelineDialog({
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

function CISourcesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [provider, setProvider] = useState('github_actions')
  const [organization, setOrganization] = useState('')
  const [project, setProject] = useState('')
  const [token, setToken] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<CISource | null>(null)

  const sourcesQuery = useQuery({ queryKey: queryKeys.ciSources.list(), queryFn: api.listCISources, enabled: open })

  const createMutation = useMutation({
    mutationFn: () =>
      api.createCISource({
        name,
        provider,
        organization,
        project: provider === 'azure_devops' ? project : undefined,
        token,
      }),
    onSuccess: () => {
      setName('')
      setOrganization('')
      setProject('')
      setToken('')
      queryClient.invalidateQueries({ queryKey: queryKeys.ciSources.all })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCISource(id),
    onSuccess: () => {
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.ciSources.all })
    },
  })

  const valid =
    Boolean(name.trim()) &&
    Boolean(organization.trim()) &&
    Boolean(token) &&
    (provider !== 'azure_devops' || Boolean(project.trim()))

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('pages.drift.ciSourcesTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t('pages.drift.ciSourcesDesc')}
          </Typography>

          {sourcesQuery.isLoading && <CircularProgress size={20} />}
          {(sourcesQuery.data ?? []).map((s) => (
            <Stack key={s.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="body2" sx={{ flexGrow: 1, wordBreak: 'break-word' }}>
                {s.name}
              </Typography>
              <Chip size="small" label={s.provider === 'azure_devops' ? 'Azure DevOps' : 'GitHub'} />
              <Chip
                size="small"
                variant="outlined"
                label={s.provider === 'azure_devops' ? `${s.organization}/${s.project ?? ''}` : s.organization}
              />
              <IconButton size="small" aria-label="delete CI source" onClick={() => setDeleteTarget(s)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          {sourcesQuery.data && sourcesQuery.data.length === 0 && (
            <Alert severity="info">{t('pages.drift.noCiSources')}</Alert>
          )}

          <Divider />

          <TextField label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField select label={t('common.provider')} value={provider} onChange={(e) => setProvider(e.target.value)} fullWidth>
            <MenuItem value="github_actions">GitHub Actions</MenuItem>
            <MenuItem value="azure_devops">Azure DevOps</MenuItem>
          </TextField>
          <TextField
            label={provider === 'azure_devops' ? t('pages.drift.organization') : t('pages.drift.ownerLabel')}
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            fullWidth
          />
          {provider === 'azure_devops' && (
            <TextField label={t('pages.drift.project')} value={project} onChange={(e) => setProject(e.target.value)} fullWidth />
          )}
          <TextField
            label={t('pages.drift.apiToken')}
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            helperText={t('pages.drift.sourceTokenHelp')}
            fullWidth
          />
          {createMutation.isError && <Alert severity="error">{apiErr(createMutation.error)}</Alert>}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              disabled={!valid || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {t('pages.drift.addCiSource')}
            </Button>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('pages.drift.deleteCiSourceTitle')}
        description={t('pages.drift.deleteCiSourceBody', { name: deleteTarget?.name })}
        confirmLabel={t('common.delete')}
        severity="error"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
      />
    </Dialog>
  )
}

function NewRunDialog({
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

  const mutation = useMutation({
    mutationFn: () =>
      api.createDriftRun({
        pipeline_connection_id: pipelineId,
        repo_ref: repoRef || undefined,
        working_dir: workingDir || undefined,
      }),
    onSuccess: () => {
      setRepoRef('')
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

function WorkflowDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const [provider, setProvider] = useState('github_actions')
  const q = useQuery({
    queryKey: ['drift', 'workflow', provider],
    queryFn: () => api.getDriftWorkflow(provider),
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
          sx={{ mb: 2, mt: 1, minWidth: 220 }}
        >
          {PROVIDERS.map((p) => (
            <MenuItem key={p.value} value={p.value}>
              {p.label}
            </MenuItem>
          ))}
        </TextField>
        <Divider sx={{ mb: 1 }} />
        {q.isLoading ? (
          <CircularProgress />
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
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}
