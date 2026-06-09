import { type ChangeEvent, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
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
  ListItemText,
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
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import StorageIcon from '@mui/icons-material/Storage'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { api, type AnalysisResult, type StateSource, type TransferResult } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import { useAuth } from '../contexts/AuthContext'

function errMsg(e: unknown): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Request failed.'
}

export default function SourcesPage() {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [selectedSource, setSelectedSource] = useState<StateSource | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const sourcesQuery = useQuery({ queryKey: queryKeys.sources.list(), queryFn: api.listSources })

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
        setUploadError('Could not analyze that file — is it a valid Terraform state JSON?')
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Sources
        </Typography>
        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          sx={{ mr: 1 }}
          onClick={() => fileInputRef.current?.click()}
        >
          Analyze a file
        </Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          Add source
        </Button>
        <input ref={fileInputRef} type="file" accept=".tfstate,application/json" hidden onChange={handleFile} />
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 720 }}>
        Connect to where Terraform state already lives, then browse and analyze it. Local directories, HCP/TFC,
        AWS S3 (and S3-compatible), and Azure Blob are supported; GCS and Git are on the roadmap. You can also
        analyze a one-off <code>.tfstate</code> file without saving a source.
      </Typography>

      {uploadError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUploadError(null)}>
          {uploadError}
        </Alert>
      )}

      {sourcesQuery.isLoading && <CircularProgress />}
      {sourcesQuery.isError && <Alert severity="error">Failed to load sources.</Alert>}

      {sourcesQuery.data && sourcesQuery.data.length === 0 && (
        <Alert severity="info">No sources yet. Add a local source pointing at a directory of `.tfstate` files.</Alert>
      )}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {sourcesQuery.data?.map((s) => (
          <Card key={s.id} variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center">
                <StorageIcon color="action" />
                <Typography variant="h6" sx={{ flexGrow: 1, wordBreak: 'break-word' }}>
                  {s.name}
                </Typography>
                <Chip size="small" label={s.type} />
              </Stack>
              {typeof s.config?.base_path === 'string' && (
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                  {String(s.config.base_path)}
                </Typography>
              )}
            </CardContent>
            <CardActions>
              <Button
                size="small"
                onClick={() => {
                  setSelectedSource(s)
                  setSelectedKey(null)
                }}
              >
                Browse states
              </Button>
              <Box sx={{ flexGrow: 1 }} />
              <IconButton
                size="small"
                aria-label="delete source"
                onClick={() => deleteMutation.mutate(s.id)}
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

      <Dialog open={Boolean(uploadResult)} onClose={() => setUploadResult(null)} fullWidth maxWidth="md">
        <DialogTitle>Analysis — {uploadResult?.key}</DialogTitle>
        <DialogContent>{uploadResult && <AnalysisView result={uploadResult} />}</DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadResult(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function StatesBrowser({
  source,
  selectedKey,
  onSelectKey,
}: {
  source: StateSource
  selectedKey: string | null
  onSelectKey: (key: string) => void
}) {
  const statesQuery = useQuery({
    queryKey: queryKeys.sources.states(source.id),
    queryFn: () => api.listStates(source.id),
  })

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        States in {source.name}
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '320px 1fr' } }}>
        <Card variant="outlined">
          {statesQuery.isLoading && (
            <Box sx={{ p: 2 }}>
              <CircularProgress size={20} />
            </Box>
          )}
          {statesQuery.isError && <Alert severity="error">Failed to list states.</Alert>}
          {statesQuery.data && statesQuery.data.length === 0 && (
            <Box sx={{ p: 2 }}>
              <Typography color="text.secondary">No `.tfstate` files found.</Typography>
            </Box>
          )}
          <List dense disablePadding>
            {statesQuery.data?.map((st) => (
              <ListItemButton
                key={st.key}
                selected={selectedKey === st.key}
                onClick={() => onSelectKey(st.key)}
              >
                <ListItemText
                  primary={st.name}
                  secondary={`${(st.size / 1024).toFixed(1)} KB${
                    st.last_modified ? ` · ${new Date(st.last_modified).toLocaleString()}` : ''
                  }`}
                />
              </ListItemButton>
            ))}
          </List>
        </Card>

        <Box>
          {selectedKey ? (
            <StateDetail sourceId={source.id} stateKey={selectedKey} />
          ) : (
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary">Select a state to view its analysis.</Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
    </Box>
  )
}

function StateDetail({ sourceId, stateKey }: { sourceId: string; stateKey: string }) {
  const { hasScope } = useAuth()
  const [tab, setTab] = useState(0)
  const [transferOpen, setTransferOpen] = useState(false)
  const [opsOpen, setOpsOpen] = useState(false)
  return (
    <>
      <Card variant="outlined">
        <Stack direction="row" alignItems="center" sx={{ px: 2, pt: 1, flexWrap: 'wrap', gap: 1 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v as number)} sx={{ flexGrow: 1, minHeight: 0 }}>
            <Tab label="Analysis" />
            <Tab label="Resources" />
            <Tab label="Raw" />
            <Tab label="Backups" />
          </Tabs>
          {hasScope('state:write') && (
            <Button size="small" variant="outlined" onClick={() => setOpsOpen(true)}>
              State ops
            </Button>
          )}
          {hasScope('state:transfer') && (
            <Button size="small" variant="outlined" startIcon={<SwapHorizIcon />} onClick={() => setTransferOpen(true)}>
              Transfer
            </Button>
          )}
          <ButtonGroup size="small" variant="outlined" aria-label="export report">
            <Button startIcon={<DownloadIcon />} onClick={() => api.downloadReport(sourceId, stateKey, 'md')}>
              MD
            </Button>
            <Button onClick={() => api.downloadReport(sourceId, stateKey, 'json')}>JSON</Button>
            <Button onClick={() => api.downloadReport(sourceId, stateKey, 'csv')}>CSV</Button>
          </ButtonGroup>
        </Stack>
        <Divider />
        <CardContent>
          {tab === 0 && <AnalysisTab sourceId={sourceId} stateKey={stateKey} />}
          {tab === 1 && <ResourcesTab sourceId={sourceId} stateKey={stateKey} />}
          {tab === 2 && <RawTab sourceId={sourceId} stateKey={stateKey} />}
          {tab === 3 && <BackupsTab sourceId={sourceId} stateKey={stateKey} />}
        </CardContent>
      </Card>
      <TransferDialog
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        sourceId={sourceId}
        stateKey={stateKey}
      />
      <StateOpsDialog open={opsOpen} onClose={() => setOpsOpen(false)} sourceId={sourceId} stateKey={stateKey} />
    </>
  )
}

function StateOpsDialog({
  open,
  onClose,
  sourceId,
  stateKey,
}: {
  open: boolean
  onClose: () => void
  sourceId: string
  stateKey: string
}) {
  const queryClient = useQueryClient()
  const [op, setOp] = useState<'rm' | 'mv'>('rm')
  const [address, setAddress] = useState('')
  const [to, setTo] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.stateOperation(sourceId, stateKey, op, address, op === 'mv' ? to : undefined),
    onSuccess: () => {
      setAddress('')
      setTo('')
      for (const key of [
        queryKeys.sources.raw(sourceId, stateKey),
        queryKeys.sources.analysis(sourceId, stateKey),
        queryKeys.sources.resources(sourceId, stateKey),
        queryKeys.sources.backups(sourceId, stateKey),
      ]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      onClose()
    },
  })

  const valid = Boolean(address) && (op === 'rm' || Boolean(to))

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>State operation</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Structured edit of <b>{stateKey}</b>. The current version is backed up first and the change is audited.
          </Typography>
          <TextField select label="Operation" value={op} onChange={(e) => setOp(e.target.value as 'rm' | 'mv')} fullWidth>
            <MenuItem value="rm">Remove (terraform state rm)</MenuItem>
            <MenuItem value="mv">Move / rename (terraform state mv)</MenuItem>
          </TextField>
          <TextField
            label="Resource address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="aws_instance.web or module.vpc.aws_subnet.private"
            fullWidth
          />
          {op === 'mv' && (
            <TextField
              label="New address"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="aws_instance.web2"
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
  const q = useQuery({
    queryKey: queryKeys.sources.analysis(sourceId, stateKey),
    queryFn: () => api.analyzeState(sourceId, stateKey),
  })
  if (q.isLoading) return <CircularProgress />
  if (q.isError || !q.data) return <Alert severity="error">Failed to analyze this state file.</Alert>
  return <AnalysisView result={q.data} />
}

function ResourcesTab({ sourceId, stateKey }: { sourceId: string; stateKey: string }) {
  const [filter, setFilter] = useState('')
  const q = useQuery({
    queryKey: queryKeys.sources.resources(sourceId, stateKey),
    queryFn: () => api.listStateResources(sourceId, stateKey),
  })
  if (q.isLoading) return <CircularProgress />
  if (q.isError || !q.data) return <Alert severity="error">Failed to load resources.</Alert>

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
        placeholder="Filter by type, name, module, or provider…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        fullWidth
      />
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Module</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Provider</TableCell>
            <TableCell>Mode</TableCell>
            <TableCell align="right">Instances</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={`${r.module}/${r.type}.${r.name}-${i}`}>
              <TableCell sx={{ wordBreak: 'break-all' }}>{r.module}</TableCell>
              <TableCell>{r.type}</TableCell>
              <TableCell>{r.name}</TableCell>
              <TableCell>{r.provider}</TableCell>
              <TableCell>{r.mode}</TableCell>
              <TableCell align="right">{r.instances}</TableCell>
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

function RawTab({ sourceId, stateKey }: { sourceId: string; stateKey: string }) {
  const queryClient = useQueryClient()
  const { hasScope } = useAuth()
  const canEdit = hasScope('state:write')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

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
    ]) {
      queryClient.invalidateQueries({ queryKey: key })
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => api.editState(sourceId, stateKey, draft),
    onSuccess: () => {
      setEditing(false)
      setConfirmOpen(false)
      invalidateState()
    },
  })

  if (q.isLoading) return <CircularProgress />
  if (q.isError || q.data === undefined) return <Alert severity="error">Failed to load raw state.</Alert>

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
      <Stack direction="row" alignItems="center">
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
            Edit
          </Button>
        )}
        {editing && (
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="small" variant="contained" disabled={!draftValid} onClick={() => setConfirmOpen(true)}>
              Save
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
              !draftValid
                ? 'Not valid JSON'
                : 'On save, the current version is backed up, the change is validated, and the edit is audited.'
            }
            sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 12 } }}
            fullWidth
          />
          {saveMutation.isError && <Alert severity="error">{errMsg(saveMutation.error)}</Alert>}
        </>
      ) : (
        <Box
          component="pre"
          sx={{ m: 0, p: 2, maxHeight: 480, overflow: 'auto', fontSize: 12, bgcolor: 'action.hover', borderRadius: 1, whiteSpace: 'pre' }}
        >
          {pretty}
        </Box>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Overwrite state?</DialogTitle>
        <DialogContent>
          <Typography>
            The current version of <b>{stateKey}</b> will be backed up, then replaced. You can revert from the
            Backups tab.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button color="warning" variant="contained" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            Overwrite
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

function BackupsTab({ sourceId, stateKey }: { sourceId: string; stateKey: string }) {
  const queryClient = useQueryClient()
  const { hasScope } = useAuth()
  const canEdit = hasScope('state:write')

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
      ]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })

  if (q.isLoading) return <CircularProgress />
  if (q.isError || !q.data) return <Alert severity="error">Failed to load backups.</Alert>
  if (q.data.length === 0) {
    return (
      <Typography color="text.secondary">
        No backups yet — one is captured automatically before each edit or restore.
      </Typography>
    )
  }

  return (
    <Stack spacing={1}>
      {restoreMutation.isError && <Alert severity="error">{errMsg(restoreMutation.error)}</Alert>}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Created</TableCell>
            <TableCell align="right">Serial</TableCell>
            <TableCell>By</TableCell>
            <TableCell align="right">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {q.data.map((b) => (
            <TableRow key={b.id}>
              <TableCell>{new Date(b.created_at).toLocaleString()}</TableCell>
              <TableCell align="right">{b.serial ?? '—'}</TableCell>
              <TableCell sx={{ wordBreak: 'break-all' }}>{b.created_by || '—'}</TableCell>
              <TableCell align="right">
                <Button
                  size="small"
                  disabled={!canEdit || restoreMutation.isPending}
                  onClick={() => restoreMutation.mutate(b.id)}
                >
                  Restore
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  )
}

function AnalysisView({ result }: { result: AnalysisResult }) {
  const a = result.analysis
  const stats: { label: string; value: string | number }[] = [
    { label: 'RUM', value: a.rum },
    { label: 'Managed', value: a.managed_resources },
    { label: 'Data sources', value: a.data_sources },
    { label: 'Total instances', value: a.total_resources },
    { label: 'Terraform', value: a.terraform_version || '—' },
    { label: 'Serial', value: a.serial },
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
        <BreakdownTable title="Top resource types" rows={a.resource_types.slice(0, 10)} />
        <BreakdownTable title="Providers" rows={a.providers} />
      </Box>
    </Stack>
  )
}

function BreakdownTable({ title, rows }: { title: string; rows: { key: string; count: number }[] }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Divider sx={{ mb: 1 }} />
        {rows.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            None
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell align="right">Count</TableCell>
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
}: {
  open: boolean
  onClose: () => void
  sourceId: string
  stateKey: string
}) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'backup' | 'migrate'>('backup')
  const [targetSourceId, setTargetSourceId] = useState('')
  const [targetKey, setTargetKey] = useState(stateKey)
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
      <DialogTitle>Transfer state</DialogTitle>
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
              Copy <b>{stateKey}</b> to another source.
            </Typography>
            <TextField
              select
              label="Mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as 'backup' | 'migrate')}
              fullWidth
            >
              <MenuItem value="backup">Backup (copy)</MenuItem>
              <MenuItem value="migrate">Migrate (copy + verify parity)</MenuItem>
            </TextField>
            <TextField
              select
              label="Target source"
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
              label="Target key"
              value={targetKey}
              onChange={(e) => setTargetKey(e.target.value)}
              helperText="Destination path/key within the target source"
              fullWidth
            />
            {mode === 'migrate' && (
              <FormControlLabel
                control={<Checkbox checked={decommission} onChange={(e) => setDecommission(e.target.checked)} />}
                label="Decommission source after a verified migrate (empties the original; backed up first)"
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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add state source</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField
            select
            label="Type"
            value={type}
            onChange={(e) => {
              setType(e.target.value)
              setValues({})
            }}
            fullWidth
          >
            {SOURCE_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>

          {def.fields.map((f) => (
            <TextField
              key={f.key}
              label={f.optional ? `${f.label} (optional)` : f.label}
              type={f.secret ? 'password' : 'text'}
              value={values[f.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              helperText={f.helper}
              fullWidth
            />
          ))}

          {createMutation.isError && (
            <Alert severity="error">
              {(createMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                'Failed to create source.'}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => createMutation.mutate()} disabled={!valid || createMutation.isPending}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}
