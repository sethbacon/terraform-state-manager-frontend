import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { api, type CIRepoRef, type CIServiceConnectionRef } from '../services/api'
import { queryKeys } from '../services/queryKeys'

// DriftRepoWizard walks a repo from "has terraform" to "drift-enabled":
// pick a CI source + repo, configure and copy the TSM workflow template,
// then (ADO) create the pipeline definition via the API — or (GitHub) detect
// the committed workflow — and create the pipeline connection automatically.
// Phase 1: the commit itself stays manual (no repo write scopes needed).

const STEPS = ['Source & repository', 'Workflow file', 'Create & connect']

function apiErr(e: unknown): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Request failed.'
}

/** Substitute wizard choices into the served workflow template text. */
export function customizeTemplate(template: string, provider: string, workingDir: string, scName: string): string {
  let out = template
  if (workingDir && workingDir !== '.') {
    out = out.replace('default: "."', `default: "${workingDir}"`)
  }
  if (provider === 'azure_devops' && scName) {
    out = out.replace(
      '  # Configure cloud credentials here (service connection / workload identity).',
      `  # Cloud credentials: this project has service connection "${scName}" — e.g. wrap the\n` +
        `  # plan step in AzureCLI@2 with azureSubscription: "${scName}", or map its ARM_* variables.`,
    )
  }
  return out
}

