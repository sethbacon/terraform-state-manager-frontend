import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  type SelectChangeEvent,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import HistoryIcon from '@mui/icons-material/History'
import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import PageTitleIcon from '@mui/icons-material/History'
import { api, type AuditLogEntry, type AuditLogFilters } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'

const RESOURCE_TYPES = [
  '',
  'user',
  'organization',
  'state',
  'source',
  'schedule',
  'notification_channel',
  'ci_source',
  'pipeline_connection',
  'drift_run',
  'health_run',
  'sso',
]

// Client-side export helpers (registry pattern): serialize the currently
// filtered rows and trigger a browser download via a temporary blob URL.
function download(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function exportCSV(logs: AuditLogEntry[]) {
  const header = ['created_at', 'action', 'resource_type', 'resource_id', 'user_email', 'user_name', 'ip_address']
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = logs.map((l) =>
    [l.created_at, l.action, l.resource_type, l.resource_id, l.user_email, l.user_name, l.ip_address].map(esc).join(','),
  )
  download('audit-logs.csv', 'text/csv', [header.join(','), ...rows].join('\n'))
}

function exportJSON(logs: AuditLogEntry[]) {
  download('audit-logs.json', 'application/json', JSON.stringify(logs, null, 2))
}

export default function AuditLogPage() {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)

  // Pagination (MUI TablePagination uses 0-based page)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Filters
  const [resourceType, setResourceType] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [userEmailFilter, setUserEmailFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Debounced values for text inputs
  const [debouncedAction, setDebouncedAction] = useState('')
  const [debouncedUserEmail, setDebouncedUserEmail] = useState('')
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Detail dialog + export menu
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null)

  const filterParams: AuditLogFilters = {
    ...(resourceType ? { resource_type: resourceType } : {}),
    ...(debouncedAction ? { action: debouncedAction } : {}),
    ...(debouncedUserEmail ? { user_email: debouncedUserEmail } : {}),
    ...(startDate ? { start_date: new Date(startDate).toISOString() } : {}),
    ...(endDate ? { end_date: new Date(endDate).toISOString() } : {}),
  }
  const queryParams: AuditLogFilters = { page: page + 1, per_page: rowsPerPage, ...filterParams }

  const logsQuery = useQuery({
    queryKey: queryKeys.admin.auditLogs(queryParams as Record<string, unknown>),
    queryFn: () => api.listAuditLogs(queryParams),
  })
  const logs = logsQuery.data?.logs ?? []
  const total = logsQuery.data?.total ?? 0

  const debounce = (apply: () => void) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      apply()
      setPage(0)
    }, 400)
  }

  const handleResetFilters = () => {
    setResourceType('')
    setActionFilter('')
    setDebouncedAction('')
    setUserEmailFilter('')
    setDebouncedUserEmail('')
    setStartDate('')
    setEndDate('')
    setPage(0)
  }

  const handleExport = async (format: 'csv' | 'json') => {
    setExportAnchor(null)
    try {
      const result = await api.listAuditLogs({ per_page: 1000, ...filterParams })
      if (format === 'csv') exportCSV(result.logs ?? [])
      else exportJSON(result.logs ?? [])
    } catch {
      setError(t('admin.auditLog.errExport'))
    }
  }

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString()
    } catch {
      return ts
    }
  }

  return (
    <Box aria-busy={logsQuery.isLoading} aria-live="polite">
      <PageHeader
        icon={<PageTitleIcon />}
        title={t('admin.auditLog.pageTitle')}
        description={t('admin.auditLog.pageSubtitle')}
        actions={
          <>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={(e) => setExportAnchor(e.currentTarget)}>
              {t('admin.auditLog.export')}
            </Button>
            <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
              <MenuItem onClick={() => handleExport('csv')}>{t('admin.auditLog.exportCsv')}</MenuItem>
              <MenuItem onClick={() => handleExport('json')}>{t('admin.auditLog.exportJson')}</MenuItem>
            </Menu>
          </>
        }
      />
      {/* Filter Bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <TextField
            label={t('admin.auditLog.labelStartDate')}
            type="datetime-local"
            size="small"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              setPage(0)
            }}
            sx={{ minWidth: 200 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label={t('admin.auditLog.labelEndDate')}
            type="datetime-local"
            size="small"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value)
              setPage(0)
            }}
            sx={{ minWidth: 200 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="resource-type-label">{t('admin.auditLog.labelResourceType')}</InputLabel>
            <Select
              labelId="resource-type-label"
              value={resourceType}
              label={t('admin.auditLog.labelResourceType')}
              onChange={(e: SelectChangeEvent) => {
                setResourceType(e.target.value)
                setPage(0)
              }}
            >
              {RESOURCE_TYPES.map((rt) => (
                <MenuItem key={rt} value={rt}>
                  {rt === '' ? t('admin.auditLog.allResourceTypes') : rt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={t('admin.auditLog.labelAction')}
            size="small"
            placeholder="e.g. user.create"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value)
              debounce(() => setDebouncedAction(e.target.value))
            }}
            sx={{ minWidth: 220 }}
          />
          <TextField
            label={t('admin.auditLog.labelUserEmail')}
            size="small"
            placeholder={t('admin.auditLog.placeholderUserEmail')}
            value={userEmailFilter}
            onChange={(e) => {
              setUserEmailFilter(e.target.value)
              debounce(() => setDebouncedUserEmail(e.target.value))
            }}
            sx={{ minWidth: 200 }}
          />
          <Button variant="text" onClick={handleResetFilters}>
            {t('admin.auditLog.reset')}
          </Button>
        </Box>
      </Paper>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Paper variant="outlined">
        {logsQuery.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress aria-label={t('common.loading')} />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>{t('admin.auditLog.thTimestamp')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('admin.auditLog.thAction')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('admin.auditLog.thResource')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('admin.auditLog.thUser')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('admin.auditLog.thIpAddress')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ p: 0, border: 0 }}>
                        <EmptyState
                          title={t('admin.auditLog.emptyTitle')}
                          description={t('admin.auditLog.emptySubtitle')}
                          icon={<HistoryIcon />}
                          data-testid="audit-log-empty-state"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedLog(log)}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatTimestamp(log.created_at)}</TableCell>
                        <TableCell
                          sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {log.action}
                        </TableCell>
                        <TableCell>{log.resource_type ?? '—'}</TableCell>
                        <TableCell>{log.user_email ?? log.user_name ?? log.user_id ?? '—'}</TableCell>
                        <TableCell>{log.ip_address ?? '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10))
                setPage(0)
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </Paper>

      {/* Detail Dialog */}
      <Dialog open={Boolean(selectedLog)} onClose={() => setSelectedLog(null)} maxWidth="md" fullWidth>
        <DialogTitle>{t('admin.auditLog.detailTitle')}</DialogTitle>
        <DialogContent dividers>
          {selectedLog && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                {(
                  [
                    ['detailId', selectedLog.id, true],
                    ['thTimestamp', formatTimestamp(selectedLog.created_at), false],
                    ['thAction', selectedLog.action, true],
                    ['labelResourceType', selectedLog.resource_type ?? '—', false],
                    ['detailResourceId', selectedLog.resource_id ?? '—', true],
                    ['thIpAddress', selectedLog.ip_address ?? '—', false],
                    [
                      'thUser',
                      selectedLog.user_email
                        ? `${selectedLog.user_email}${selectedLog.user_name ? ` (${selectedLog.user_name})` : ''}`
                        : (selectedLog.user_id ?? '—'),
                      false,
                    ],
                    ['detailOrgId', selectedLog.organization_id ?? '—', true],
                  ] as [string, string, boolean][]
                ).map(([key, value, mono]) => (
                  <Box key={key}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {t(`admin.auditLog.${key}`)}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={mono ? { fontFamily: 'monospace', wordBreak: 'break-all' } : undefined}
                    >
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {t('admin.auditLog.detailMetadata')}
                  </Typography>
                  <Paper variant="outlined" sx={{ mt: 0.5, p: 1.5 }}>
                    <pre style={{ margin: 0, fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedLog(null)}>{t('admin.auditLog.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
