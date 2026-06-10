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
import HubIcon from '@mui/icons-material/Hub'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import DescriptionIcon from '@mui/icons-material/Description'
import { useTranslation } from 'react-i18next'
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

function statusChip(run: DriftRun) {
  if (run.status === 'failed') return <Chip size="small" color="error" label="failed" />
  if (run.status === 'dispatched' || run.status === 'running')
    return <Chip size="small" color="info" label={run.status} />
  // completed
  return run.drifted ? (
    <Chip size="small" color="warning" label="drift detected" />
  ) : (
    <Chip size="small" color="success" label="no drift" />
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
  const [newRunOpen, setNewRunOpen] = useState(false)
  const [workflowOpen, setWorkflowOpen] = useState(false)
  const [selectedRun, setSelectedRun] = useState<DriftRun | null>(null)
  const [deletePipelineTarget, setDeletePipelineTarget] = useState<PipelineConnection | null>(null)

  const pipelinesQuery = useQuery({ queryKey: queryKeys.pipelines.list(), queryFn: api.listPipelines })

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

      {/* Pipeline connections */}
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {t('pages.drift.pipelines')}
        </Typography>
        {canManage && (
          <>
            <Button size="small" startIcon={<HubIcon />} onClick={() => setCiSourcesOpen(true)} sx={{ mr: 1 }}>
              CI sources
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
              <Stack direction="row" alignItems="center">
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
        Recent runs
      </Typography>
      {runsQuery.isLoading && <TableSkeleton rows={4} columns={6} />}
      {runsQuery.data && runsQuery.data.length === 0 && <Alert severity="info">No drift runs yet.</Alert>}
      {runsQuery.data && runsQuery.data.length > 0 && (
        <Card variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Ref</TableCell>
                <TableCell>Dir</TableCell>
                <TableCell align="right">+ / ~ / -</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Detail</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {runsQuery.data.map((r) => (
                <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedRun(r)}>
                  <TableCell>{statusChip(r)}</TableCell>
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
        title="Delete pipeline connection"
        severity="error"
        description={
          <>
            Remove the pipeline connection <b>{deletePipelineTarget?.name}</b>? Drift and version-lab
            runs will no longer be able to dispatch through it.
          </>
        }
        confirmLabel="Delete"
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
  return (
    <Dialog open={Boolean(run)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Drift run</DialogTitle>
      <DialogContent>
        {run && (
          <Stack spacing={2}>
            <Box>
              {statusChip(run)}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {run.repo_ref || 'default ref'} · {run.working_dir || '.'} ·{' '}
                {run.added != null
                  ? `${run.added} added / ${run.changed} changed / ${run.destroyed} destroyed`
                  : 'pending'}
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
                    <TableCell>Resource</TableCell>
                    <TableCell>Change</TableCell>
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
                {run.status === 'completed'
                  ? 'No per-resource drift was reported.'
                  : 'No details yet — the run has not reported results.'}
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
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
      <DialogTitle>Add pipeline connection</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField
            select
            label="CI source"
            value={sourceId}
            onChange={(e) => {
              setSourceId(e.target.value)
              resetSelections()
            }}
            helperText="Pick a configured CI source to choose from its pipelines or workflows, or enter coordinates manually."
            fullWidth
          >
            <MenuItem value="">Manual entry</MenuItem>
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
                  label="Pipeline"
                  helperText={
                    adoPipelinesQuery.isError
                      ? apiErr(adoPipelinesQuery.error)
                      : 'Pick the pipeline created from the TSM workflow template (Workflow template button) — regular CI pipelines reject the dispatch parameters'
                  }
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
                    label="Repository"
                    helperText={reposQuery.isError ? apiErr(reposQuery.error) : 'Repositories visible to this source'}
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
                    label="Workflow"
                    helperText={
                      workflowsQuery.isError
                        ? apiErr(workflowsQuery.error)
                        : 'Pick the workflow created from the TSM workflow template (e.g. tsm-drift.yml) — other workflows reject the dispatch inputs'
                    }
                    error={workflowsQuery.isError}
                  />
                )}
              />
            </>
          )}

          {source && (
            <>
              <TextField
                label="Default ref (optional)"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder={source.provider === 'azure_devops' ? 'refs/heads/main' : 'main'}
                fullWidth
              />
              <Typography variant="caption" color="text.secondary">
                Credential inherited from the CI source — rotating its token covers this connection.
              </Typography>
            </>
          )}

          {!source && (
            <>
              <TextField
                select
                label="Provider"
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
              {def.fields.map((f) => (
                <TextField
                  key={f.key}
                  label={f.optional ? `${f.label} (optional)` : f.label}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  fullWidth
                />
              ))}
              <TextField
                label="API token / PAT"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                helperText="Stored encrypted at rest"
                fullWidth
              />
            </>
          )}
          {mutation.isError && <Alert severity="error">{apiErr(mutation.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function CISourcesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      <DialogTitle>CI sources</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Org-level CI credentials (an Azure DevOps org/project or a GitHub owner). Pipeline connections built from
            a source pick from its pipelines or workflows and share its token.
          </Typography>

          {sourcesQuery.isLoading && <CircularProgress size={20} />}
          {(sourcesQuery.data ?? []).map((s) => (
            <Stack key={s.id} direction="row" alignItems="center" spacing={1}>
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
            <Alert severity="info">No CI sources yet — add one below.</Alert>
          )}

          <Divider />

          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField select label="Provider" value={provider} onChange={(e) => setProvider(e.target.value)} fullWidth>
            <MenuItem value="github_actions">GitHub Actions</MenuItem>
            <MenuItem value="azure_devops">Azure DevOps</MenuItem>
          </TextField>
          <TextField
            label={provider === 'azure_devops' ? 'Organization' : 'Owner (org or user)'}
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            fullWidth
          />
          {provider === 'azure_devops' && (
            <TextField label="Project" value={project} onChange={(e) => setProject(e.target.value)} fullWidth />
          )}
          <TextField
            label="API token / PAT"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            helperText="Stored encrypted at rest; shared by connections built from this source"
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
              Add CI source
            </Button>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete CI source"
        description={`Delete "${deleteTarget?.name}"? Pipeline connections built from it will stop dispatching unless they carry their own token.`}
        confirmLabel="Delete"
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
      <DialogTitle>New drift run</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField select label="Pipeline" value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} fullWidth>
            {pipelines.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} ({p.provider})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Git ref (optional)"
            value={repoRef}
            onChange={(e) => setRepoRef(e.target.value)}
            placeholder="pipeline default branch"
            helperText="Leave empty to run from the pipeline's default branch; set only to plan a specific branch/ref"
            fullWidth
          />
          <TextField
            label="Working directory"
            value={workingDir}
            onChange={(e) => setWorkingDir(e.target.value)}
            fullWidth
          />
          {mutation.isError && <Alert severity="error">{apiErr(mutation.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!pipelineId || mutation.isPending} onClick={() => mutation.mutate()}>
          Dispatch
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function WorkflowDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [provider, setProvider] = useState('github_actions')
  const q = useQuery({
    queryKey: ['drift', 'workflow', provider],
    queryFn: () => api.getDriftWorkflow(provider),
    enabled: open,
  })

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Drift workflow template</DialogTitle>
      <DialogContent>
        <TextField
          select
          size="small"
          label="Provider"
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
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
