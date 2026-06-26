import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Collapse,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import RefreshIcon from '@mui/icons-material/Refresh'
import PageHeader from '../components/PageHeader'
import { api, type ReportFilters, type ReportFormat, type ReportStateRow, type VersionFilterOp } from '../services/api'
import { queryKeys } from '../services/queryKeys'

function apiErr(e: unknown): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Request failed.'
}

// Operator toggle, ascending so it reads older → newer. Meanings reuse the
// version drill-down's translated labels; symbols are intentionally untranslated.
const VERSION_OPS: { op: VersionFilterOp; symbol: string; labelKey: string }[] = [
  { op: 'eq', symbol: '=', labelKey: 'pages.dashboard.versionOpEq' },
  { op: 'lte', symbol: '≤', labelKey: 'pages.dashboard.versionOpLte' },
  { op: 'lt', symbol: '<', labelKey: 'pages.dashboard.versionOpLt' },
  { op: 'gte', symbol: '≥', labelKey: 'pages.dashboard.versionOpGte' },
  { op: 'gt', symbol: '>', labelKey: 'pages.dashboard.versionOpGt' },
]

const FORMATS: { value: ReportFormat; label: string }[] = [
  { value: 'md', label: 'Markdown' },
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
]

// Persist the filter set so it survives navigating away from the page and back
// (and a reload) within the browser session. sessionStorage scopes it to the tab
// and clears when the tab closes, which suits a transient report query.
const FILTERS_STORAGE_KEY = 'tsm.reports.filters'

function loadStoredFilters(): ReportFilters {
  try {
    const raw = sessionStorage.getItem(FILTERS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ReportFilters) : {}
  } catch {
    return {}
  }
}

type SortKey =
  | 'source_name'
  | 'state_key'
  | 'terraform_version'
  | 'rum'
  | 'managed_resources'
  | 'data_sources'
  | 'total_resources'
  | 'size'
  | 'analyzed_at'

// useDebounced delays propagating filter edits so typing doesn't fire a request
// per keystroke. The initial value passes through immediately.
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

