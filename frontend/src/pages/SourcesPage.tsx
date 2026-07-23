import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlineOutlined'
import DownloadIcon from '@mui/icons-material/Download'
import IosShareIcon from '@mui/icons-material/IosShare'
import StorageIcon from '@mui/icons-material/Storage'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import {
  api,
  type AnalysisResult,
  type ModuleFreshness,
  type ResourceSummary,
  type SourceSyncInfo,
  type StateSource,
  type TestSourceConfigInput,
  type TransferResult,
} from '../services/api'
import { queryKeys } from '../services/queryKeys'
import { useAuth } from '../contexts/AuthContext'
import { Trans, useTranslation } from 'react-i18next'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import StateHistoryTab from '../components/StateHistoryTab'
import StateLocksPanel from '../components/StateLocksPanel'
import CardGridSkeleton from '../components/skeletons/CardGridSkeleton'
import TargetBackendHint from '../components/TargetBackendHint'

function errMsg(e: unknown): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Request failed.'
}

// indexToken renders a resource instance key as the bracket suffix the backend
// parses: for_each string keys are JSON-quoted (`["a"]`), count indexes are bare
// (`[0]`). JSON.stringify escapes embedded quotes/backslashes to match the API.
function indexToken(key: string | number): string {
  return typeof key === 'number' ? `[${key}]` : `[${JSON.stringify(key)}]`
}

export default function SourcesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [selectedSource, setSelectedSource] = useState<StateSource | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StateSource | null>(null)
  const [editTarget, setEditTarget] = useState<StateSource | null>(null)

  const sourcesQuery = useQuery({ queryKey: queryKeys.sources.list(), queryFn: api.listSources })

  // Per-source sync health (synced flag, last_error, read errors) comes from the
  // dashboard overview. Poll while any source's first sync is still pending so a
  // freshly-added source's status — and its state count — appear on their own,
  // without the operator having to re-navigate. Stops polling once all synced.
  const syncQuery = useQuery({
    queryKey: queryKeys.dashboard.overview(),
    queryFn: () => api.getDashboardOverview(),
    refetchInterval: (q) => ((q.state.data?.sync ?? []).some((s) => !s.synced) ? 5000 : false),
  })
  const syncBySource = useMemo(
    () => new Map((syncQuery.data?.sync ?? []).map((s) => [s.source_id, s])),
    [syncQuery.data],
  )
  // When a source finishes its first sync, refresh its live state count so a card
  // that briefly showed nothing (or an error) reflects the now-reconciled source.
  const syncedIds = (syncQuery.data?.sync ?? [])
    .filter((s) => s.synced)
    .map((s) => s.source_id)
    .join(',')
  useEffect(() => {
    if (!syncedIds) return
    for (const id of syncedIds.split(',')) {
      queryClient.invalidateQueries({ queryKey: queryKeys.sources.states(id) })
    }
  }, [syncedIds, queryClient])

  // Deep link from the dashboard's version drill-down: ?source=<id>&state=<key>
  // preselects that source and state once the source list has loaded. Applied
  // once, then the params are cleared so later manual browsing isn't overridden.
  const [searchParams, setSearchParams] = useSearchParams()
  const deepLinkApplied = useRef(false)
  useEffect(() => {
    if (deepLinkApplied.current) return
    const sourceId = searchParams.get('source')
    if (!sourceId || !sourcesQuery.data) return
    const match = sourcesQuery.data.find((s) => s.id === sourceId)
    if (!match) return
    deepLinkApplied.current = true
    setSelectedSource(match)
    const stateKey = searchParams.get('state')
    if (stateKey) setSelectedKey(stateKey)
    setSearchParams({}, { replace: true })
    // The states browser renders below the source grid; bring it into view.
    requestAnimationFrame(() => {
      document.getElementById('states-browser')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    })
  }, [searchParams, sourcesQuery.data, setSearchParams])

  const deleteMutation = useMutation({
    mutationFn: api.deleteSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sources.all })
      setSelectedSource(null)
      setSelectedKey(null)
    },
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadResult, setUploadResult] = useState<AnalysisResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadError(null)
      try {
        const res = await api.analyzeUpload(await file.text())
        setUploadResult({ key: file.name, size: file.size, analysis: res.analysis })
      } catch {
        setUploadError(t('pages.sources.uploadError'))
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Box>
      <PageHeader
        icon={<StorageIcon />}
        title={t('nav.sources')}
        description={t('help.pages.sources.body')}
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => fileInputRef.current?.click()}
            >
              {t('pages.sources.uploadAnalyze')}
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
              {t('actions.addSource')}
            </Button>
          </Stack>
        }
      />
      <input ref={fileInputRef} type="file" accept=".tfstate,application/json" hidden onChange={handleFile} />

      {uploadError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUploadError(null)}>
          {uploadError}
        </Alert>
      )}

      {sourcesQuery.isLoading && <CardGridSkeleton count={6} minWidth={320} />}
      {sourcesQuery.isError && <Alert severity="error">{t('pages.sources.loadFailed')}</Alert>}

      {sourcesQuery.data && sourcesQuery.data.length === 0 && (
        <Alert severity="info">{t('pages.sources.empty')}</Alert>
      )}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {sourcesQuery.data?.map((s) => (
          <Card key={s.id} variant="outlined" sx={{ display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <StorageIcon color="action" />
                <Typography
                  variant="h6"
                  sx={{ flexGrow: 1, wordBreak: 'break-word', fontSize: '1.05rem', fontWeight: 600 }}
                >
                  {s.name}
                </Typography>
                <Chip size="small" color="primary" label={s.type} />
                <StateCountChip sourceId={s.id} />
                <SourceSyncBadge sync={syncBySource.get(s.id)} />
              </Stack>
              {typeof s.config?.base_path === 'string' && (
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                  {String(s.config.base_path)}
                </Typography>
              )}
            </CardContent>
            <CardActions sx={{ flexWrap: 'wrap' }}>
              <Button
                size="small"
                onClick={() => {
                  setSelectedSource(s)
                  setSelectedKey(null)
                }}
              >
                {t('pages.sources.browseStates')}
              </Button>
              <Box sx={{ flexGrow: 1 }} />
              <TestConnectionAction sourceId={s.id} />
              <IconButton
                size="small"
                aria-label={t('pages.sources.editSourceAria')}
                onClick={() => setEditTarget(s)}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label={t('pages.sources.deleteSourceAria')}
                onClick={() => setDeleteTarget(s)}
                disabled={deleteMutation.isPending}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </CardActions>
          </Card>
        ))}
      </Box>

      {selectedSource && (
        <StatesBrowser
          source={selectedSource}
          selectedKey={selectedKey}
          onSelectKey={setSelectedKey}
        />
      )}

      <AddSourceDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.sources.all })
          setAddOpen(false)
        }}
      />

      <EditSourceDialog
        source={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.sources.all })
          setEditTarget(null)
        }}
      />

      <Dialog open={Boolean(uploadResult)} onClose={() => setUploadResult(null)} fullWidth maxWidth="md">
        <DialogTitle>{t('pages.sources.analysisTitle', { name: uploadResult?.key })}</DialogTitle>
        <DialogContent>{uploadResult && <AnalysisView result={uploadResult} />}</DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadResult(null)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t('pages.sources.deleteTitle')}
        severity="error"
        description={
          <>
            <Trans
              i18nKey="pages.sources.deleteBody"
              values={{ name: deleteTarget?.name }}
              components={{ 1: <b />, 3: <b /> }}
            />
          </>
        }
        typeToConfirmText={deleteTarget?.name}
        confirmLabel={t('pages.sources.deleteConfirmLabel')}
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return
          await deleteMutation.mutateAsync(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </Box>
  )
}