export default function DriftRepoWizard({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [sourceId, setSourceId] = useState('')
  const [repo, setRepo] = useState<CIRepoRef | null>(null)
  const [workingDir, setWorkingDir] = useState('.')
  const [serviceConnection, setServiceConnection] = useState<CIServiceConnectionRef | null>(null)
  const [pipelineName, setPipelineName] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [ghWorkflowMissing, setGhWorkflowMissing] = useState(false)

  const sourcesQuery = useQuery({ queryKey: queryKeys.ciSources.list(), queryFn: api.listCISources, enabled: open })
  const source = sourcesQuery.data?.find((s) => s.id === sourceId) ?? null
  const isADO = source?.provider === 'azure_devops'

  const preflightQuery = useQuery({
    queryKey: queryKeys.callbackPreflight(),
    queryFn: api.getCallbackPreflight,
    enabled: open,
  })

  const reposQuery = useQuery({
    queryKey: queryKeys.ciSources.repos(sourceId),
    queryFn: () => api.listCISourceRepos(sourceId),
    enabled: open && Boolean(source),
  })

  // Best-effort: requires the PAT to carry Service Connections (read);
  // a failure just leaves the picker empty (free-text still works).
  const scQuery = useQuery({
    queryKey: queryKeys.ciSources.serviceConnections(sourceId),
    queryFn: () => api.listCISourceServiceConnections(sourceId),
    enabled: open && isADO,
    retry: false,
  })

  const templateQuery = useQuery({
    queryKey: ['drift', 'workflow', source?.provider ?? ''],
    queryFn: () => api.getDriftWorkflow(source?.provider ?? 'github_actions'),
    enabled: open && Boolean(source),
  })

  const template = useMemo(
    () =>
      customizeTemplate(
        templateQuery.data ?? '',
        source?.provider ?? '',
        workingDir.trim() || '.',
        serviceConnection?.name ?? '',
      ),
    [templateQuery.data, source?.provider, workingDir, serviceConnection],
  )

  const fileName = isADO ? 'azure-pipelines-tsm-drift.yml' : '.github/workflows/tsm-drift.yml'

  const reset = () => {
    setStep(0)
    setSourceId('')
    setRepo(null)
    setWorkingDir('.')
    setServiceConnection(null)
    setPipelineName('')
    setCopied(false)
    setError(null)
    setDone(false)
    setGhWorkflowMissing(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  // ADO: create the pipeline definition, then the TSM connection.
  const adoCreate = useMutation({
    mutationFn: async () => {
      if (!source || !repo?.id) throw new Error('missing selection')
      const created = await api.createCISourcePipeline(source.id, repo.id, {
        name: pipelineName,
        yaml_path: '/' + fileName,
      })
      await api.createPipeline({
        name: pipelineName,
        provider: source.provider,
        config: {
          ci_source_id: source.id,
          organization: source.organization,
          project: source.project ?? '',
          pipeline_id: String(created.id),
        },
      })
    },
    onSuccess: () => {
      setDone(true)
      setError(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.ciSources.pipelines(sourceId) })
      onCreated()
    },
    onError: (e: unknown) => setError(apiErr(e)),
  })

  // GitHub: detect the committed workflow, then create the TSM connection.
  const ghConnect = useMutation({
    mutationFn: async () => {
      if (!source || !repo) throw new Error('missing selection')
      const workflows = await api.listCISourceWorkflows(source.id, repo.name)
      const wf = workflows.find((w) => w.file === 'tsm-drift.yml')
      if (!wf) {
        setGhWorkflowMissing(true)
        throw new Error('workflow not found')
      }
      setGhWorkflowMissing(false)
      await api.createPipeline({
        name: pipelineName,
        provider: source.provider,
        config: {
          ci_source_id: source.id,
          owner: source.organization,
          repo: repo.name,
          workflow_id: wf.file,
        },
      })
    },
    onSuccess: () => {
      setDone(true)
      setError(null)
      onCreated()
    },
    onError: (e: unknown) => {
      if (!ghWorkflowMissing) setError(apiErr(e))
    },
  })

  const creating = adoCreate.isPending || ghConnect.isPending
  const stepValid =
    step === 0 ? Boolean(source && repo) : step === 1 ? Boolean(templateQuery.data) : Boolean(pipelineName.trim())

  const next = () => {
    setError(null)
    if (step === 1 && !pipelineName) {
      setPipelineName(isADO ? `TSM Drift — ${repo?.name ?? ''}` : `${repo?.name ?? ''} · TSM Drift`)
    }
    setStep((s) => s + 1)
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      <DialogTitle>Set up drift for a repository</DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{ my: 2 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {preflightQuery.data?.likely_unreachable && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            The CI callback URL is <b>{preflightQuery.data.callback_base || 'not configured'}</b> — hosted CI agents
            cannot reach a local/private address, so runs would never report results. Use a self-hosted agent that can
            reach this host, or expose a tunnel and set <code>TSM_SERVER_CALLBACK_URL</code>.
          </Alert>
        )}

        {step === 0 && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Pick the CI source and the repository containing your Terraform. The wizard generates the TSM drift
              workflow for it, then creates the pipeline connection.
            </Typography>
            <TextField
              select
              label="CI source"
              value={sourceId}
              onChange={(e) => {
                setSourceId(e.target.value)
                setRepo(null)
                setServiceConnection(null)
              }}
              helperText={
                sourcesQuery.data && sourcesQuery.data.length === 0
                  ? 'No CI sources configured yet — add one via the CI sources button on the Drift page first.'
                  : 'The org-level credential used to browse and create.'
              }
              fullWidth
            >
              {(sourcesQuery.data ?? []).map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} ({s.provider === 'azure_devops' ? `${s.organization}/${s.project ?? ''}` : s.organization})
                </MenuItem>
              ))}
            </TextField>
            {source && (
              <Autocomplete
                options={reposQuery.data ?? []}
                loading={reposQuery.isLoading}
                getOptionLabel={(r) => r.name}
                value={repo}
                onChange={(_, v) => setRepo(v)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Repository"
                    helperText={reposQuery.isError ? apiErr(reposQuery.error) : 'Repository containing the Terraform'}
                    error={reposQuery.isError}
                  />
                )}
              />
            )}
          </Stack>
        )}

        {step === 1 && source && (
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Terraform working directory"
                value={workingDir}
                onChange={(e) => setWorkingDir(e.target.value)}
                helperText="Relative to the repo root"
                sx={{ flex: 1 }}
              />
              {isADO && (
                <Autocomplete
                  options={scQuery.data ?? []}
                  loading={scQuery.isLoading}
                  getOptionLabel={(sc) => sc.name}
                  value={serviceConnection}
                  onChange={(_, v) => setServiceConnection(v)}
                  sx={{ flex: 1 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Service connection (optional)"
                      helperText={
                        scQuery.isError
                          ? 'Could not list service connections (PAT may lack the scope) — referenced by name in the YAML guidance only.'
                          : 'Named in the generated YAML credential guidance'
                      }
                    />
                  )}
                />
              )}
            </Stack>
            <Box>
              <Stack direction="row" alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                  Commit this file to <code>{fileName}</code> on the default branch
                  {repo?.default_branch ? ` (${repo.default_branch.replace('refs/heads/', '')})` : ''}
                </Typography>
                <Button
                  size="small"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => {
                    void navigator.clipboard.writeText(template)
                    setCopied(true)
                  }}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </Stack>
              <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 320, overflow: 'auto' }}>
                {templateQuery.isLoading ? (
                  <CircularProgress size={20} />
                ) : (
                  <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre' }}>{template}</pre>
                )}
              </Paper>
            </Box>
            <Alert severity="info">
              The pipeline needs cloud credentials to run terraform — wire a{' '}
              {isADO ? 'service connection / workload identity' : 'cloud OIDC role or repo secrets'} where the template
              indicates. Credentials stay in CI, never in TSM.
            </Alert>
          </Stack>
        )}

        {step === 2 && source && (
          <Stack spacing={2}>
            <TextField
              label={isADO ? 'Pipeline name' : 'Connection name'}
              value={pipelineName}
              onChange={(e) => setPipelineName(e.target.value)}
              fullWidth
            />
            {isADO ? (
              <Typography variant="body2" color="text.secondary">
                Once the file is committed, TSM creates the Azure DevOps pipeline definition pointing at{' '}
                <code>/{fileName}</code> in <b>{repo?.name}</b> and the pipeline connection in one step. Note: the
                first run may require a one-time resource authorization in Azure DevOps (service connection access).
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Once the file is merged to the default branch of <b>{repo?.name}</b>, GitHub registers the workflow
                automatically — TSM then detects <code>tsm-drift.yml</code> and creates the connection.
              </Typography>
            )}
            {ghWorkflowMissing && (
              <Alert severity="warning">
                Workflow <code>tsm-drift.yml</code> not found in {repo?.name} yet. Commit it to the default branch,
                give GitHub a few seconds, and check again.
              </Alert>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            {done && (
              <Alert severity="success">
                Pipeline connection <b>{pipelineName}</b> created — you can dispatch drift runs against it now.
              </Alert>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{done ? 'Close' : 'Cancel'}</Button>
        {step > 0 && !done && (
          <Button onClick={() => setStep((s) => s - 1)} disabled={creating}>
            Back
          </Button>
        )}
        {step < 2 && (
          <Button variant="contained" onClick={next} disabled={!stepValid}>
            Next
          </Button>
        )}
        {step === 2 && !done && (
          <Button
            variant="contained"
            disabled={!stepValid || creating}
            startIcon={creating ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={() => (isADO ? adoCreate.mutate() : ghConnect.mutate())}
          >
            {isADO ? 'Create pipeline & connection' : ghWorkflowMissing ? 'Check again' : 'Detect & connect'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
