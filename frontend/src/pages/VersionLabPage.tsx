import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
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
import ScienceIcon from '@mui/icons-material/Science'
import DescriptionIcon from '@mui/icons-material/Description'
import { useTranslation } from 'react-i18next'
import { api, type HealthRun, type PipelineConnection } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import { useAuth } from '../contexts/AuthContext'

function apiErr(e: unknown): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Request failed.'
}

const PROVIDER_LABELS = [
  { value: 'github_actions', label: 'GitHub Actions' },
  { value: 'azure_devops', label: 'Azure DevOps' },
]

function statusChip(run: HealthRun) {
  if (run.status === 'failed') return <Chip size="small" color="error" label="dispatch failed" />
  if (run.status === 'dispatched' || run.status === 'running')
    return <Chip size="small" color="info" label={run.status} />
  return run.success ? (
    <Chip size="small" color="success" label="healthy" />
  ) : (
    <Chip size="small" color="warning" label="unhealthy" />
  )
}

function okText(label: string, v: boolean | null) {
  if (v == null) return null
  return (
    <Typography component="span" variant="caption" sx={{ color: v ? 'success.main' : 'error.main', mr: 1 }}>
      {label} {v ? '✓' : '✗'}
    </Typography>
  )
}

export default function VersionLabPage() {
  const { t } = useTranslation()
  const { hasScope } = useAuth()
  const queryClient = useQueryClient()
  const canRun = hasScope('state:execute')

  const [newRunOpen, setNewRunOpen] = useState(false)
  const [workflowOpen, setWorkflowOpen] = useState(false)

  const pipelinesQuery = useQuery({ queryKey: queryKeys.pipelines.list(), queryFn: api.listPipelines })
  const runsQuery = useQuery({
    queryKey: queryKeys.health.runs(),
    queryFn: api.listHealthRuns,
    refetchInterval: (q) =>
      (q.state.data ?? []).some((r) => r.status === 'dispatched' || r.status === 'running') ? 4000 : false,
  })

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {t('nav.versionLab')}
        </Typography>
        <Button variant="outlined" startIcon={<DescriptionIcon />} sx={{ mr: 1 }} onClick={() => setWorkflowOpen(true)}>
          {t('actions.workflowTemplate')}
        </Button>
        {canRun && (
          <Button
            variant="contained"
            startIcon={<ScienceIcon />}
            disabled={!pipelinesQuery.data?.length}
            onClick={() => setNewRunOpen(true)}
          >
            {t('actions.newHealthRun')}
          </Button>
        )}
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        {t('help.pages.versionLab.body')}
      </Typography>

      {pipelinesQuery.data && pipelinesQuery.data.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('pages.versionLab.noPipelines')}
        </Alert>
      )}

      {runsQuery.isLoading && <CircularProgress size={20} />}
      {runsQuery.data && runsQuery.data.length === 0 && <Alert severity="info">{t('pages.versionLab.noRuns')}</Alert>}
      {runsQuery.data && runsQuery.data.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Terraform</TableCell>
              <TableCell>Checks</TableCell>
              <TableCell>Ref</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Detail</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {runsQuery.data.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{statusChip(r)}</TableCell>
                <TableCell>{r.terraform_version || 'latest'}</TableCell>
                <TableCell>
                  {okText('init', r.init_ok)}
                  {okText('plan', r.plan_ok)}
                </TableCell>
                <TableCell>{r.repo_ref || '—'}</TableCell>
                <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                <TableCell sx={{ maxWidth: 220, wordBreak: 'break-word' }}>{r.detail || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <NewHealthRunDialog
        open={newRunOpen}
        onClose={() => setNewRunOpen(false)}
        pipelines={pipelinesQuery.data ?? []}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.health.all })
          setNewRunOpen(false)
        }}
      />
      <WorkflowDialog open={workflowOpen} onClose={() => setWorkflowOpen(false)} />
    </Box>
  )
}

