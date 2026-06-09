import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
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
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import DescriptionIcon from '@mui/icons-material/Description'
import { api, type DriftRun, type PipelineConnection } from '../services/api'
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
  const { hasScope } = useAuth()
  const queryClient = useQueryClient()
  const canManage = hasScope('sources:manage')
  const canRun = hasScope('state:drift')

  const [addPipelineOpen, setAddPipelineOpen] = useState(false)
  const [newRunOpen, setNewRunOpen] = useState(false)
  const [workflowOpen, setWorkflowOpen] = useState(false)
  const [selectedRun, setSelectedRun] = useState<DriftRun | null>(null)

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
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Drift
        </Typography>
        <Button variant="outlined" startIcon={<DescriptionIcon />} sx={{ mr: 1 }} onClick={() => setWorkflowOpen(true)}>
          Workflow template
        </Button>
        {canRun && (
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            disabled={!pipelinesQuery.data?.length}
            onClick={() => setNewRunOpen(true)}
          >
            New drift run
          </Button>
        )}
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        Drift is detected by dispatching <code>terraform plan</code> to your own CI (GitHub Actions or Azure DevOps),
        which runs against live infrastructure and posts the result back. No Terraform binary or cloud credentials
        live in this app — add the workflow template to your repo, register a pipeline connection, then trigger runs.
      </Typography>

      {/* Pipeline connections */}
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Pipeline connections
        </Typography>
        {canManage && (
          <Button size="small" startIcon={<AddIcon />} onClick={() => setAddPipelineOpen(true)}>
            Add pipeline
          </Button>
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
                  <IconButton size="small" aria-label="delete" onClick={() => deletePipeline.mutate(p.id)}>
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
      {runsQuery.isLoading && <CircularProgress size={20} />}
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
  const [provider, setProvider] = useState('github_actions')
  const [values, setValues] = useState<Record<string, string>>({})
  const [token, setToken] = useState('')

  const def = PROVIDERS.find((p) => p.value === provider) ?? PROVIDERS[0]

  const mutation = useMutation({
    mutationFn: () => {
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
      onCreated()
    },
  })

  const valid = Boolean(name) && def.fields.filter((f) => !f.optional).every((f) => values[f.key]?.trim())

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add pipeline connection</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
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
            label="Git ref"
            value={repoRef}
            onChange={(e) => setRepoRef(e.target.value)}
            placeholder="main"
            helperText="Branch/ref to run the plan from"
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
