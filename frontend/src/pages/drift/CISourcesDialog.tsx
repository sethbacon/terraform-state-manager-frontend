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
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import { api, type CISource } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import ConfirmDialog from '../../components/ConfirmDialog'
import { extractApiError as apiErr } from '../../utils/apiError'

// Manages the CI credentials a pipeline connection can inherit: lists the
// existing sources with a per-source verify and delete, and carries the create
// form below them. List and form share one module because creating a source
// refetches the list rendered directly above the form, and the delete
// confirmation acts on a row of that same list.
export default function CISourcesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [provider, setProvider] = useState('github_actions')
  const [organization, setOrganization] = useState('')
  const [project, setProject] = useState('')
  const [authMethod, setAuthMethod] = useState<'pat' | 'app'>('pat')
  const [token, setToken] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [githubAppId, setGithubAppId] = useState('')
  const [githubInstallationId, setGithubInstallationId] = useState('')
  const [appPrivateKey, setAppPrivateKey] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<CISource | null>(null)
  // Per-source verify result keyed by source id.
  const [verifyResult, setVerifyResult] = useState<Record<string, { ok: boolean; error?: string }>>({})

  const sourcesQuery = useQuery({ queryKey: queryKeys.ciSources.list(), queryFn: api.listCISources, enabled: open })

  // App auth: an Entra app registration for Azure DevOps, a GitHub App for GitHub.
  const adoApp = provider === 'azure_devops' && authMethod === 'app'
  const ghApp = provider === 'github_actions' && authMethod === 'app'

  const resetForm = () => {
    setName('')
    setOrganization('')
    setProject('')
    setToken('')
    setTenantId('')
    setClientId('')
    setClientSecret('')
    setGithubAppId('')
    setGithubInstallationId('')
    setAppPrivateKey('')
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api.createCISource({
        name,
        provider,
        organization,
        project: provider === 'azure_devops' ? project : undefined,
        auth_method: authMethod,
        ...(adoApp
          ? { tenant_id: tenantId, client_id: clientId, client_secret: clientSecret }
          : ghApp
            ? {
              github_app_id: githubAppId,
              github_installation_id: githubInstallationId,
              app_private_key: appPrivateKey,
            }
            : { token }),
      }),
    // Divergence, preserved: creating a source clears the form and refetches
    // the list above it but leaves the dialog open, because this dialog is a
    // manager rather than a one-shot create form.
    onSuccess: () => {
      resetForm()
      queryClient.invalidateQueries({ queryKey: queryKeys.ciSources.all })
    },
  })

  const verifyMutation = useMutation({
    mutationFn: (id: string) => api.verifyCISource(id),
    onSuccess: (res, id) => setVerifyResult((prev) => ({ ...prev, [id]: res })),
    onError: (err, id) => setVerifyResult((prev) => ({ ...prev, [id]: { ok: false, error: apiErr(err) } })),
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
    (provider !== 'azure_devops' || Boolean(project.trim())) &&
    (adoApp
      ? Boolean(tenantId.trim()) && Boolean(clientId.trim()) && Boolean(clientSecret)
      : ghApp
        ? Boolean(githubAppId.trim()) && Boolean(githubInstallationId.trim()) && Boolean(appPrivateKey.trim())
        : Boolean(token))

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
            <Stack key={s.id} spacing={0.5}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="body2" sx={{ flexGrow: 1, wordBreak: 'break-word' }}>
                  {s.name}
                </Typography>
                <Chip size="small" label={s.provider === 'azure_devops' ? 'Azure DevOps' : 'GitHub'} />
                {s.auth_method === 'app' && <Chip size="small" color="primary" variant="outlined" label="App" />}
                <Chip
                  size="small"
                  variant="outlined"
                  label={s.provider === 'azure_devops' ? `${s.organization}/${s.project ?? ''}` : s.organization}
                />
                <Button
                  size="small"
                  onClick={() => verifyMutation.mutate(s.id)}
                  disabled={verifyMutation.isPending && verifyMutation.variables === s.id}
                >
                  {t('pages.drift.testConnection')}
                </Button>
                <IconButton size="small" aria-label="delete CI source" onClick={() => setDeleteTarget(s)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
              {verifyResult[s.id] &&
                (verifyResult[s.id].ok ? (
                  <Alert severity="success" sx={{ py: 0 }}>
                    {t('pages.drift.testConnectionOk')}
                  </Alert>
                ) : (
                  <Alert severity="error" sx={{ py: 0 }}>
                    {verifyResult[s.id].error}
                  </Alert>
                ))}
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
            select
            label={t('pages.drift.authMethod')}
            value={authMethod}
            onChange={(e) => setAuthMethod(e.target.value as 'pat' | 'app')}
            fullWidth
          >
            <MenuItem value="pat">{t('pages.drift.authMethodPat')}</MenuItem>
            <MenuItem value="app">{t('pages.drift.authMethodApp')}</MenuItem>
          </TextField>
          {adoApp ? (
            <>
              <Typography variant="caption" color="text.secondary">
                {t('pages.drift.appAuthHelp')}
              </Typography>
              <TextField
                label={t('pages.drift.tenantId')}
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                fullWidth
              />
              <TextField
                label={t('pages.drift.clientId')}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                fullWidth
              />
              <TextField
                label={t('pages.drift.clientSecret')}
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                helperText={t('pages.drift.clientSecretHelp')}
                fullWidth
              />
            </>
          ) : ghApp ? (
            <>
              <Typography variant="caption" color="text.secondary">
                {t('pages.drift.githubAppHelp')}
              </Typography>
              <TextField
                label={t('pages.drift.githubAppId')}
                value={githubAppId}
                onChange={(e) => setGithubAppId(e.target.value)}
                fullWidth
              />
              <TextField
                label={t('pages.drift.githubInstallationId')}
                value={githubInstallationId}
                onChange={(e) => setGithubInstallationId(e.target.value)}
                fullWidth
              />
              <TextField
                label={t('pages.drift.appPrivateKey')}
                value={appPrivateKey}
                onChange={(e) => setAppPrivateKey(e.target.value)}
                helperText={t('pages.drift.appPrivateKeyHelp')}
                multiline
                minRows={3}
                fullWidth
              />
            </>
          ) : (
            <TextField
              label={t('pages.drift.apiToken')}
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              helperText={t('pages.drift.sourceTokenHelp')}
              fullWidth
            />
          )}
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
      {/* Divergence, preserved: the confirmation is nested inside the parent
          Dialog rather than rendered as its sibling, and unlike the pipeline
          delete on the page it passes no `loading` prop. */}
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
