import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import StorageIcon from '@mui/icons-material/Storage'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { api, type AnalysisResult, type StateSource } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import { Trans, useTranslation } from 'react-i18next'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import CardGridSkeleton from '../components/skeletons/CardGridSkeleton'
import AddSourceDialog from './sources/AddSourceDialog'
import EditSourceDialog from './sources/EditSourceDialog'
import SourceCard from './sources/SourceCard'
import StatesBrowser from './sources/StatesBrowser'
import { AnalysisView } from './sources/tabs/AnalysisTab'

// Composition root for /sources. It owns the source list itself — the card grid,
// which source and state are selected, the add/edit/delete-source dialogs, and
// the upload-and-analyze shortcut in the header. Everything below a source card
// (browsing its states, the seven detail tabs, and the state-level dialogs)
// lives under ./sources/.
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
          <SourceCard
            key={s.id}
            source={s}
            sync={syncBySource.get(s.id)}
            deleteDisabled={deleteMutation.isPending}
            onBrowse={() => {
              setSelectedSource(s)
              setSelectedKey(null)
            }}
            onEdit={() => setEditTarget(s)}
            onDelete={() => setDeleteTarget(s)}
          />
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
              components={{ 1: <b /> }}
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
