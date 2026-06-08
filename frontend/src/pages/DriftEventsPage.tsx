import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Link,
  Tooltip,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import CodeIcon from '@mui/icons-material/Code'
import PublicIcon from '@mui/icons-material/Public'
import api from '@/services/api'
import { queryKeys } from '@/services/queryKeys'
import type { DriftEvent, DriftSeverity, DriftSource } from '@/types'
import EmptyState from '@/components/EmptyState'
import PageHeader from '@/components/PageHeader'

const SEVERITY_COLOR: Record<DriftSeverity, 'info' | 'warning' | 'error'> = {
  info: 'info',
  warning: 'warning',
  critical: 'error',
}

const SOURCE_ICON: Record<DriftSource, React.ReactElement> = {
  snapshot: <CompareArrowsIcon fontSize="small" />,
  code: <CodeIcon fontSize="small" />,
  environment: <PublicIcon fontSize="small" />,
}

// The backend currently emits only snapshot-comparison drift and does not yet
// populate `drift_source`, so events without it are treated as snapshot drift.
function resolveSource(event: DriftEvent): DriftSource {
  return event.drift_source ?? 'snapshot'
}

const SEVERITY_OPTIONS: DriftSeverity[] = ['info', 'warning', 'critical']
const SOURCE_OPTIONS: DriftSource[] = ['snapshot', 'code', 'environment']

const DriftEventsPage: React.FC = () => {
  const { t } = useTranslation()
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [severityFilter, setSeverityFilter] = useState<DriftSeverity | 'all'>('all')
  const [sourceFilter, setSourceFilter] = useState<DriftSource | 'all'>('all')

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.drift.list({ limit: rowsPerPage, offset: page * rowsPerPage }),
    queryFn: () => api.getDriftEvents({ limit: rowsPerPage, offset: page * rowsPerPage }),
  })

  const events = useMemo(() => data?.events ?? [], [data])
  const total = data?.total ?? 0

  // Severity/source filtering is applied client-side over the current page: the
  // backend list endpoint only supports `workspace_name` + pagination, so it
  // cannot filter by these. When no filter is active the server-side total is
  // authoritative; once a filter narrows the page we fall back to the local count.
  const filteredEvents = useMemo(
    () =>
      events.filter((e) => {
        if (severityFilter !== 'all' && e.severity !== severityFilter) return false
        if (sourceFilter !== 'all' && resolveSource(e) !== sourceFilter) return false
        return true
      }),
    [events, severityFilter, sourceFilter],
  )

  const isFiltered = severityFilter !== 'all' || sourceFilter !== 'all'

  const renderChanges = (event: DriftEvent) => {
    const { added = [], removed = [], modified = [] } = event.changes ?? {}
    if (added.length === 0 && removed.length === 0 && modified.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          {t('drift.changes.none')}
        </Typography>
      )
    }
    return (
      <Stack direction="row" spacing={1}>
        {added.length > 0 && (
          <Chip
            size="small"
            color="success"
            variant="outlined"
            label={t('drift.changes.added', { count: added.length })}
          />
        )}
        {removed.length > 0 && (
          <Chip
            size="small"
            color="error"
            variant="outlined"
            label={t('drift.changes.removed', { count: removed.length })}
          />
        )}
        {modified.length > 0 && (
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label={t('drift.changes.modified', { count: modified.length })}
          />
        )}
      </Stack>
    )
  }

  return (
    <Box aria-busy={isLoading} aria-live="polite">
      <PageHeader
        title={t('drift.title')}
        description={t('drift.subtitle')}
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {t('drift.refresh')}
          </Button>
        }
      />

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label={t('drift.filters.severityLabel')}
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as DriftSeverity | 'all')}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">{t('drift.filters.all')}</MenuItem>
          {SEVERITY_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {t(`drift.severity.${s}`)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('drift.filters.sourceLabel')}
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as DriftSource | 'all')}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">{t('drift.filters.all')}</MenuItem>
          {SOURCE_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {t(`drift.source.${s}`)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('drift.loadError')}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : filteredEvents.length === 0 ? (
        <Paper variant="outlined">
          <EmptyState
            title={t('drift.empty.title')}
            description={t('drift.empty.description')}
            icon={<CompareArrowsIcon />}
          />
        </Paper>
      ) : (
        <Paper variant="outlined">
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('drift.columns.severity')}</TableCell>
                  <TableCell>{t('drift.columns.source')}</TableCell>
                  <TableCell>{t('drift.columns.workspace')}</TableCell>
                  <TableCell>{t('drift.columns.changes')}</TableCell>
                  <TableCell>{t('drift.columns.reference')}</TableCell>
                  <TableCell>{t('drift.columns.detectedAt')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEvents.map((event) => {
                  const source = resolveSource(event)
                  return (
                    <TableRow key={event.id} hover>
                      <TableCell>
                        <Chip
                          size="small"
                          color={SEVERITY_COLOR[event.severity] ?? 'default'}
                          label={t(`drift.severity.${event.severity}`, event.severity)}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          icon={SOURCE_ICON[source]}
                          label={t(`drift.source.${source}`)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {event.workspace_name}
                        </Typography>
                      </TableCell>
                      <TableCell>{renderChanges(event)}</TableCell>
                      <TableCell>
                        {event.external_ref ? (
                          /^https?:\/\//.test(event.external_ref) ? (
                            <Link
                              href={event.external_ref}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {event.external_ref}
                            </Link>
                          ) : (
                            <Tooltip title={event.external_ref}>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
                                {event.external_ref}
                              </Typography>
                            </Tooltip>
                          )
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {t('drift.noReference')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(event.detected_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={isFiltered ? filteredEvents.length : total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10))
              setPage(0)
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Paper>
      )}
    </Box>
  )
}

export default DriftEventsPage
