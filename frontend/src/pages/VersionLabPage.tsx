import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Autocomplete,
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
import PageHeader from '../components/PageHeader'
import PageTitleIcon from '@mui/icons-material/Science'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import { api, type HealthRun, type PipelineConnection } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import { useAuth } from '../contexts/AuthContext'
import { useSuite } from '../hooks/useSuite'

function apiErr(e: unknown): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Request failed.'
}

// hostOf extracts the bare host (incl. any non-default port) from a URL,
// returning '' on a malformed value. Used to suggest the registry host from the
// connected sibling's public URL.
function hostOf(rawURL: string): string {
  try {
    return new URL(rawURL).host
  } catch {
    return ''
  }
}

const PROVIDER_LABELS = [
  { value: 'github_actions', label: 'GitHub Actions' },
  { value: 'azure_devops', label: 'Azure DevOps' },
]

const PAGE_SIZE = 25

function statusChip(run: HealthRun, t: (k: string) => string) {
  if (run.status === 'failed') return <Chip size="small" color="error" label={t('pages.versionLab.statusDispatchFailed')} />
  if (run.status === 'dispatched' || run.status === 'running')
    return <Chip size="small" color="info" label={run.status} />
  return run.success ? (
    <Chip size="small" color="success" label={t('pages.versionLab.statusHealthy')} />
  ) : (
    <Chip size="small" color="warning" label={t('pages.versionLab.statusUnhealthy')} />
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
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('')

  const pipelinesQuery = useQuery({ queryKey: queryKeys.pipelines.list(), queryFn: api.listPipelines })
  const runsQuery = useQuery({
    queryKey: queryKeys.health.runs(page, status),
    queryFn: () => api.listHealthRuns({ limit: PAGE_SIZE, offset: page * PAGE_SIZE, status: status || undefined }),
    refetchInterval: (q) =>
      (q.state.data?.runs ?? []).some((r) => r.status === 'dispatched' || r.status === 'running') ? 4000 : false,
  })
  const runs = runsQuery.data?.runs ?? []
  const total = runsQuery.data?.total ?? 0

  return (
    <Box>
      <PageHeader
        icon={<PageTitleIcon />}
        title={t('nav.versionLab')}
        description={t('help.pages.versionLab.body')}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={() => setWorkflowOpen(true)}>
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
        }
      />

      {pipelinesQuery.data && pipelinesQuery.data.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('pages.versionLab.noPipelines')}
        </Alert>
      )}

      <Stack direction="row" sx={{ mb: 1, alignItems: 'center' }} spacing={1}>
        <TextField
          select
          size="small"
          label={t('common.status')}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(0)
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          {['dispatched', 'running', 'completed', 'failed'].map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {runsQuery.isLoading && <TableSkeleton rows={4} columns={6} />}
      {!runsQuery.isLoading && total === 0 && <Alert severity="info">{t('pages.versionLab.noRuns')}</Alert>}
      {!runsQuery.isLoading && total > 0 && (
        <>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('pages.versionLab.terraform')}</TableCell>
                <TableCell>{t('pages.versionLab.checks')}</TableCell>
                <TableCell>{t('common.ref')}</TableCell>
                <TableCell>{t('common.created')}</TableCell>
                <TableCell>{t('common.detail')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{statusChip(r, t)}</TableCell>
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
          <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            <Typography variant="body2" color="text.secondary">
              {t('pages.versionLab.showing', {
                from: page * PAGE_SIZE + 1,
                to: Math.min((page + 1) * PAGE_SIZE, total),
                total,
              })}
            </Typography>
            <Button size="small" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              {t('common.previous')}
            </Button>
            <Button size="small" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>
              {t('common.next')}
            </Button>
          </Stack>
        </>
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
  const { t } = useTranslation()
  const [pipelineId, setPipelineId] = useState('')
  const [repoRef, setRepoRef] = useState('')
  const [workingDir, setWorkingDir] = useState('.')
  const [tfVersion, setTfVersion] = useState('')
  const [registryHost, setRegistryHost] = useState('')
  const [providers, setProviders] = useState<{ name: string; version: string }[]>([])
  const [modules, setModules] = useState<{ name: string; version: string }[]>([])

  // Auto-fill the registry host from the connected sibling registry (suite mode):
  // its public/web host — the same identity that appears in module source
  // addresses and that composes the provider mirror URL. Only fills an untouched
  // (empty) field, so it never clobbers a manual entry or re-fills after a clear.
  const { sibling, active: suiteActive } = useSuite()
  const suggestedHost = suiteActive && sibling?.publicUrl ? hostOf(sibling.publicUrl) : ''
  useEffect(() => {
    if (suggestedHost) setRegistryHost((prev) => prev || suggestedHost)
  }, [suggestedHost])

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
      <DialogTitle>{t('pages.versionLab.newRunTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Autocomplete
            options={pipelines}
            getOptionLabel={(p) => `${p.name} (${p.provider})`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={pipelines.find((p) => p.id === pipelineId) ?? null}
            onChange={(_, v) => setPipelineId(v?.id ?? '')}
            renderInput={(params) => <TextField {...params} label={t('pages.versionLab.pipeline')} fullWidth />}
          />
          <TextField label={t('pages.versionLab.gitRef')} value={repoRef} onChange={(e) => setRepoRef(e.target.value)} placeholder="main" fullWidth />
          <TextField label={t('pages.versionLab.workingDir')} value={workingDir} onChange={(e) => setWorkingDir(e.target.value)} fullWidth />
          <TextField
            label={t('pages.versionLab.terraformVersion')}
            value={tfVersion}
            onChange={(e) => setTfVersion(e.target.value)}
            placeholder="1.9.5 (blank = latest)"
            fullWidth
          />
          <TextField
            label={t('pages.versionLab.registryHost')}
            value={registryHost}
            onChange={(e) => setRegistryHost(e.target.value)}
            placeholder="registry.example.com"
            helperText={t('pages.versionLab.registryHostHelp')}
            fullWidth
          />

          <Box>
            <Stack direction="row" sx={{ mb: 1, alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                {t('pages.versionLab.providerVersions')}
              </Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setProviders((p) => [...p, { name: '', version: '' }])}>
                {t('common.add')}
              </Button>
            </Stack>
            <Stack spacing={1}>
              {providers.map((p, i) => (
                <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
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
            <Stack direction="row" sx={{ mb: 1, alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                {t('pages.versionLab.moduleVersions')}
              </Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setModules((m) => [...m, { name: '', version: '' }])}>
                {t('common.add')}
              </Button>
            </Stack>
            <Stack spacing={1}>
              {modules.map((m, i) => (
                <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
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
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" disabled={!pipelineId || mutation.isPending} onClick={() => mutation.mutate()}>
          {t('pages.versionLab.dispatch')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function WorkflowDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const [provider, setProvider] = useState('github_actions')
  const [variant, setVariant] = useState('default')
  const q = useQuery({
    queryKey: ['health', 'workflow', provider, variant],
    queryFn: () => api.getHealthWorkflow(provider, variant),
    enabled: open,
  })

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{t('pages.versionLab.workflowTitle')}</DialogTitle>
      <DialogContent>
        <TextField
          select
          size="small"
          label={t('common.provider')}
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          sx={{ mb: 2, mt: 1, mr: 2, minWidth: 220 }}
        >
          {PROVIDER_LABELS.map((p) => (
            <MenuItem key={p.value} value={p.value}>
              {p.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('common.templateStyle')}
          value={variant}
          onChange={(e) => setVariant(e.target.value)}
          sx={{ mb: 2, mt: 1, minWidth: 260 }}
        >
          <MenuItem value="default">{t('common.templateBuiltin')}</MenuItem>
          <MenuItem value="suite">{t('common.templateSuite')}</MenuItem>
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
