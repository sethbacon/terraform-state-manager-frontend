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
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Trans, useTranslation } from 'react-i18next'
import { api, type EditDiff, type ResourceSummary } from '../../../services/api'
import { queryKeys } from '../../../services/queryKeys'
import { useAuth } from '../../../contexts/AuthContext'
import { extractApiError as errMsg } from '../../../utils/apiError'

// EditDiffSummary renders the resource-level diff of a pending edit (what saving
// the draft would add / remove / change vs. the current server state), shown in
// the force-overwrite dialog. "changed" is an instance-count/key approximation,
// not an attribute diff (#214).
function EditDiffSummary({ diff }: { diff: EditDiff }) {
  const { t } = useTranslation()
  const addr = (r: ResourceSummary) =>
    `${r.module && r.module !== 'root' ? r.module + '.' : ''}${r.type}.${r.name}`
  const buckets: {
    key: string
    label: string
    color: 'success' | 'error' | 'warning'
    sign: string
    rows: ResourceSummary[]
  }[] = [
    { key: 'added', label: t('pages.sources.forceDiffAdded'), color: 'success', sign: '+', rows: diff.added },
    { key: 'removed', label: t('pages.sources.forceDiffRemoved'), color: 'error', sign: '−', rows: diff.removed },
    { key: 'changed', label: t('pages.sources.forceDiffChanged'), color: 'warning', sign: '~', rows: diff.changed },
  ]
  const noChanges = buckets.every((b) => b.rows.length === 0)
  return (
    <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
      {noChanges && <Alert severity="info">{t('pages.sources.forceDiffNone')}</Alert>}
      {buckets
        .filter((b) => b.rows.length > 0)
        .map((b) => (
          <Box key={b.key} sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              {b.label} ({b.rows.length})
            </Typography>
            <Stack spacing={0.5}>
              {b.rows.map((r) => (
                <Stack key={addr(r)} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip size="small" color={b.color} variant="outlined" label={b.sign} />
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {addr(r)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        ))}
      {diff.changed.length > 0 && (
        <Alert severity="info" sx={{ mt: 1 }}>
          {t('pages.sources.forceDiffApprox')}
        </Alert>
      )}
    </Box>
  )
}

// The raw state JSON, with an in-place editor for state:write holders. Both
// confirmation dialogs live here because they are stages of the one save flow:
// the first confirms an ordinary overwrite, the second appears only after the
// backend rejects that save with a 409 and offers ?force=true instead.
export default function RawTab({ sourceId, stateKey }: { sourceId: string; stateKey: string }) {
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

  // Computed diff (draft vs. current server state) for the force-overwrite
  // dialog. Fetched on demand (enabled: false) only when a 409 occurs; not
  // cached (gcTime: 0) since the draft changes between attempts (#214).
  const diffQuery = useQuery({
    queryKey: queryKeys.sources.editDiff(sourceId, stateKey),
    queryFn: () => api.getEditDiff(sourceId, stateKey, draft),
    enabled: false,
    gcTime: 0,
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
      // ?force=true, so offer it explicitly instead of dead-ending. Refetch the
      // current server state and compute a draft-vs-current diff so the force
      // dialog can show the operator exactly what their draft would overwrite
      // before they confirm (#214).
      if ((e as { response?: { status?: number } })?.response?.status === 409) {
        q.refetch()
        diffQuery.refetch()
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

      <Dialog open={forceConfirmOpen} onClose={() => setForceConfirmOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('pages.sources.forceOverwriteTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Alert severity="warning">{errMsg(saveMutation.error)}</Alert>
            <Typography>{t('pages.sources.forceOverwriteBody')}</Typography>
            {/* Show a resource-level diff of the draft vs. the current server state
                so the operator sees exactly what forcing would clobber (#214). If the
                diff can't be computed, fall back to the raw current state. */}
            <Typography variant="subtitle2">{t('pages.sources.forceDiffLabel')}</Typography>
            {diffQuery.isFetching || q.isFetching ? (
              <CircularProgress size={20} />
            ) : diffQuery.data ? (
              <EditDiffSummary diff={diffQuery.data} />
            ) : (
              <>
                <Alert severity="info">{t('pages.sources.forceDiffFailed')}</Alert>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 2,
                    maxHeight: 300,
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
              </>
            )}
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
