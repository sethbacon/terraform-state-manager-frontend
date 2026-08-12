import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlineOutlined'
import StorageIcon from '@mui/icons-material/Storage'
import { useTranslation } from 'react-i18next'
import { api, type SourceSyncInfo, type StateSource } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import { extractApiError as errMsg } from '../../utils/apiError'

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

// One state source's card in the page grid. Its three adornments each own a
// request of their own (a live state count, a fire-once connection test, and
// the sync health passed down from the dashboard overview), which is why they
// live here beside the card rather than as props computed by the page.
export default function SourceCard({
  source,
  sync,
  deleteDisabled,
  onBrowse,
  onEdit,
  onDelete,
}: {
  source: StateSource
  sync?: SourceSyncInfo
  deleteDisabled: boolean
  onBrowse: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  return (
    <Card variant="outlined" sx={{ display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <StorageIcon color="action" />
          <Typography
            variant="h6"
            sx={{ flexGrow: 1, wordBreak: 'break-word', fontSize: '1.05rem', fontWeight: 600 }}
          >
            {source.name}
          </Typography>
        </Stack>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 0.5 }}>
          <Chip size="small" color="primary" label={source.type} />
          <StateCountChip sourceId={source.id} />
          <SourceSyncBadge sync={sync} />
        </Stack>
        {typeof source.config?.base_path === 'string' && (
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
            {String(source.config.base_path)}
          </Typography>
        )}
      </CardContent>
      <CardActions sx={{ flexWrap: 'wrap' }}>
        <Button size="small" onClick={onBrowse}>
          {t('pages.sources.browseStates')}
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <TestConnectionAction sourceId={source.id} />
        <IconButton size="small" aria-label={t('pages.sources.editSourceAria')} onClick={onEdit}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          aria-label={t('pages.sources.deleteSourceAria')}
          onClick={onDelete}
          disabled={deleteDisabled}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  )
}