function NewHealthRunDialog({
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
  const [tfVersion, setTfVersion] = useState('')
  const [registryHost, setRegistryHost] = useState('')
  const [providers, setProviders] = useState<{ name: string; version: string }[]>([])
  const [modules, setModules] = useState<{ name: string; version: string }[]>([])

  const toMap = (rows: { name: string; version: string }[]) => {
    const m: Record<string, string> = {}
    for (const r of rows) {
      if (r.name.trim() && r.version.trim()) m[r.name.trim()] = r.version.trim()
    }
    return m
  }

  const mutation = useMutation({
    mutationFn: () => {
      const provider_versions = toMap(providers)
      const module_versions = toMap(modules)
      return api.createHealthRun({
        pipeline_connection_id: pipelineId,
        repo_ref: repoRef || undefined,
        working_dir: workingDir || undefined,
        terraform_version: tfVersion || undefined,
        registry_host: registryHost || undefined,
        provider_versions: Object.keys(provider_versions).length ? provider_versions : undefined,
        module_versions: Object.keys(module_versions).length ? module_versions : undefined,
      })
    },
    onSuccess: () => {
      setProviders([])
      setModules([])
      onCreated()
    },
  })

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New version-health run</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField select label="Pipeline" value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} fullWidth>
            {pipelines.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} ({p.provider})
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Git ref" value={repoRef} onChange={(e) => setRepoRef(e.target.value)} placeholder="main" fullWidth />
          <TextField label="Working directory" value={workingDir} onChange={(e) => setWorkingDir(e.target.value)} fullWidth />
          <TextField
            label="Terraform version"
            value={tfVersion}
            onChange={(e) => setTfVersion(e.target.value)}
            placeholder="1.9.5 (blank = latest)"
            fullWidth
          />
          <TextField
            label="Registry mirror host (optional)"
            value={registryHost}
            onChange={(e) => setRegistryHost(e.target.value)}
            placeholder="registry.example.com"
            helperText="Pulls providers from this registry network mirror"
            fullWidth
          />

          <Box>
            <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                Provider versions (optional)
              </Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setProviders((p) => [...p, { name: '', version: '' }])}>
                Add
              </Button>
            </Stack>
            <Stack spacing={1}>
              {providers.map((p, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="center">
                  <TextField
                    size="small"
                    placeholder="provider (e.g. aws)"
                    value={p.name}
                    onChange={(e) =>
                      setProviders((arr) => arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                    }
                  />
                  <TextField
                    size="small"
                    placeholder="version (e.g. 5.40.0)"
                    value={p.version}
                    onChange={(e) =>
                      setProviders((arr) => arr.map((x, j) => (j === i ? { ...x, version: e.target.value } : x)))
                    }
                  />
                  <IconButton size="small" onClick={() => setProviders((arr) => arr.filter((_, j) => j !== i))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Box>
            <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                Module versions (optional)
              </Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setModules((m) => [...m, { name: '', version: '' }])}>
                Add
              </Button>
            </Stack>
            <Stack spacing={1}>
              {modules.map((m, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="center">
                  <TextField
                    size="small"
                    placeholder="module (e.g. vpc)"
                    value={m.name}
                    onChange={(e) => setModules((arr) => arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  />
                  <TextField
                    size="small"
                    placeholder="version (e.g. 5.1.0)"
                    value={m.version}
                    onChange={(e) =>
                      setModules((arr) => arr.map((x, j) => (j === i ? { ...x, version: e.target.value } : x)))
                    }
                  />
                  <IconButton size="small" onClick={() => setModules((arr) => arr.filter((_, j) => j !== i))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          </Box>

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
    queryKey: ['health', 'workflow', provider],
    queryFn: () => api.getHealthWorkflow(provider),
    enabled: open,
  })

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Version-health workflow template</DialogTitle>
      <DialogContent>
        <TextField
          select
          size="small"
          label="Provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          sx={{ mb: 2, mt: 1, minWidth: 220 }}
        >
          {PROVIDER_LABELS.map((p) => (
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