// Test-connection action with an inline outcome chip: connects to the backend
// and lists its states without persisting anything.
function TestConnectionAction({ sourceId }: { sourceId: string }) {
  const { t } = useTranslation()
  const m = useMutation({ mutationFn: () => api.testSource(sourceId) })
  return (
    <>
      {m.isSuccess && (
        <Chip
          size="small"
          color="success"
          variant="outlined"
          label={t('pages.sources.testOk', { count: m.data.states ?? 0 })}
        />
      )}
      {m.isError && (
        <Tooltip title={errMsg(m.error)}>
          <Chip size="small" color="error" variant="outlined" label={t('pages.sources.testFailed')} />
        </Tooltip>
      )}
      <Tooltip title={t('pages.sources.testConnection')}>
        <span>
          <IconButton
            size="small"
            aria-label={t('pages.sources.testConnection')}
            onClick={() => m.mutate()}
            disabled={m.isPending}
          >
            {m.isPending ? <CircularProgress size={16} /> : <PlayCircleOutlineIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
    </>
  )
}

// SourceSyncBadge surfaces per-source sync health on the card, so a source that
// silently listed nothing (e.g. a bad credential) shows its actual state and
// error rather than just an empty count. Data comes from the dashboard overview.
function SourceSyncBadge({ sync }: { sync?: SourceSyncInfo }) {
  const { t } = useTranslation()
  if (!sync) return null
  if (!sync.synced) {
    return <Chip size="small" color="info" variant="outlined" label={t('pages.sources.syncPending')} />
  }
  return (
    <>
      {(sync.read_errors ?? 0) > 0 && (
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label={t('pages.sources.syncReadErrors', { count: sync.read_errors })}
        />
      )}
      {sync.last_error && (
        <Tooltip title={sync.last_error}>
          <Chip size="small" color="error" variant="outlined" label={t('pages.sources.syncError')} />
        </Tooltip>
      )}
    </>
  )
}

// DialogTestConnection is the "test before save" control shared by the Add and
// Edit dialogs: it validates the connectivity of the config the operator is
// about to save (build() returns null while required fields are blank) without
// persisting anything, mirroring the per-card TestConnectionAction.
function DialogTestConnection({ build }: { build: () => TestSourceConfigInput | null }) {
  const { t } = useTranslation()
  const m = useMutation({ mutationFn: (input: TestSourceConfigInput) => api.testSourceConfig(input) })
  const input = build()
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mr: 'auto' }}>
      <Button
        size="small"
        onClick={() => input && m.mutate(input)}
        disabled={!input || m.isPending}
        startIcon={m.isPending ? <CircularProgress size={14} /> : <PlayCircleOutlineIcon fontSize="small" />}
      >
        {t('pages.sources.testConnection')}
      </Button>
      {m.isSuccess && (
        <Chip size="small" color="success" variant="outlined" label={t('pages.sources.testOk', { count: m.data.states ?? 0 })} />
      )}
      {m.isError && (
        <Tooltip title={errMsg(m.error)}>
          <Chip size="small" color="error" variant="outlined" label={t('pages.sources.testFailed')} />
        </Tooltip>
      )}
    </Stack>
  )
}

