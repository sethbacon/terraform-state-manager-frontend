import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Link,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { Trans, useTranslation } from 'react-i18next'
import { api, type CIRepoRef, type CIServiceConnectionRef, type CIWorkflowSetupResult } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import { extractApiError as apiErr } from '../utils/apiError'
import { isSafeExternalUrl } from '../utils/externalUrl'

// DriftRepoWizard walks a repo from "has terraform" to "drift-enabled":
// pick a CI source + repo, configure and copy the TSM workflow template,
// then (ADO) create the pipeline definition via the API — or (GitHub) detect
// the committed workflow — and create the pipeline connection automatically.
// Phase 1: the commit itself stays manual (no repo write scopes needed).

const STEP_KEYS = ['source', 'workflow', 'connect'] as const

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
  const { t } = useTranslation()
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
  const [setup, setSetup] = useState<CIWorkflowSetupResult | null>(null)
  const [includeVersionLab, setIncludeVersionLab] = useState(false)
  const [dispatchFirstRun, setDispatchFirstRun] = useState(true)
  const [firstRun, setFirstRun] = useState<'dispatched' | string | null>(null)
  // Operator edits to the served drift template (null = use the auto-customized one).
  const [editedDrift, setEditedDrift] = useState<string | null>(null)

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
    queryKey: queryKeys.drift.workflow(source?.provider ?? ''),
    queryFn: () => api.getDriftWorkflow(source?.provider ?? 'github_actions'),
    enabled: open && Boolean(source),
  })
  const healthTemplateQuery = useQuery({
    queryKey: queryKeys.health.workflow(source?.provider ?? ''),
    queryFn: () => api.getHealthWorkflow(source?.provider ?? 'github_actions'),
    enabled: open && Boolean(source) && includeVersionLab,
  })

  // Phase 2: commit the workflow via branch + PR through the provider API.
  const setupMutation = useMutation({
    mutationFn: () => {
      const files: { kind: 'drift' | 'versionlab'; content: string }[] = [{ kind: 'drift', content: effectiveTemplate }]
      if (includeVersionLab) files.push({ kind: 'versionlab', content: healthTemplate })
      return api.setupCISourceWorkflow(sourceId, (isADO ? repo?.id : repo?.name) ?? '', files)
    },
    onSuccess: (res) => {
      setSetup(res)
      setError(null)
    },
    onError: (e: unknown) => setError(apiErr(e)),
  })

  // Poll the PR until it merges (or closes); 5s while open.
  const prQuery = useQuery({
    queryKey: queryKeys.ciSources.pr(sourceId, setup?.pr_id ?? 0),
    queryFn: () => api.getCISourcePRState(sourceId, (isADO ? repo?.id : repo?.name) ?? '', setup?.pr_id ?? 0),
    enabled: open && Boolean(setup?.pr_id),
    refetchInterval: (q) => (q.state.data?.state === 'open' ? 5000 : false),
  })
  const prState = prQuery.data?.state

  // ADO idempotency: offer reuse when a pipeline with the chosen name exists.
  const adoExistingQuery = useQuery({
    queryKey: queryKeys.ciSources.pipelines(sourceId),
    queryFn: () => api.listCISourcePipelines(sourceId),
    enabled: open && isADO && step === 2,
  })
  const existingPipeline = isADO
    ? (adoExistingQuery.data ?? []).find((p) => p.name === pipelineName.trim())
    : undefined

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

  // What is copied/committed: the operator's edit if they made one, else the
  // auto-customized template. This is the "edit the template before commit" path.
  const effectiveTemplate = editedDrift ?? template

  const healthTemplate = useMemo(
    () =>
      customizeTemplate(
        healthTemplateQuery.data ?? '',
        source?.provider ?? '',
        workingDir.trim() || '.',
        serviceConnection?.name ?? '',
      ),
    [healthTemplateQuery.data, source?.provider, workingDir, serviceConnection],
  )

  const fileName = isADO ? 'azure-pipelines-tsm-drift.yml' : '.github/workflows/tsm-drift.yml'
  const healthFileName = isADO ? 'azure-pipelines-tsm-health.yml' : '.github/workflows/tsm-health.yml'

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
    setSetup(null)
    setIncludeVersionLab(false)
    setDispatchFirstRun(true)
    setFirstRun(null)
    setEditedDrift(null)
  }

  const close = () => {
    reset()
    onClose()
  }

  // Optionally dispatch a first drift run against the new connection.
  const maybeFirstRun = async (connectionId: string) => {
    if (!dispatchFirstRun) return
    try {
      await api.createDriftRun({ pipeline_connection_id: connectionId })
      setFirstRun('dispatched')
    } catch (e) {
      setFirstRun(apiErr(e))
    }
  }

  // ADO: create the pipeline definition, then the TSM connection.
  const adoCreate = useMutation({
    mutationFn: async () => {
      if (!source || !repo?.id) throw new Error('missing selection')
      const created = await api.createCISourcePipeline(source.id, repo.id, {
        name: pipelineName,
        yaml_path: '/' + fileName,
      })
      const conn = await api.createPipeline({
        name: pipelineName,
        provider: source.provider,
        config: {
          ci_source_id: source.id,
          organization: source.organization,
          project: source.project ?? '',
          pipeline_id: String(created.id),
        },
      })
      if (includeVersionLab) {
        const vlName = `${pipelineName} · ${t('pages.drift.wizard.versionLabSuffix')}`
        const vl = await api.createCISourcePipeline(source.id, repo.id, {
          name: vlName,
          yaml_path: '/' + healthFileName,
        })
        await api.createPipeline({
          name: vlName,
          provider: source.provider,
          config: {
            ci_source_id: source.id,
            organization: source.organization,
            project: source.project ?? '',
            pipeline_id: String(vl.id),
          },
        })
      }
      await maybeFirstRun(conn.id)
    },
    onSuccess: () => {
      setDone(true)
      setError(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.ciSources.pipelines(sourceId) })
      onCreated()
    },
    onError: (e: unknown) => setError(apiErr(e)),
  })

  // ADO idempotent path: connect to an already-existing pipeline definition.
  const adoUseExisting = useMutation({
    mutationFn: async () => {
      if (!source || !existingPipeline) throw new Error('missing selection')
      const conn = await api.createPipeline({
        name: pipelineName,
        provider: source.provider,
        config: {
          ci_source_id: source.id,
          organization: source.organization,
          project: source.project ?? '',
          pipeline_id: String(existingPipeline.id),
        },
      })
      await maybeFirstRun(conn.id)
    },
    onSuccess: () => {
      setDone(true)
      setError(null)
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
      const conn = await api.createPipeline({
        name: pipelineName,
        provider: source.provider,
        config: {
          ci_source_id: source.id,
          owner: source.organization,
          repo: repo.name,
          workflow_id: wf.file,
        },
      })
      if (includeVersionLab) {
        const health = workflows.find((w) => w.file === 'tsm-health.yml')
        if (health) {
          await api.createPipeline({
            name: `${pipelineName} · ${t('pages.drift.wizard.versionLabSuffix')}`,
            provider: source.provider,
            config: {
              ci_source_id: source.id,
              owner: source.organization,
              repo: repo.name,
              workflow_id: health.file,
            },
          })
        }
      }
      await maybeFirstRun(conn.id)
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

  const creating = adoCreate.isPending || ghConnect.isPending || adoUseExisting.isPending
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
      <DialogTitle>{t('pages.drift.wizard.title')}</DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{ my: 2 }}>
          {STEP_KEYS.map((k) => (
            <Step key={k}>
              <StepLabel>{t(`pages.drift.wizard.steps.${k}`)}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {preflightQuery.data?.likely_unreachable && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Trans
              i18nKey="pages.drift.wizard.preflight"
              values={{ base: preflightQuery.data.callback_base || t('pages.drift.wizard.preflightUnset') }}
              components={{ 1: <b />, 3: <code /> }}
            />
          </Alert>
        )}

        {step === 0 && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {t('pages.drift.wizard.intro')}
            </Typography>
            <TextField
              select
              label={t('pages.drift.ciSource')}
              value={sourceId}
              onChange={(e) => {
                setSourceId(e.target.value)
                setRepo(null)
                setServiceConnection(null)
              }}
              helperText={
                sourcesQuery.data && sourcesQuery.data.length === 0
                  ? t('pages.drift.wizard.noSourcesHelp')
                  : t('pages.drift.wizard.sourceHelp')
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
                    label={t('pages.drift.repository')}
                    helperText={reposQuery.isError ? apiErr(reposQuery.error) : t('pages.drift.wizard.repoHelp')}
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
                label={t('pages.drift.wizard.workingDir')}
                value={workingDir}
                onChange={(e) => setWorkingDir(e.target.value)}
                helperText={t('pages.drift.wizard.workingDirHelp')}
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
                      label={t('pages.drift.wizard.serviceConnection')}
                      helperText={
                        scQuery.isError
                          ? t('pages.drift.wizard.serviceConnectionErr')
                          : t('pages.drift.wizard.serviceConnectionHelp')
                      }
                    />
                  )}
                />
              )}
            </Stack>
            <FormControlLabel
              control={
                <Checkbox checked={includeVersionLab} onChange={(e) => setIncludeVersionLab(e.target.checked)} />
              }
              label={t('pages.drift.wizard.includeVersionLab')}
            />
            {includeVersionLab && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                {t('pages.drift.wizard.includeVersionLabHelp')}
              </Typography>
            )}
            <Box>
              <Stack direction="row" sx={{ mb: 0.5, alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                  <Trans
                    i18nKey="pages.drift.wizard.commitHeading"
                    values={{
                      file: fileName,
                      branch: repo?.default_branch ? ` (${repo.default_branch.replace('refs/heads/', '')})` : '',
                    }}
                    components={{ 1: <code /> }}
                  />
                </Typography>
                <Button
                  size="small"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => {
                    void navigator.clipboard.writeText(effectiveTemplate)
                    setCopied(true)
                  }}
                >
                  {copied ? t('pages.drift.wizard.copied') : t('pages.drift.wizard.copy')}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ ml: 1 }}
                  disabled={!templateQuery.data || setupMutation.isPending || Boolean(setup)}
                  startIcon={setupMutation.isPending ? <CircularProgress size={14} /> : undefined}
                  onClick={() => setupMutation.mutate()}
                >
                  {t('pages.drift.wizard.commitViaPR')}
                </Button>
              </Stack>
              {templateQuery.isLoading ? (
                <CircularProgress size={20} />
              ) : (
                <TextField
                  value={effectiveTemplate}
                  onChange={(e) => setEditedDrift(e.target.value)}
                  multiline
                  minRows={8}
                  maxRows={18}
                  fullWidth
                  disabled={Boolean(setup)}
                  sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre' } }}
                />
              )}
            </Box>
            {includeVersionLab && (
              <Box>
                <Stack direction="row" sx={{ mb: 0.5, alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                    {t('pages.drift.wizard.versionLabFile')} — <code>{healthFileName}</code>
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => void navigator.clipboard.writeText(healthTemplate)}
                  >
                    {t('pages.drift.wizard.copy')}
                  </Button>
                </Stack>
                <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 240, overflow: 'auto' }}>
                  {healthTemplateQuery.isLoading ? (
                    <CircularProgress size={20} />
                  ) : (
                    <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre' }}>{healthTemplate}</pre>
                  )}
                </Paper>
              </Box>
            )}
            {setup?.status === 'exists' && (
              <Alert severity="success">
                {t('pages.drift.wizard.setupExists')}
              </Alert>
            )}
            {setup?.status === 'pr_created' && (
              <Alert severity={prState === 'merged' ? 'success' : prState === 'closed' ? 'warning' : 'info'}>
                {prState === 'merged' ? (
                  <>{t('pages.drift.wizard.prMerged')}</>
                ) : prState === 'closed' ? (
                  <>{t('pages.drift.wizard.prClosed')}</>
                ) : (
                  <Trans
                    i18nKey="pages.drift.wizard.prOpen"
                    values={{ branch: setup.branch }}
                    components={{
                      1: <code />,
                      3: isSafeExternalUrl(setup.pr_url) ? (
                        <Link href={setup.pr_url} target="_blank" rel="noopener noreferrer" />
                      ) : (
                        <span />
                      ),
                    }}
                  />
                )}
              </Alert>
            )}
            <Alert severity="info">
              {isADO ? t('pages.drift.wizard.credsInfoAdo') : t('pages.drift.wizard.credsInfoGh')}
            </Alert>
          </Stack>
        )}

        {step === 2 && source && (
          <Stack spacing={2}>
            <TextField
              label={isADO ? t('pages.drift.wizard.pipelineName') : t('pages.drift.wizard.connectionName')}
              value={pipelineName}
              onChange={(e) => setPipelineName(e.target.value)}
              fullWidth
            />
            {isADO ? (
              <Typography variant="body2" color="text.secondary">
                <Trans
                  i18nKey="pages.drift.wizard.adoConnectDesc"
                  values={{ path: `/${fileName}`, repo: repo?.name }}
                  components={{ 1: <code />, 3: <b /> }}
                />
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                <Trans
                  i18nKey="pages.drift.wizard.ghConnectDesc"
                  values={{ repo: repo?.name }}
                  components={{ 1: <b />, 3: <code /> }}
                />
              </Typography>
            )}
            {isADO && existingPipeline && !done && (
              <Alert
                severity="info"
                action={
                  <Button size="small" disabled={creating} onClick={() => adoUseExisting.mutate()}>
                    {t('pages.drift.wizard.useExisting')}
                  </Button>
                }
              >
                <Trans
                  i18nKey="pages.drift.wizard.existingPipeline"
                  values={{ name: existingPipeline.name }}
                  components={{ 1: <b /> }}
                />
              </Alert>
            )}
            {ghWorkflowMissing && (
              <Alert severity="warning">
                <Trans
                  i18nKey="pages.drift.wizard.ghMissing"
                  values={{ repo: repo?.name }}
                  components={{ 1: <code /> }}
                />
              </Alert>
            )}
            <FormControlLabel
              control={
                <Checkbox checked={dispatchFirstRun} onChange={(e) => setDispatchFirstRun(e.target.checked)} />
              }
              label={t('pages.drift.wizard.dispatchFirstRun')}
            />
            {error && <Alert severity="error">{error}</Alert>}
            {done && (
              <Alert severity="success">
                <Trans i18nKey="pages.drift.wizard.done" values={{ name: pipelineName }} components={{ 1: <b /> }} />
              </Alert>
            )}
            {done && firstRun === 'dispatched' && (
              <Alert severity="info">{t('pages.drift.wizard.firstRunDispatched')}</Alert>
            )}
            {done && firstRun && firstRun !== 'dispatched' && (
              <Alert severity="warning">{t('pages.drift.wizard.firstRunFailed', { error: firstRun })}</Alert>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{done ? t('common.close') : t('common.cancel')}</Button>
        {step > 0 && !done && (
          <Button onClick={() => setStep((s) => s - 1)} disabled={creating}>
            {t('common.back')}
          </Button>
        )}
        {step < 2 && (
          <Button variant="contained" onClick={next} disabled={!stepValid}>
            {t('common.next')}
          </Button>
        )}
        {step === 2 && !done && (
          <Button
            variant="contained"
            disabled={!stepValid || creating}
            startIcon={creating ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={() => (isADO ? adoCreate.mutate() : ghConnect.mutate())}
          >
            {isADO
              ? existingPipeline
                ? t('pages.drift.wizard.createAnyway')
                : t('pages.drift.wizard.createBoth')
              : ghWorkflowMissing
                ? t('pages.drift.wizard.checkAgain')
                : t('pages.drift.wizard.detectConnect')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
