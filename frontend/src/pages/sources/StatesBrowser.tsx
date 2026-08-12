import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { api, type StateSource } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import StateLocksPanel from '../../components/StateLocksPanel'
import StateDetail from './StateDetail'

// Windowing geometry for the states list: fixed-height rows inside the fixed
// 480px viewport let the visible slice be computed from scrollTop alone.
const STATE_ROW_HEIGHT = 60
const STATES_VIEWPORT_HEIGHT = 480
const STATES_VIRTUALIZE_THRESHOLD = 100

// The browse view for one source: a filterable, windowed list of its state
// objects on the left and the selected state's detail pane on the right.
export default function StatesBrowser({
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