// Edit dialog: same field definitions as Add, but the type is immutable and
// credential fields left blank keep the stored secret.
function EditSourceDialog({
  source,
  onClose,
  onSaved,
}: {
  source: StateSource | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})

  const type = source?.type ?? 'local'
  const def = SOURCE_TYPES.find((st) => st.value === type) ?? SOURCE_TYPES[0]

  useEffect(() => {
    if (!source) return
    setName(source.name)
    const initial: Record<string, string> = {}
    for (const [k, v] of Object.entries(source.config ?? {})) {
      if (typeof v === 'string') initial[k] = v
    }
    setValues(initial)
  }, [source])

  const saveMutation = useMutation({
    mutationFn: () => {
      // The backend replaces config wholesale on update, so start from the
      // existing config and overlay only the known fields — otherwise config
      // keys the UI does not model (e.g. a git source's author_name/
      // author_email set out-of-band) would be silently dropped on any edit.
      const config: Record<string, unknown> = { ...(source?.config ?? {}) }
      const credentials: Record<string, unknown> = {}
      for (const f of def.fields) {
        const v = values[f.key]?.trim()
        if (f.credential) {
          // Credentials never live in config; keep them out of the config blob.
          delete config[f.key]
          if (v) credentials[f.key] = v
          continue
        }
        if (v) config[f.key] = v
        else delete config[f.key]
      }
      return api.updateSource(source!.id, {
        name,
        config,
        ...(Object.keys(credentials).length ? { credentials } : {}),
      })
    },
    onSuccess: onSaved,
  })

  // Credential fields may stay blank on edit (the stored secret is kept).
  const valid =
    Boolean(name) && def.fields.filter((f) => !f.optional && !f.credential).every((f) => values[f.key]?.trim())

  // Test the config the operator is about to save; blank credentials reuse the
  // source's stored secret via source_id (mirroring UpdateSource). Null until
  // the required non-credential fields are filled.
  const buildTestInput = (): TestSourceConfigInput | null => {
    if (!source || !valid) return null
    const config: Record<string, unknown> = {}
    const credentials: Record<string, unknown> = {}
    for (const f of def.fields) {
      const v = values[f.key]?.trim()
      if (!v) continue
      if (f.credential) credentials[f.key] = v
      else config[f.key] = v
    }
    return {
      type,
      config,
      source_id: source.id,
      ...(Object.keys(credentials).length ? { credentials } : {}),
    }
  }

  return (
    <Dialog open={Boolean(source)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('pages.sources.editSourceTitle', { name: source?.name })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField select label={t('pages.sources.type')} value={type} disabled fullWidth>
            <MenuItem value={type}>{t(`pages.sources.types.${type}`, def.label)}</MenuItem>
          </TextField>

          {def.fields.map((f) => {
            const label = t(`pages.sources.fields.${type}.${f.key}.label`, f.label)
            return (
              <TextField
                key={f.key}
                label={f.optional || f.credential ? t('pages.sources.optionalField', { label }) : label}
                type={f.secret ? 'password' : 'text'}
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                helperText={
                  f.credential
                    ? t('pages.sources.keepCredentialHelper')
                    : f.helper
                      ? t(`pages.sources.fields.${type}.${f.key}.helper`, f.helper)
                      : undefined
                }
                fullWidth
              />
            )
          })}

          {saveMutation.isError && <Alert severity="error">{errMsg(saveMutation.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DialogTestConnection build={buildTestInput} />
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={() => saveMutation.mutate()} disabled={!valid || saveMutation.isPending}>
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// Shares the StatesBrowser query key, so the count pre-warms the browse view.
function StateCountChip({ sourceId }: { sourceId: string }) {
  const { t } = useTranslation()
  const statesQuery = useQuery({
    queryKey: queryKeys.sources.states(sourceId),
    queryFn: () => api.listStates(sourceId),
  })
  if (!statesQuery.data) return null
  return (
    <Chip
      size="small"
      variant="outlined"
      color="info"
      label={t('pages.sources.stateCount', { count: statesQuery.data.length })}
    />
  )
}

// Windowing geometry for the states list: fixed-height rows inside the fixed
// 480px viewport let the visible slice be computed from scrollTop alone.
const STATE_ROW_HEIGHT = 60
const STATES_VIEWPORT_HEIGHT = 480
const STATES_VIRTUALIZE_THRESHOLD = 100

function StatesBrowser({
  source,
  selectedKey,
  onSelectKey,
}: {
  source: StateSource
  selectedKey: string | null
  onSelectKey: (key: string | null) => void
}) {
  const statesQuery = useQuery({
    queryKey: queryKeys.sources.states(source.id),
    queryFn: () => api.listStates(source.id),
  })

  const { t } = useTranslation()
  // Type-to-filter for long listings (e.g. HCP orgs with many workspaces).
  const [stateFilter, setStateFilter] = useState('')
  const allStates = statesQuery.data ?? []
  const visibleStates = stateFilter
    ? allStates.filter((st) => (st.name || st.key).toLowerCase().includes(stateFilter.toLowerCase()))
    : allStates

  // Windowing keeps the DOM bounded at fleet scale: above the threshold only
  // the rows inside the 480px viewport (plus a small overscan) render, with
  // spacer boxes preserving scroll geometry. Below it, rows render plainly so
  // small lists keep natural heights.
  const virtualize = visibleStates.length > STATES_VIRTUALIZE_THRESHOLD
  const [scrollTop, setScrollTop] = useState(0)
  const listRef = useRef<HTMLUListElement | null>(null)
  useEffect(() => {
    // A filter change re-shapes the list; stale scroll offsets would show a
    // window past the end, so snap back to the top.
    listRef.current?.scrollTo({ top: 0 })
    setScrollTop(0)
  }, [stateFilter])
  const winStart = virtualize ? Math.max(0, Math.floor(scrollTop / STATE_ROW_HEIGHT) - 5) : 0
  const winEnd = virtualize
    ? Math.min(visibleStates.length, Math.ceil((scrollTop + STATES_VIEWPORT_HEIGHT) / STATE_ROW_HEIGHT) + 5)
    : visibleStates.length
  const windowStates = visibleStates.slice(winStart, winEnd)

  return (
    <Box sx={{ mt: 4 }} id="states-browser">
      <Typography variant="h6" sx={{ mb: 1 }}>
        {t('pages.sources.statesIn', { name: source.name })}
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '320px 1fr' } }}>
        <Box>
        <Card variant="outlined">
          {statesQuery.isLoading && (
            <Box sx={{ p: 2 }}>
              <CircularProgress size={20} />
            </Box>
          )}
          {statesQuery.isError && <Alert severity="error">{t('pages.sources.listFailed')}</Alert>}
          {statesQuery.data && statesQuery.data.length === 0 && (
            <Box sx={{ p: 2 }}>
              <Typography color="text.secondary">{t('pages.sources.noStateFiles')}</Typography>
            </Box>
          )}
          {allStates.length > 8 && (
            <Box sx={{ p: 1 }}>
              <TextField
                size="small"
                placeholder={t('pages.sources.filterStates', { count: allStates.length })}
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                fullWidth
              />
            </Box>
          )}
          {stateFilter && visibleStates.length === 0 && (
            <Box sx={{ p: 2 }}>
              <Typography color="text.secondary" variant="body2">
                {t('pages.sources.noStatesMatch', { filter: stateFilter })}
              </Typography>
            </Box>
          )}
          <List
            dense
            disablePadding
            ref={listRef}
            sx={{ maxHeight: STATES_VIEWPORT_HEIGHT, overflow: 'auto' }}
            onScroll={virtualize ? (e) => setScrollTop((e.target as HTMLElement).scrollTop) : undefined}
          >
            {virtualize && <Box sx={{ height: winStart * STATE_ROW_HEIGHT }} />}
            {windowStates.map((st) => (
              <ListItemButton
                key={st.key}
                selected={selectedKey === st.key}
                onClick={() => onSelectKey(st.key)}
                sx={virtualize ? { height: STATE_ROW_HEIGHT } : undefined}
              >
                <ListItemText
                  primary={st.name}
                  secondary={`${(st.size / 1024).toFixed(1)} KB${st.last_modified ? ` · ${new Date(st.last_modified).toLocaleString()}` : ''
                    }`}
                />
              </ListItemButton>
            ))}
            {virtualize && <Box sx={{ height: (visibleStates.length - winEnd) * STATE_ROW_HEIGHT }} />}
          </List>
        </Card>
        <StateLocksPanel sourceId={source.id} />
        </Box>

        <Box>
          {selectedKey ? (
            <StateDetail
              sourceId={source.id}
              stateKey={selectedKey}
              stateName={statesQuery.data?.find((st) => st.key === selectedKey)?.name ?? selectedKey}
              onDeleted={() => onSelectKey(null)}
            />
          ) : (
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary">{t('pages.sources.selectState')}</Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
    </Box>
  )
}

function StateDetail({
  sourceId,
  stateKey,
  stateName,
  onDeleted,
}: {
  sourceId: string
  stateKey: string
  /** Friendly display name (HCP keys are workspace ids); defaults to the key. */
  stateName?: string
  /** Called after the state object is deleted, so the parent clears the selection. */
  onDeleted: () => void
}) {
  const displayName = stateName ?? stateKey
  const { t } = useTranslation()
  const { hasScope } = useAuth()
  const [tab, setTab] = useState(0)
  const [transferOpen, setTransferOpen] = useState(false)
  const [opsOpen, setOpsOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [downloadAnchor, setDownloadAnchor] = useState<null | HTMLElement>(null)
  return (
    <>
      <Card variant="outlined">
        <Stack direction="row" sx={{ px: 2, pt: 1, flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v as number)} sx={{ minHeight: 0 }}>
            <Tab label={t('pages.sources.tabAnalysis')} />
            <Tab label={t('pages.sources.tabResources')} />
            <Tab label={t('pages.sources.tabOutputs')} />
            <Tab label={t('pages.sources.tabHistory')} />
            <Tab label={t('pages.sources.tabRaw')} />
            <Tab label={t('pages.sources.tabBackups')} />
            <Tab label={t('pages.sources.tabModules')} />
          </Tabs>
          {hasScope('state:write') && (
            <Button size="small" variant="outlined" onClick={() => setOpsOpen(true)}>
              {t('pages.sources.stateOps')}
            </Button>
          )}
          {hasScope('state:transfer') && (
            <Button size="small" variant="outlined" startIcon={<SwapHorizIcon />} onClick={() => setTransferOpen(true)}>
              {t('pages.sources.transfer')}
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<IosShareIcon />}
            onClick={(e) => setDownloadAnchor(e.currentTarget)}
          >
            {t('pages.sources.export')}
          </Button>
          <Menu anchorEl={downloadAnchor} open={Boolean(downloadAnchor)} onClose={() => setDownloadAnchor(null)}>
            <ListSubheader sx={{ lineHeight: 2, bgcolor: 'transparent' }}>
              {t('pages.sources.exportReportHeader')}
            </ListSubheader>
            {(['md', 'json', 'csv'] as const).map((format) => (
              <MenuItem
                key={format}
                onClick={() => {
                  void api.downloadReport(sourceId, stateKey, format)
                  setDownloadAnchor(null)
                }}
              >
                {format.toUpperCase()}
              </MenuItem>
            ))}
            <Divider />
            <MenuItem
              onClick={() => {
                void api.downloadRawState(sourceId, stateKey)
                setDownloadAnchor(null)
              }}
            >
              <ListItemIcon>
                <DownloadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t('pages.sources.downloadState')}</ListItemText>
            </MenuItem>
          </Menu>
          {hasScope('admin') && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteOpen(true)}
            >
              {t('pages.sources.deleteState')}
            </Button>
          )}
        </Stack>
        <Divider />
        <CardContent>
          {tab === 0 && <AnalysisTab sourceId={sourceId} stateKey={stateKey} />}
          {tab === 1 && <ResourcesTab sourceId={sourceId} stateKey={stateKey} />}
          {tab === 2 && <OutputsTab sourceId={sourceId} stateKey={stateKey} />}
          {tab === 3 && <StateHistoryTab sourceId={sourceId} stateKey={stateKey} />}
          {tab === 4 && <RawTab sourceId={sourceId} stateKey={stateKey} />}
          {tab === 5 && <BackupsTab sourceId={sourceId} stateKey={stateKey} />}
          {tab === 6 && <ModulesTab sourceId={sourceId} stateKey={stateKey} />}
        </CardContent>
      </Card>
      <TransferDialog
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        sourceId={sourceId}
        stateKey={stateKey}
        stateName={displayName}
      />
      <StateOpsDialog
        open={opsOpen}
        onClose={() => setOpsOpen(false)}
        sourceId={sourceId}
        stateKey={stateKey}
        stateName={displayName}
      />
      <DeleteStateDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        sourceId={sourceId}
        stateKey={stateKey}
        stateName={displayName}
        onDeleted={onDeleted}
      />
    </>
  )
}

// DeleteStateDialog is the admin-only destructive delete of a state object. It
// reminds the operator that a final backup is taken (and that they can download
// first), offers an explicit purge of backups, and requires typing the exact
// state key before the delete is enabled.
function DeleteStateDialog({
  open,
  onClose,
  sourceId,
  stateKey,
  stateName,
  onDeleted,
}: {
  open: boolean
  onClose: () => void
  sourceId: string
  stateKey: string
  stateName?: string
  onDeleted: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [purge, setPurge] = useState(false)
  const [confirmKey, setConfirmKey] = useState('')

  // Reset each time the dialog opens so a prior attempt never leaks in.
  useEffect(() => {
    if (open) {
      setPurge(false)
      setConfirmKey('')
    }
  }, [open])

  const mutation = useMutation({
    mutationFn: () => api.deleteState(sourceId, stateKey, purge),
    onSuccess: () => {
      for (const key of [
        queryKeys.sources.states(sourceId),
        queryKeys.sources.raw(sourceId, stateKey),
        queryKeys.sources.analysis(sourceId, stateKey),
        queryKeys.sources.resources(sourceId, stateKey),
        queryKeys.sources.backups(sourceId, stateKey),
      ]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      onClose()
      onDeleted()
    },
  })

  const confirmed = confirmKey === stateKey

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('pages.sources.deleteStateTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="error">
            <Trans
              i18nKey="pages.sources.deleteStateBody"
              values={{ name: stateName ?? stateKey }}
              components={{ 1: <b /> }}
            />
          </Alert>
          <Typography variant="body2" color="text.secondary">
            {t('pages.sources.deleteStateBackupNote')}
          </Typography>
          <FormControlLabel
            control={<Checkbox checked={purge} onChange={(e) => setPurge(e.target.checked)} color="error" />}
            label={t('pages.sources.deleteStatePurgeLabel')}
          />
          {purge && <Alert severity="warning">{t('pages.sources.deleteStatePurgeWarning')}</Alert>}
          <Typography variant="body2">
            <Trans
              i18nKey="pages.sources.deleteStateConfirmPrompt"
              values={{ key: stateKey }}
              components={{ 1: <code /> }}
            />
          </Typography>
          <TextField
            value={confirmKey}
            onChange={(e) => setConfirmKey(e.target.value)}
            placeholder={stateKey}
            fullWidth
            size="small"
            slotProps={{ htmlInput: { 'aria-label': t('pages.sources.deleteStateConfirmAria'), 'data-testid': 'delete-state-confirm-input' } }}
          />
          {mutation.isError && <Alert severity="error">{errMsg(mutation.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          color="error"
          variant="contained"
          disabled={!confirmed || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {t('pages.sources.deleteStateConfirmLabel')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function StateOpsDialog({
  open,
  onClose,
  sourceId,
  stateKey,
  stateName,
}: {
  open: boolean
  onClose: () => void
  sourceId: string
  stateKey: string
  stateName?: string
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [op, setOp] = useState<'rm' | 'mv'>('rm')
  const [address, setAddress] = useState('')
  const [instanceIdx, setInstanceIdx] = useState('')
  const [to, setTo] = useState('')

  // Resources in this state, so the address can be picked instead of typed.
  // Same query key as the Resources tab, so it's usually already cached.
  const resourcesQuery = useQuery({
    queryKey: queryKeys.sources.resources(sourceId, stateKey),
    queryFn: () => api.listStateResources(sourceId, stateKey),
    enabled: open,
  })

  // Addresses in the exact form the backend parses: "[module.X.]type.name"
  // (no prefix for the root module). Deduped; meta drives the option display and
  // the per-instance (for_each/count) picker.
  const { addressOptions, addressMeta } = useMemo(() => {
    const meta = new Map<string, { mode: string; instances: number; module: string; instanceKeys: (string | number)[] }>()
    for (const r of resourcesQuery.data ?? []) {
      const addr = `${r.module === 'root' ? '' : `${r.module}.`}${r.type}.${r.name}`
      if (!meta.has(addr))
        meta.set(addr, { mode: r.mode, instances: r.instances, module: r.module, instanceKeys: r.instance_keys ?? [] })
    }
    return { addressOptions: [...meta.keys()], addressMeta: meta }
  }, [resourcesQuery.data])

  // Instance keys for the currently-selected base address (empty for singletons
  // or a free-typed address). Selecting one appends its index to the address.
  const instanceKeys = addressMeta.get(address)?.instanceKeys ?? []
  const effectiveAddress = instanceIdx ? `${address}${instanceIdx}` : address

  // Picking a different base address clears any stale instance selection.
  useEffect(() => {
    setInstanceIdx('')
  }, [address])

  const mutation = useMutation({
    mutationFn: () => api.stateOperation(sourceId, stateKey, op, effectiveAddress, op === 'mv' ? to : undefined),
    onSuccess: () => {
      setAddress('')
      setInstanceIdx('')
      setTo('')
      for (const key of [
        queryKeys.sources.raw(sourceId, stateKey),
        queryKeys.sources.analysis(sourceId, stateKey),
        queryKeys.sources.resources(sourceId, stateKey),
        queryKeys.sources.backups(sourceId, stateKey),
        // The browse panel's list shows size/serial-affected metadata too.
        queryKeys.sources.states(sourceId),
      ]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      onClose()
    },
  })

  const valid = Boolean(address) && (op === 'rm' || Boolean(to))

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('pages.sources.stateOpTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <Trans
              i18nKey="pages.sources.stateOpDesc"
              values={{ name: stateName ?? stateKey }}
              components={{ 1: <b /> }}
            />
          </Typography>
          <TextField select label={t('pages.sources.operation')} value={op} onChange={(e) => setOp(e.target.value as 'rm' | 'mv')} fullWidth>
            <MenuItem value="rm">{t('pages.sources.opRemove')}</MenuItem>
            <MenuItem value="mv">{t('pages.sources.opMove')}</MenuItem>
          </TextField>
          <Autocomplete
            freeSolo
            options={addressOptions}
            loading={resourcesQuery.isLoading}
            groupBy={(option) => addressMeta.get(option)?.module ?? ''}
            inputValue={address}
            onInputChange={(_, v) => setAddress(v)}
            renderOption={(props, option) => {
              const meta = addressMeta.get(option)
              return (
                <Box component="li" {...props} key={option} sx={{ display: 'flex', gap: 1 }}>
                  <Typography variant="body2" sx={{ flexGrow: 1, wordBreak: 'break-all' }}>
                    {option}
                  </Typography>
                  {meta?.mode === 'data' && <Chip size="small" label="data" />}
                  {(meta?.instances ?? 0) > 1 && <Chip size="small" variant="outlined" label={`×${meta?.instances}`} />}
                </Box>
              )
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('pages.sources.resourceAddress')}
                placeholder="aws_instance.web or module.vpc.aws_subnet.private"
                fullWidth
              />
            )}
          />
          {instanceKeys.length > 0 && (
            <TextField
              select
              label={t('pages.sources.instance')}
              value={instanceIdx}
              onChange={(e) => setInstanceIdx(e.target.value)}
              helperText={t('pages.sources.instanceHelper')}
              fullWidth
            >
              <MenuItem value="">{t('pages.sources.instanceAll')}</MenuItem>
              {instanceKeys.map((key) => (
                <MenuItem key={String(key)} value={indexToken(key)}>
                  {String(key)}
                </MenuItem>
              ))}
            </TextField>
          )}
          {op === 'mv' && (
            <TextField
              label={t('pages.sources.newAddress')}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={instanceIdx ? 'aws_instance.web2["b"]' : 'aws_instance.web2'}
              helperText={instanceIdx ? t('pages.sources.newAddressInstanceHelper') : undefined}
              fullWidth
            />
          )}
          {mutation.isError && <Alert severity="error">{errMsg(mutation.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="warning" variant="contained" disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function AnalysisTab({ sourceId, stateKey }: { sourceId: string; stateKey: string }) {
  const { t } = useTranslation()
  const q = useQuery({
    queryKey: queryKeys.sources.analysis(sourceId, stateKey),
    queryFn: () => api.analyzeState(sourceId, stateKey),
  })
  if (q.isLoading) return <CircularProgress />
  if (q.isError || !q.data) return <Alert severity="error">{t('pages.sources.analyzeFailed')}</Alert>
  return <AnalysisView result={q.data} />
}

function OutputsTab({ sourceId, stateKey }: { sourceId: string; stateKey: string }) {
  const { t } = useTranslation()
  const q = useQuery({
    queryKey: queryKeys.sources.outputs(sourceId, stateKey),
    queryFn: () => api.listStateOutputs(sourceId, stateKey),
  })
  if (q.isLoading) return <CircularProgress />
  if (q.isError || !q.data) return <Alert severity="error">{t('pages.sources.outputsFailed')}</Alert>
  if (q.data.length === 0) {
    return <Typography color="text.secondary">{t('pages.sources.noOutputs')}</Typography>
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 600 }}>{t('pages.sources.outputName')}</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>{t('pages.sources.outputType')}</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>{t('pages.sources.outputValue')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {q.data.map((o) => (
          <TableRow key={o.name}>
            <TableCell sx={{ fontFamily: 'monospace' }}>{o.name}</TableCell>
            <TableCell>
              <Chip size="small" variant="outlined" label={o.type || '—'} />
            </TableCell>
            <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: 480 }}>
              {o.sensitive ? (
                <Chip size="small" color="warning" label={t('pages.sources.sensitiveValue')} />
              ) : (
                JSON.stringify(o.value)
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// Module paths and instance keys contain no spaces; add zero-width break
// points after dots and before brackets so wrapped lines split between
// segments (module. / nat_shared_use1) instead of mid-word.
function breakableSegments(s: string): string {
  return s.replace(/\./g, '.\u200b').replace(/\//g, '/\u200b').replace(/\[/g, '\u200b[')
}

function ResourcesTab({ sourceId, stateKey }: { sourceId: string; stateKey: string }) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')
  const q = useQuery({
    queryKey: queryKeys.sources.resources(sourceId, stateKey),
    queryFn: () => api.listStateResources(sourceId, stateKey),
  })
  if (q.isLoading) return <CircularProgress />
  if (q.isError || !q.data) return <Alert severity="error">{t('pages.sources.resourcesFailed')}</Alert>

  const f = filter.toLowerCase()
  const rows = q.data.filter(
    (r) =>
      !f ||
      r.type.toLowerCase().includes(f) ||
      r.name.toLowerCase().includes(f) ||
      r.module.toLowerCase().includes(f) ||
      r.provider.toLowerCase().includes(f),
  )

  return (
    <Stack spacing={1}>
      <TextField
        size="small"
        placeholder={t('pages.sources.filterResources')}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        fullWidth
      />
      <Table size="small" sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '22%' }}>{t('pages.sources.module')}</TableCell>
            <TableCell sx={{ width: '24%' }}>{t('common.type')}</TableCell>
            <TableCell sx={{ width: '20%' }}>{t('common.name')}</TableCell>
            <TableCell sx={{ width: '16%' }}>{t('common.provider')}</TableCell>
            <TableCell sx={{ width: '9%' }}>{t('pages.sources.mode')}</TableCell>
            <TableCell align="right" sx={{ width: '9%', pr: 2 }}>
              {t('pages.sources.instances')}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={`${r.module}/${r.type}.${r.name}-${i}`}>
              <TableCell sx={{ overflowWrap: 'anywhere' }}>{breakableSegments(r.module)}</TableCell>
              <TableCell sx={{ overflowWrap: 'anywhere' }}>{r.type}</TableCell>
              <TableCell sx={{ overflowWrap: 'anywhere' }}>{r.name}</TableCell>
              <TableCell sx={{ overflowWrap: 'anywhere' }}>{breakableSegments(r.provider)}</TableCell>
              <TableCell>{r.mode}</TableCell>
              <TableCell align="right" sx={{ pr: 2 }}>
                {r.instances}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length === 0 && (
        <Typography color="text.secondary" variant="body2">
          No matching resources.
        </Typography>
      )}
    </Stack>
  )
}

// ModulesTab lists the registry modules a state calls, captured from ingested
// plans. Empty is normal (capture only happens on plan push-ingest). A locked
// version is shown when known; otherwise a "constraint only" marker, since TSM
// has no lockfile to resolve the exact version.
function ModulesTab({ sourceId, stateKey }: { sourceId: string; stateKey: string }) {
  const { t } = useTranslation()
  const q = useQuery({
    queryKey: queryKeys.sources.modules(sourceId, stateKey),
    queryFn: () => api.listStateModules(sourceId, stateKey),
  })
  // Freshness is a SECONDARY, best-effort query comparing each locked version to
  // the sibling registry's latest. retry:false so an absent endpoint (older
  // backend) or a standalone deploy (all "no_registry") never blocks or throws —
  // the table renders fully from listStateModules regardless of this query.
  const freshnessQuery = useQuery({
    queryKey: queryKeys.sources.modulesFreshness(sourceId, stateKey),
    queryFn: () => api.listStateModuleFreshness(sourceId, stateKey),
    retry: false,
  })
  if (q.isLoading) return <CircularProgress />
  if (q.isError || !q.data) return <Alert severity="error">{t('pages.sources.modulesFailed')}</Alert>
  if (q.data.length === 0) {
    return (
      <Typography color="text.secondary" variant="body2">
        {t('pages.sources.noModules')}
      </Typography>
    )
  }
  const freshness = new Map(
    (freshnessQuery.data ?? []).map((f) => [`${f.registry_host} ${f.module_source}`, f]),
  )
  // Render the freshness badge, or nothing when there is nothing meaningful to
  // show: constraint_only is already conveyed by the version column, and
  // no_registry (standalone / a different registry) stays blank for a clean table.
  const freshnessChip = (f?: ModuleFreshness) => {
    if (!f) return null
    if (f.status === 'behind')
      return <Chip size="small" color="warning" label={`${f.current} → ${f.latest}`} />
    if (f.status === 'up_to_date')
      return <Chip size="small" color="success" label={t('pages.sources.moduleUpToDate')} />
    if (f.status === 'unknown')
      return <Chip size="small" variant="outlined" label={t('pages.sources.moduleUnknown')} />
    return null
  }
  return (
    <Table size="small" sx={{ tableLayout: 'fixed' }}>
      <TableHead>
        <TableRow>
          <TableCell sx={{ width: '38%' }}>{t('pages.sources.moduleSource')}</TableCell>
          <TableCell sx={{ width: '22%' }}>{t('pages.sources.moduleVersion')}</TableCell>
          <TableCell sx={{ width: '24%' }}>{t('pages.sources.registryHost')}</TableCell>
          <TableCell sx={{ width: '16%' }}>{t('pages.sources.moduleStatus')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {q.data.map((m, i) => (
          <TableRow key={`${m.registry_host}/${m.module_source}-${i}`}>
            <TableCell sx={{ overflowWrap: 'anywhere' }}>{breakableSegments(m.module_source)}</TableCell>
            <TableCell>
              {m.module_version ? (
                m.module_version
              ) : (
                <Chip size="small" variant="outlined" label={t('pages.sources.constraintOnly')} />
              )}
            </TableCell>
            <TableCell sx={{ overflowWrap: 'anywhere' }}>{m.registry_host}</TableCell>
            <TableCell>{freshnessChip(freshness.get(`${m.registry_host} ${m.module_source}`))}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function RawTab({ sourceId, stateKey }: { sourceId: string; stateKey: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { hasScope } = useAuth()
  const canEdit = hasScope('state:write')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [forceConfirmOpen, setForceConfirmOpen] = useState(false)

  const q = useQuery({
    queryKey: queryKeys.sources.raw(sourceId, stateKey),
    queryFn: () => api.getRawState(sourceId, stateKey),
  })

  const invalidateState = () => {
    for (const key of [
      queryKeys.sources.raw(sourceId, stateKey),
      queryKeys.sources.analysis(sourceId, stateKey),
      queryKeys.sources.resources(sourceId, stateKey),
      queryKeys.sources.backups(sourceId, stateKey),
      // The browse panel's list shows size/serial-affected metadata too.
      queryKeys.sources.states(sourceId),
    ]) {
      queryClient.invalidateQueries({ queryKey: key })
    }
  }

  const saveMutation = useMutation({
    mutationFn: (vars?: { force?: boolean }) => api.editState(sourceId, stateKey, draft, vars?.force ?? false),
    onSuccess: () => {
      setEditing(false)
      setConfirmOpen(false)
      setForceConfirmOpen(false)
      invalidateState()
    },
    onError: (e) => {
      // A serial/lineage conflict is recoverable: the backend supports
      // ?force=true, so offer it explicitly instead of dead-ending.
      if ((e as { response?: { status?: number } })?.response?.status === 409) {
        setForceConfirmOpen(true)
      }
    },
  })

  if (q.isLoading) return <CircularProgress />
  if (q.isError || q.data === undefined) return <Alert severity="error">{t('pages.sources.rawFailed')}</Alert>

  let pretty = q.data
  try {
    pretty = JSON.stringify(JSON.parse(q.data), null, 2)
  } catch {
    // not valid JSON — show as-is
  }

  let draftValid = true
  try {
    JSON.parse(draft)
  } catch {
    draftValid = false
  }

  return (
    <Stack spacing={1}>
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Box sx={{ flexGrow: 1 }} />
        {canEdit && !editing && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setDraft(pretty)
              setEditing(true)
            }}
          >
            {t('common.edit')}
          </Button>
        )}
        {editing && (
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </Button>
            <Button size="small" variant="contained" disabled={!draftValid} onClick={() => setConfirmOpen(true)}>
              {t('common.save')}
            </Button>
          </Stack>
        )}
      </Stack>

      {editing ? (
        <>
          <TextField
            multiline
            minRows={16}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            error={!draftValid}
            helperText={
              !draftValid ? t('pages.sources.notValidJson') : t('pages.sources.saveHelp')
            }
            sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 12 } }}
            fullWidth
          />
          {saveMutation.isError && !forceConfirmOpen && <Alert severity="error">{errMsg(saveMutation.error)}</Alert>}
        </>
      ) : (
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 2,
            maxHeight: 480,
            overflow: 'auto',
            fontSize: 12,
            bgcolor: 'action.hover',
            borderRadius: 1,
            // pre-wrap + anywhere: huge single-line attributes (inline IAM
            // policy JSON) wrap inside the panel instead of side-scrolling
            // the whole page; indentation and newlines are preserved.
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
          }}
        >
          {pretty}
        </Box>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{t('pages.sources.overwriteTitle')}</DialogTitle>
        <DialogContent>
          <Typography>
            <Trans i18nKey="pages.sources.overwriteBody" values={{ name: stateKey }} components={{ 1: <b /> }} />
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{t('common.cancel')}</Button>
          <Button color="warning" variant="contained" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(undefined)}>
            {t('pages.sources.overwrite')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={forceConfirmOpen} onClose={() => setForceConfirmOpen(false)}>
        <DialogTitle>{t('pages.sources.forceOverwriteTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Alert severity="warning">{errMsg(saveMutation.error)}</Alert>
            <Typography>{t('pages.sources.forceOverwriteBody')}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForceConfirmOpen(false)}>{t('common.cancel')}</Button>
          <Button
            color="error"
            variant="contained"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate({ force: true })}
          >
            {t('pages.sources.forceOverwrite')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

function BackupsTab({ sourceId, stateKey }: { sourceId: string; stateKey: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { hasScope } = useAuth()
  const canEdit = hasScope('state:write')
  const [viewBackupId, setViewBackupId] = useState<string | null>(null)
  const [diffBackupId, setDiffBackupId] = useState<string | null>(null)

  const q = useQuery({
    queryKey: queryKeys.sources.backups(sourceId, stateKey),
    queryFn: () => api.listBackups(sourceId, stateKey),
  })

  const restoreMutation = useMutation({
    mutationFn: (backupId: string) => api.restoreBackup(sourceId, backupId, stateKey),
    onSuccess: () => {
      for (const key of [
        queryKeys.sources.raw(sourceId, stateKey),
        queryKeys.sources.analysis(sourceId, stateKey),
        queryKeys.sources.resources(sourceId, stateKey),
        queryKeys.sources.backups(sourceId, stateKey),
        // The browse panel's list shows size/serial-affected metadata too.
        queryKeys.sources.states(sourceId),
      ]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })

  if (q.isLoading) return <CircularProgress />
  if (q.isError || !q.data) return <Alert severity="error">{t('pages.sources.backupsFailed')}</Alert>
  if (q.data.length === 0) {
    return (
      <Typography color="text.secondary">
        {t('pages.sources.noBackups')}
      </Typography>
    )
  }

  return (
    <Stack spacing={1}>
      {restoreMutation.isError && <Alert severity="error">{errMsg(restoreMutation.error)}</Alert>}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('common.created')}</TableCell>
            <TableCell align="right">{t('pages.sources.serialHeader')}</TableCell>
            <TableCell>By</TableCell>
            <TableCell align="right">{t('pages.sources.action')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {q.data.map((b) => (
            <TableRow key={b.id}>
              <TableCell>{new Date(b.created_at).toLocaleString()}</TableCell>
              <TableCell align="right">{b.serial ?? '—'}</TableCell>
              <TableCell sx={{ wordBreak: 'break-all' }}>{b.created_by || '—'}</TableCell>
              <TableCell align="right">
                <Button size="small" onClick={() => setViewBackupId(b.id)}>
                  {t('pages.sources.viewBackup')}
                </Button>
                <Button size="small" onClick={() => setDiffBackupId(b.id)}>
                  {t('pages.sources.previewRestore')}
                </Button>
                <Button
                  size="small"
                  disabled={!canEdit || restoreMutation.isPending}
                  onClick={() => restoreMutation.mutate(b.id)}
                >
                  {t('pages.sources.restore')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <BackupContentDialog
        sourceId={sourceId}
        backupId={viewBackupId}
        onClose={() => setViewBackupId(null)}
      />
      <BackupDiffDialog
        sourceId={sourceId}
        stateKey={stateKey}
        backupId={diffBackupId}
        canRestore={canEdit && !restoreMutation.isPending}
        onRestore={(backupId) => {
          setDiffBackupId(null)
          restoreMutation.mutate(backupId)
        }}
        onClose={() => setDiffBackupId(null)}
      />
    </Stack>
  )
}

// BackupContentDialog shows a stored backup's full state JSON (pretty-printed
// like the Raw tab), fetched only while open.
function BackupContentDialog({
  sourceId,
  backupId,
  onClose,
}: {
  sourceId: string
  backupId: string | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const q = useQuery({
    queryKey: queryKeys.sources.backupContent(sourceId, backupId ?? ''),
    queryFn: () => api.getBackupContent(sourceId, backupId ?? ''),
    enabled: backupId !== null,
  })

  let pretty = q.data ?? ''
  try {
    pretty = JSON.stringify(JSON.parse(pretty), null, 2)
  } catch {
    // not valid JSON — show as-is
  }

  return (
    <Dialog open={backupId !== null} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('pages.sources.backupContentTitle')}</DialogTitle>
      <DialogContent>
        {q.isLoading && <CircularProgress size={20} />}
        {q.isError && <Alert severity="error">{t('pages.sources.backupsFailed')}</Alert>}
        {q.data !== undefined && (
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 2,
              maxHeight: 480,
              overflow: 'auto',
              fontSize: 12,
              bgcolor: 'action.hover',
              borderRadius: 1,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
            }}
          >
            {pretty}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}

// BackupDiffDialog previews what restoring a backup would change, with a
// restore button so the preview doubles as the confirmation step.
function BackupDiffDialog({
  sourceId,
  stateKey,
  backupId,
  canRestore,
  onRestore,
  onClose,
}: {
  sourceId: string
  stateKey: string
  backupId: string | null
  canRestore: boolean
  onRestore: (backupId: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const q = useQuery({
    queryKey: queryKeys.sources.backupDiff(sourceId, backupId ?? ''),
    queryFn: () => api.getBackupDiff(sourceId, backupId ?? ''),
    enabled: backupId !== null,
  })

  const address = (r: ResourceSummary) =>
    `${r.module && r.module !== 'root' ? r.module + '.' : ''}${r.type}.${r.name}`

  const buckets: { key: string; title: string; color: 'success' | 'error' | 'warning'; sign: string; rows: ResourceSummary[] }[] =
    q.data
      ? [
        { key: 'added', title: t('pages.sources.diffAdded'), color: 'success', sign: '+', rows: q.data.added },
        { key: 'removed', title: t('pages.sources.diffRemoved'), color: 'error', sign: '−', rows: q.data.removed },
        { key: 'changed', title: t('pages.sources.diffChanged'), color: 'warning', sign: '~', rows: q.data.changed },
      ]
      : []
  const noChanges = q.data && buckets.every((b) => b.rows.length === 0)

  return (
    <Dialog open={backupId !== null} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('pages.sources.restoreDiffTitle', { key: stateKey })}</DialogTitle>
      <DialogContent>
        {q.isLoading && <CircularProgress size={20} />}
        {q.isError && <Alert severity="error">{errMsg(q.error)}</Alert>}
        {q.data && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {t('pages.sources.restoreDiffSerials', {
                backup: q.data.backup_serial ?? '—',
                current: q.data.current_serial ?? '—',
              })}
            </Typography>
            {noChanges && <Alert severity="info">{t('pages.sources.diffNoChanges')}</Alert>}
            {buckets
              .filter((b) => b.rows.length > 0)
              .map((b) => (
                <Box key={b.key}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    {b.title}
                  </Typography>
                  <Stack spacing={0.5}>
                    {b.rows.map((r) => (
                      <Stack key={address(r)} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Chip size="small" color={b.color} variant="outlined" label={b.sign} />
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {address(r)}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              ))}
            {q.data.changed.length > 0 && (
              <Alert severity="info">{t('pages.sources.diffApproxNote')}</Alert>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
        <Button
          color="warning"
          variant="contained"
          disabled={!canRestore || !backupId}
          onClick={() => backupId && onRestore(backupId)}
          data-testid="diff-restore-button"
        >
          {t('pages.sources.restore')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function AnalysisView({ result }: { result: AnalysisResult }) {
  const a = result.analysis
  const { t } = useTranslation()
  const stats: { label: string; value: string | number }[] = [
    { label: t('pages.sources.rum'), value: a.rum },
    { label: t('pages.sources.managed'), value: a.managed_resources },
    { label: t('pages.sources.dataSources'), value: a.data_sources },
    { label: t('pages.sources.totalInstances'), value: a.total_resources },
    { label: t('pages.sources.terraform'), value: a.terraform_version || '—' },
    { label: t('pages.sources.serial'), value: a.serial },
  ]

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        {stats.map((s) => (
          <Card key={s.label} variant="outlined">
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="overline" color="text.secondary">
                {s.label}
              </Typography>
              <Typography variant="h6">{s.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <BreakdownTable title={t('pages.sources.topResourceTypes')} rows={a.resource_types.slice(0, 10)} />
        <BreakdownTable title={t('pages.sources.providers')} rows={a.providers} />
      </Box>
    </Stack>
  )
}

function BreakdownTable({ title, rows }: { title: string; rows: { key: string; count: number }[] }) {
  const { t } = useTranslation()
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Divider sx={{ mb: 1 }} />
        {rows.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            {t('common.none')}
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common.name')}</TableCell>
                <TableCell align="right">{t('pages.sources.count')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell sx={{ wordBreak: 'break-all' }}>{r.key}</TableCell>
                  <TableCell align="right">{r.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function TransferDialog({
  open,
  onClose,
  sourceId,
  stateKey,
  stateName,
}: {
  open: boolean
  onClose: () => void
  sourceId: string
  stateKey: string
  stateName?: string
}) {
  const { t } = useTranslation()
  // Destination defaults to the friendly name (HCP keys are workspace ids),
  // with .tfstate appended so file-based targets list the result.
  const friendly = stateName ?? stateKey
  const defaultTarget = friendly.endsWith('.tfstate') ? friendly : `${friendly}.tfstate`
  // Re-prime the destination when the dialog opens for a (possibly different)
  // state — the component stays mounted across selection changes.
  useEffect(() => {
    if (open) setTargetKey(defaultTarget)
  }, [open, defaultTarget])
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'backup' | 'migrate'>('backup')
  const [targetSourceId, setTargetSourceId] = useState('')
  const [targetKey, setTargetKey] = useState(defaultTarget)
  const [decommission, setDecommission] = useState(false)
  const [result, setResult] = useState<TransferResult | null>(null)

  const sourcesQuery = useQuery({ queryKey: queryKeys.sources.list(), queryFn: api.listSources, enabled: open })

  const mutation = useMutation({
    mutationFn: () =>
      mode === 'backup'
        ? api.backupToSource(sourceId, stateKey, targetSourceId, targetKey)
        : api.migrateToSource(sourceId, stateKey, targetSourceId, targetKey, decommission),
    onSuccess: (r) => {
      setResult(r)
      queryClient.invalidateQueries({ queryKey: queryKeys.sources.all })
    },
  })

  const close = () => {
    setResult(null)
    mutation.reset()
    onClose()
  }

  const valid = Boolean(targetSourceId && targetKey)
  const severity: 'success' | 'warning' | 'error' =
    result?.status === 'success' ? 'success' : result?.status === 'verification_failed' ? 'warning' : 'error'

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>{t('pages.sources.transferTitle')}</DialogTitle>
      <DialogContent>
        {result ? (
          <Alert severity={severity}>
            {result.mode} {result.status}
            {result.verified != null ? ` · verified: ${result.verified ? 'yes' : 'no'}` : ''}
            {result.decommissioned ? ' · source decommissioned' : ''}
            {result.detail ? ` — ${result.detail}` : ''}
          </Alert>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <Trans i18nKey="pages.sources.copyTo" values={{ name: stateName ?? stateKey }} components={{ 1: <b /> }} />
            </Typography>
            <TextField
              select
              label={t('pages.transfer.mode')}
              value={mode}
              onChange={(e) => setMode(e.target.value as 'backup' | 'migrate')}
              fullWidth
            >
              <MenuItem value="backup">{t('pages.transfer.modeBackup')}</MenuItem>
              <MenuItem value="migrate">{t('pages.transfer.modeMigrate')}</MenuItem>
            </TextField>
            <TextField
              select
              label={t('pages.transfer.targetSource')}
              value={targetSourceId}
              onChange={(e) => setTargetSourceId(e.target.value)}
              fullWidth
            >
              {sourcesQuery.data?.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} ({s.type})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t('pages.transfer.targetKey')}
              value={targetKey}
              onChange={(e) => setTargetKey(e.target.value)}
              helperText={t('pages.transfer.targetKeyHelp')}
              fullWidth
            />
            <TargetBackendHint type={sourcesQuery.data?.find((s) => s.id === targetSourceId)?.type} />
            {mode === 'migrate' && (
              <FormControlLabel
                control={<Checkbox checked={decommission} onChange={(e) => setDecommission(e.target.checked)} />}
                label={t('pages.transfer.decommissionLabel')}
              />
            )}
            {mutation.isError && <Alert severity="error">{errMsg(mutation.error)}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{result ? 'Close' : 'Cancel'}</Button>
        {!result && (
          <Button variant="contained" disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
            {mode === 'backup' ? 'Backup' : 'Migrate'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

interface FieldDef {
  key: string
  label: string
  secret?: boolean
  optional?: boolean
  credential?: boolean
  placeholder?: string
  helper?: string
}

const SOURCE_TYPES: { value: string; label: string; fields: FieldDef[] }[] = [
  {
    value: 'local',
    label: 'Local directory',
    fields: [
      { key: 'base_path', label: 'Base path', placeholder: '/path/to/tfstate', helper: 'Directory scanned for .tfstate files' },
    ],
  },
  {
    value: 'hcp',
    label: 'HCP Terraform / Terraform Enterprise',
    fields: [
      { key: 'organization', label: 'Organization' },
      { key: 'hostname', label: 'Hostname', optional: true, placeholder: 'app.terraform.io' },
      { key: 'token', label: 'API token', secret: true, credential: true, helper: 'Stored encrypted at rest' },
    ],
  },
  {
    value: 's3',
    label: 'AWS S3 (or S3-compatible)',
    fields: [
      { key: 'bucket', label: 'Bucket' },
      { key: 'region', label: 'Region', optional: true, placeholder: 'us-east-1' },
      { key: 'prefix', label: 'Key prefix', optional: true },
      { key: 'endpoint', label: 'Endpoint (S3-compatible)', optional: true, placeholder: 'https://…' },
      { key: 'access_key_id', label: 'Access key ID', optional: true, credential: true },
      { key: 'secret_access_key', label: 'Secret access key', secret: true, optional: true, credential: true },
    ],
  },
  {
    value: 'azureblob',
    label: 'Azure Blob Storage',
    fields: [
      { key: 'account', label: 'Storage account' },
      { key: 'container', label: 'Container' },
      { key: 'prefix', label: 'Blob prefix', optional: true },
      { key: 'account_key', label: 'Account key', secret: true, credential: true, helper: 'Stored encrypted at rest' },
    ],
  },
  {
    value: 'gcs',
    label: 'Google Cloud Storage',
    fields: [
      { key: 'bucket', label: 'Bucket' },
      { key: 'prefix', label: 'Object prefix', optional: true },
      {
        key: 'credentials_json',
        label: 'Service account JSON',
        secret: true,
        optional: true,
        credential: true,
        helper: 'Paste the key JSON, or leave blank to use Application Default Credentials',
      },
    ],
  },
  {
    value: 'git',
    label: 'Git repository',
    fields: [
      { key: 'repo_url', label: 'Repository URL', placeholder: 'https://github.com/org/repo.git' },
      { key: 'ref', label: 'Branch', optional: true, placeholder: 'main' },
      { key: 'prefix', label: 'Path prefix', optional: true },
      { key: 'username', label: 'Username', optional: true, placeholder: 'git' },
      { key: 'token', label: 'Token', secret: true, optional: true, credential: true, helper: 'For private repos; stored encrypted' },
    ],
  },
  {
    value: 'consul',
    label: 'Consul KV',
    fields: [
      { key: 'address', label: 'Address', placeholder: 'consul.example.com:8500' },
      { key: 'scheme', label: 'Scheme', optional: true, placeholder: 'http' },
      { key: 'path', label: 'KV path prefix', optional: true, placeholder: 'terraform' },
      { key: 'datacenter', label: 'Datacenter', optional: true },
      { key: 'token', label: 'ACL token', secret: true, optional: true, credential: true, helper: 'Stored encrypted at rest' },
    ],
  },
  {
    value: 'pg',
    label: 'PostgreSQL backend',
    fields: [
      {
        key: 'conn_str',
        label: 'Connection string',
        secret: true,
        credential: true,
        placeholder: 'postgres://user:pass@host:5432/db?sslmode=require',
        helper: 'Stored encrypted at rest',
      },
      { key: 'schema_name', label: 'Schema', optional: true, placeholder: 'terraform_remote_state' },
    ],
  },
  {
    value: 'kubernetes',
    label: 'Kubernetes secrets',
    fields: [
      { key: 'server', label: 'API server URL', placeholder: 'https://k8s.example.com:6443' },
      { key: 'namespace', label: 'Namespace', optional: true, placeholder: 'default' },
      { key: 'labels', label: 'Label selector', optional: true, placeholder: 'app.kubernetes.io/managed-by=terraform' },
      { key: 'ca_cert', label: 'Cluster CA (PEM)', optional: true },
      { key: 'token', label: 'Bearer token', secret: true, credential: true, helper: 'Stored encrypted at rest' },
    ],
  },
  {
    value: 'http',
    label: 'HTTP backend',
    fields: [
      { key: 'address', label: 'State URL', placeholder: 'https://state.example.com/tf/prod' },
      { key: 'lock_address', label: 'Lock URL', optional: true, helper: 'Enables native LOCK/UNLOCK locking' },
      { key: 'unlock_address', label: 'Unlock URL', optional: true },
      { key: 'update_method', label: 'Update method', optional: true, placeholder: 'POST' },
      { key: 'username', label: 'Username', optional: true, credential: true },
      { key: 'password', label: 'Password', secret: true, optional: true, credential: true, helper: 'Stored encrypted at rest' },
    ],
  },
]

function AddSourceDialog({
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
  const [type, setType] = useState('local')
  const [values, setValues] = useState<Record<string, string>>({})

  const def = SOURCE_TYPES.find((t) => t.value === type) ?? SOURCE_TYPES[0]

  const reset = () => {
    setName('')
    setValues({})
  }

  const createMutation = useMutation({
    mutationFn: () => {
      const config: Record<string, unknown> = {}
      const credentials: Record<string, unknown> = {}
      for (const f of def.fields) {
        const v = values[f.key]?.trim()
        if (!v) continue
        if (f.credential) credentials[f.key] = v
        else config[f.key] = v
      }
      return api.createSource({
        name,
        type,
        config,
        ...(Object.keys(credentials).length ? { credentials } : {}),
      })
    },
    onSuccess: () => {
      reset()
      onCreated()
    },
  })

  const valid = Boolean(name) && def.fields.filter((f) => !f.optional).every((f) => values[f.key]?.trim())

  // Test the config being entered before it is persisted; null until the
  // required fields are filled so the button stays disabled.
  const buildTestInput = (): TestSourceConfigInput | null => {
    if (!valid) return null
    const config: Record<string, unknown> = {}
    const credentials: Record<string, unknown> = {}
    for (const f of def.fields) {
      const v = values[f.key]?.trim()
      if (!v) continue
      if (f.credential) credentials[f.key] = v
      else config[f.key] = v
    }
    return { type, config, ...(Object.keys(credentials).length ? { credentials } : {}) }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('pages.sources.addSourceTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField
            select
            label={t('pages.sources.type')}
            value={type}
            onChange={(e) => {
              setType(e.target.value)
              setValues({})
            }}
            fullWidth
          >
            {SOURCE_TYPES.map((st) => (
              <MenuItem key={st.value} value={st.value}>
                {t(`pages.sources.types.${st.value}`, st.label)}
              </MenuItem>
            ))}
          </TextField>

          {def.fields.map((f) => {
            const label = t(`pages.sources.fields.${type}.${f.key}.label`, f.label)
            return (
              <TextField
                key={f.key}
                label={f.optional ? t('pages.sources.optionalField', { label }) : label}
                type={f.secret ? 'password' : 'text'}
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                helperText={f.helper ? t(`pages.sources.fields.${type}.${f.key}.helper`, f.helper) : undefined}
                fullWidth
              />
            )
          })}

          {createMutation.isError && (
            <Alert severity="error">
              {(createMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                t('pages.sources.createFailed')}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DialogTestConnection build={buildTestInput} />
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={() => createMutation.mutate()} disabled={!valid || createMutation.isPending}>
          {t('common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