export default function ReportsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<ReportFilters>(loadStoredFilters)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('rum')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [downloading, setDownloading] = useState<ReportFormat | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const queryClient = useQueryClient()

  const applied = useDebounced(draft, 350)
  const filterKey = useMemo(() => JSON.stringify(applied), [applied])

  // Persist filter edits so the last set is restored on remount; clearing all
  // filters removes the entry so a reset starts clean next time.
  useEffect(() => {
    try {
      if (Object.keys(draft).length === 0) {
        sessionStorage.removeItem(FILTERS_STORAGE_KEY)
      } else {
        sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(draft))
      }
    } catch {
      // storage unavailable (e.g. privacy mode) — filters simply won't persist
    }
  }, [draft])

  const sourcesQuery = useQuery({ queryKey: queryKeys.sources.list(), queryFn: api.listSources })
  const sources = sourcesQuery.data ?? []

  const reportQuery = useQuery({
    queryKey: queryKeys.reports.states(filterKey),
    queryFn: () => api.listReportStates(applied),
    placeholderData: keepPreviousData,
  })
  const data = reportQuery.data

  const set = (patch: Partial<ReportFilters>) => setDraft((d) => ({ ...d, ...patch }))
  const resetFilters = () => {
    setDraft({})
    setExportError(null)
  }

  const sortedRows = useMemo(() => {
    const rows = [...(data?.states ?? [])]
    rows.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [data, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'state_key' || key === 'source_name' ? 'asc' : 'desc')
    }
  }

  const openInSources = (row: ReportStateRow) => {
    const params = new URLSearchParams({ source: row.source_id, state: row.state_key })
    navigate(`/sources?${params.toString()}`)
  }

  // One-shot refresh: reconcile the persistent analysis store before re-reading,
  // scoped on the backend to the selected source(s) so a filtered view doesn't
  // reconcile the whole fleet. Writes the fresh result into the current query
  // cache key, mirroring the dashboard's force-refresh.
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const fresh = await api.listReportStates(applied, true)
      queryClient.setQueryData(queryKeys.reports.states(filterKey), fresh)
    } catch (e) {
      setExportError(apiErr(e))
    } finally {
      setRefreshing(false)
    }
  }

  const handleExport = async (format: ReportFormat) => {
    setExportError(null)
    setDownloading(format)
    try {
      await api.downloadStatesReport(applied, format)
    } catch (e) {
      setExportError(apiErr(e))
    } finally {
      setDownloading(null)
    }
  }

  const total = data?.total ?? 0

  return (
    <Box>
      <PageHeader title={t('nav.reports')} description={t('pages.reports.description')} />

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
            {t('pages.reports.filters')}
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <Autocomplete
              multiple
              size="small"
              options={sources}
              getOptionLabel={(s) => s.name}
              value={sources.filter((s) => (draft.sourceIds ?? []).includes(s.id))}
              onChange={(_, v) => set({ sourceIds: v.map((s) => s.id) })}
              renderInput={(params) => (
                <TextField {...params} label={t('pages.reports.sources')} placeholder={t('pages.reports.allSources')} />
              )}
            />
            <TextField
              size="small"
              label={t('pages.reports.searchKey')}
              value={draft.q ?? ''}
              onChange={(e) => set({ q: e.target.value })}
            />
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField
                size="small"
                label={t('pages.reports.version')}
                value={draft.version ?? ''}
                onChange={(e) => set({ version: e.target.value })}
                sx={{ flexGrow: 1 }}
              />
              <ToggleButtonGroup
                size="small"
                exclusive
                value={draft.op ?? 'eq'}
                onChange={(_, v: VersionFilterOp | null) => v && set({ op: v })}
                aria-label={t('pages.reports.versionOpAria')}
              >
                {VERSION_OPS.map(({ op, symbol, labelKey }) => (
                  <Tooltip key={op} title={t(labelKey)}>
                    <ToggleButton value={op} aria-label={t(labelKey)}>
                      {symbol}
                    </ToggleButton>
                  </Tooltip>
                ))}
              </ToggleButtonGroup>
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label={t('pages.reports.provider')}
                value={draft.provider ?? ''}
                onChange={(e) => set({ provider: e.target.value })}
                fullWidth
              />
              <TextField
                size="small"
                label={t('pages.reports.resourceType')}
                value={draft.resourceType ?? ''}
                onChange={(e) => set({ resourceType: e.target.value })}
                fullWidth
              />
            </Stack>
          </Box>

          <Button
            size="small"
            sx={{ mt: 1 }}
            startIcon={advancedOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setAdvancedOpen((o) => !o)}
          >
            {t('pages.reports.advanced')}
          </Button>
          <Collapse in={advancedOpen}>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                mt: 1,
              }}
            >
              <NumberRange
                label={t('pages.reports.rumRange')}
                min={draft.rumMin}
                max={draft.rumMax}
                onMin={(v) => set({ rumMin: v })}
                onMax={(v) => set({ rumMax: v })}
              />
              <NumberRange
                label={t('pages.reports.managedRange')}
                min={draft.managedMin}
                max={draft.managedMax}
                onMin={(v) => set({ managedMin: v })}
                onMax={(v) => set({ managedMax: v })}
              />
              <NumberRange
                label={t('pages.reports.dataRange')}
                min={draft.dataMin}
                max={draft.dataMax}
                onMin={(v) => set({ dataMin: v })}
                onMax={(v) => set({ dataMax: v })}
              />
              <NumberRange
                label={t('pages.reports.totalRange')}
                min={draft.totalMin}
                max={draft.totalMax}
                onMin={(v) => set({ totalMin: v })}
                onMax={(v) => set({ totalMax: v })}
              />
              <NumberRange
                label={t('pages.reports.sizeRange')}
                min={draft.sizeMin}
                max={draft.sizeMax}
                onMin={(v) => set({ sizeMin: v })}
                onMax={(v) => set({ sizeMax: v })}
              />
            </Box>
          </Collapse>

          <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap' }} useFlexGap>
            <Button size="small" onClick={resetFilters}>
              {t('pages.reports.reset')}
            </Button>
            <Tooltip title={t('pages.reports.refreshHint')}>
              <span>
                <Button
                  size="small"
                  startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
                  disabled={refreshing}
                  onClick={handleRefresh}
                >
                  {t('common.refresh')}
                </Button>
              </span>
            </Tooltip>
            <Box sx={{ flexGrow: 1 }} />
            {FORMATS.map((f) => (
              <Button
                key={f.value}
                variant="outlined"
                size="small"
                startIcon={downloading === f.value ? <CircularProgress size={16} /> : <DownloadIcon />}
                disabled={downloading !== null || total === 0}
                onClick={() => handleExport(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </Stack>
          {exportError && (
            <Alert severity="error" sx={{ mt: 1 }} onClose={() => setExportError(null)}>
              {exportError}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          mb: 2,
        }}
      >
        <SummaryCard label={t('pages.reports.matched')} value={data?.summary.matched ?? 0} />
        <SummaryCard label={t('pages.reports.rum')} value={data?.summary.rum ?? 0} />
        <SummaryCard label={t('pages.reports.managed')} value={data?.summary.managed_resources ?? 0} />
        <SummaryCard label={t('pages.reports.dataSources')} value={data?.summary.data_sources ?? 0} />
        <SummaryCard label={t('pages.reports.totalInstances')} value={data?.summary.total_resources ?? 0} />
      </Box>

      {reportQuery.isError && <Alert severity="error">{t('pages.reports.loadFailed')}</Alert>}

      {data && data.truncated && (
        <Alert severity="info" sx={{ mb: 1 }}>
          {t('pages.reports.truncated', { shown: data.states.length, total: data.total })}
        </Alert>
      )}

      <Card variant="outlined">
        <TableContainer sx={{ maxHeight: 560 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <SortHeader label={t('pages.reports.colSource')} col="source_name" {...{ sortKey, sortDir, toggleSort }} />
                <SortHeader label={t('pages.reports.colState')} col="state_key" {...{ sortKey, sortDir, toggleSort }} />
                <SortHeader label={t('pages.reports.colVersion')} col="terraform_version" {...{ sortKey, sortDir, toggleSort }} />
                <SortHeader label={t('pages.reports.colRum')} col="rum" align="right" {...{ sortKey, sortDir, toggleSort }} />
                <SortHeader label={t('pages.reports.colManaged')} col="managed_resources" align="right" {...{ sortKey, sortDir, toggleSort }} />
                <SortHeader label={t('pages.reports.colData')} col="data_sources" align="right" {...{ sortKey, sortDir, toggleSort }} />
                <SortHeader label={t('pages.reports.colTotal')} col="total_resources" align="right" {...{ sortKey, sortDir, toggleSort }} />
                <SortHeader label={t('pages.reports.colSize')} col="size" align="right" {...{ sortKey, sortDir, toggleSort }} />
                <SortHeader label={t('pages.reports.colAnalyzed')} col="analyzed_at" {...{ sortKey, sortDir, toggleSort }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {reportQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={22} />
                  </TableCell>
                </TableRow>
              )}
              {!reportQuery.isLoading && sortedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary" variant="body2">
                      {t('pages.reports.empty')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {sortedRows.map((r) => (
                <TableRow
                  key={`${r.source_id}:${r.state_key}`}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => openInSources(r)}
                >
                  <TableCell>{r.source_name}</TableCell>
                  <TableCell sx={{ wordBreak: 'break-all' }}>{r.state_key}</TableCell>
                  <TableCell>{r.terraform_version || t('pages.reports.unknownVersion')}</TableCell>
                  <TableCell align="right">{r.rum}</TableCell>
                  <TableCell align="right">{r.managed_resources}</TableCell>
                  <TableCell align="right">{r.data_sources}</TableCell>
                  <TableCell align="right">{r.total_resources}</TableCell>
                  <TableCell align="right">{(r.size / 1024).toFixed(1)} KB</TableCell>
                  <TableCell>{r.analyzed_at ? new Date(r.analyzed_at).toLocaleDateString() : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 1.5 }}>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h6">{value.toLocaleString()}</Typography>
      </CardContent>
    </Card>
  )
}

function SortHeader({
  label,
  col,
  align,
  sortKey,
  sortDir,
  toggleSort,
}: {
  label: string
  col: SortKey
  align?: 'right'
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  toggleSort: (k: SortKey) => void
}) {
  return (
    <TableCell align={align} sortDirection={sortKey === col ? sortDir : false}>
      <TableSortLabel active={sortKey === col} direction={sortKey === col ? sortDir : 'asc'} onClick={() => toggleSort(col)}>
        {label}
      </TableSortLabel>
    </TableCell>
  )
}

function NumberRange({
  label,
  min,
  max,
  onMin,
  onMax,
}: {
  label: string
  min?: number
  max?: number
  onMin: (v: number | undefined) => void
  onMax: (v: number | undefined) => void
}) {
  const { t } = useTranslation()
  const parse = (s: string) => (s === '' ? undefined : Number(s))
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
        <TextField
          size="small"
          type="number"
          label={t('pages.reports.min')}
          value={min ?? ''}
          onChange={(e) => onMin(parse(e.target.value))}
          fullWidth
        />
        <TextField
          size="small"
          type="number"
          label={t('pages.reports.max')}
          value={max ?? ''}
          onChange={(e) => onMax(parse(e.target.value))}
          fullWidth
        />
      </Stack>
    </Box>
  )
}
