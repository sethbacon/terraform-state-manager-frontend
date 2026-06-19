import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import StorageIcon from '@mui/icons-material/Storage'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import {
  api,
  type Count,
  type DashboardOverview,
  type VersionFilterOp,
  type VersionStateRef,
} from '../services/api'
import { queryKeys } from '../services/queryKeys'
import DashboardCard from './DashboardCard'
import EmptyState from './EmptyState'
import CardGridSkeleton from './skeletons/CardGridSkeleton'

/**
 * EstateOverview renders the cross-source Terraform estate metrics (RUM, provider
 * and resource-type breakdowns, Terraform version spread, per-source sync state).
 * It is presentational: the overview data + refresh are owned by the parent so the
 * same metrics can compose into the authenticated dashboard. The version-bar
 * drill-down drawer is self-contained.
 */
export default function EstateOverview({
  data,
  isLoading,
  isError,
}: {
  data?: DashboardOverview
  isLoading: boolean
  isError: boolean
}) {
  const { t } = useTranslation()
  const theme = useTheme()
  const navigate = useNavigate()
  // Click-a-version drill-down: the clicked Terraform version and the active
  // comparison operator drive the side drawer listing the matching states.
  const [versionFilter, setVersionFilter] = useState<string | null>(null)
  const [versionOp, setVersionOp] = useState<VersionFilterOp>('eq')

  const palette = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.main,
    '#7e57c2',
    '#26a69a',
  ]

  return (
    <Box>
      {isLoading && <CardGridSkeleton count={6} />}
      {isError && <Alert severity="error">{t('common.error')}</Alert>}

      {data && data.sources === 0 && (
        <EmptyState
          icon={<StorageIcon />}
          title={t('pages.dashboard.empty')}
          primaryAction={{ label: t('pages.dashboard.goToSources'), onClick: () => navigate('/sources') }}
        />
      )}

      {data && data.sources > 0 && (
        <>
          {data.states_listed > data.states && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('pages.dashboard.syncPartial', {
                stored: data.states,
                listed: data.states_listed,
              })}
            </Alert>
          )}
          {data.source_errors > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('pages.dashboard.syncErrors', { count: data.source_errors })}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', mb: 3 }}>
            <DashboardCard label={t('pages.dashboard.rum')} hint={t('pages.dashboard.rumHint')} value={data.rum} />
            <DashboardCard label={t('pages.dashboard.managed')} value={data.managed_resources} />
            <DashboardCard label={t('pages.dashboard.dataSources')} value={data.data_sources} />
            <DashboardCard label={t('pages.dashboard.totalInstances')} value={data.total_resources} />
            <DashboardCard label={t('pages.dashboard.sources')} value={data.sources} />
            <DashboardCard label={t('pages.dashboard.states')} value={data.states} />
          </Box>

          {data.sync.length > 0 && (
            <Card variant="outlined" sx={{ mb: 3 }} data-testid="sync-status-panel">
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="overline" color="text.secondary">
                  {t('pages.dashboard.syncStatus')}
                </Typography>
                <Stack spacing={0.5}>
                  {data.sync.map((s) => (
                    <Stack key={s.source_id} direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {s.name}
                      </Typography>
                      <Chip size="small" variant="outlined" label={s.type} />
                      {s.synced ? (
                        <>
                          <Typography variant="caption" color="text.secondary">
                            {t('pages.dashboard.syncStates', {
                              stored: s.states_stored ?? 0,
                              listed: s.states_listed ?? 0,
                            })}
                          </Typography>
                          {s.last_sync_at && (
                            <Typography variant="caption" color="text.secondary">
                              {t('pages.dashboard.syncedAt', {
                                time: new Date(s.last_sync_at).toLocaleTimeString(),
                              })}
                            </Typography>
                          )}
                          {(s.read_errors ?? 0) > 0 && (
                            <Chip size="small" color="warning" label={t('pages.dashboard.syncReadErrors', { count: s.read_errors })} />
                          )}
                          {s.last_error && (
                            <Typography variant="caption" color="error" sx={{ wordBreak: 'break-all' }}>
                              {s.last_error}
                            </Typography>
                          )}
                        </>
                      ) : (
                        <Chip size="small" color="info" variant="outlined" label={t('pages.dashboard.syncPending')} />
                      )}
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <ChartCard title={t('pages.dashboard.providerDistribution')}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data.providers.slice(0, 8)}
                    dataKey="count"
                    nameKey="key"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                  >
                    {data.providers.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={palette[i % palette.length]} />
                    ))}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t('pages.dashboard.terraformVersions')}>
              <CountBarChart
                data={data.terraform_versions}
                color={theme.palette.secondary.main}
                onCategoryClick={(key) => {
                  setVersionFilter(key)
                  setVersionOp('eq')
                }}
              />
            </ChartCard>

            <ChartCard title={t('pages.dashboard.topResourceTypes')} span2>
              <CountBarChart data={data.resource_types} color={theme.palette.primary.main} />
            </ChartCard>
          </Box>
        </>
      )}

      <VersionStatesDrawer
        version={versionFilter}
        op={versionOp}
        onOpChange={setVersionOp}
        onClose={() => setVersionFilter(null)}
      />
    </Box>
  )
}

function ChartCard({ title, span2, children }: { title: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <Card variant="outlined" sx={span2 ? { gridColumn: { md: '1 / -1' } } : undefined}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Divider sx={{ mb: 1 }} />
        {children}
      </CardContent>
    </Card>
  )
}

function CountBarChart({
  data,
  color,
  onCategoryClick,
}: {
  data: Count[]
  color: string
  /** When set, the chart's category axis (e.g. Terraform version) is clickable. */
  onCategoryClick?: (key: string) => void
}) {
  const { t } = useTranslation()
  return (
    <Box sx={{ cursor: onCategoryClick ? 'pointer' : 'default' }}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 24 }}
          onClick={
            onCategoryClick
              ? (state: { activeLabel?: string }) => {
                if (state?.activeLabel) onCategoryClick(state.activeLabel)
              }
              : undefined
          }
        >
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="key" width={120} tick={{ fontSize: 12 }} />
          <RTooltip content={<CountTooltip />} />
          <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {onCategoryClick && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {t('pages.dashboard.versionChartHint')}
        </Typography>
      )}
    </Box>
  )
}

/**
 * Tooltip for the horizontal count bars. The category (e.g. Terraform version)
 * is not always visible on the Y axis, so show it alongside the count rather
 * than relying on recharts' default content, which only renders the value.
 */
function CountTooltip({ active, payload }: TooltipProps<number, string>) {
  const { t } = useTranslation()
  if (!active || !payload || payload.length === 0) return null
  const datum = payload[0].payload as Count
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        boxShadow: 3,
        px: 1.5,
        py: 1,
        maxWidth: 260,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
        {datum.key}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t('pages.dashboard.count', { value: datum.count })}
      </Typography>
    </Box>
  )
}

// The comparison operators offered in the drill-down drawer, in ascending order
// so the toggle reads naturally (older → newer). Symbols are intentionally not
// translated; the aria-label/tooltip carries the meaning.
const VERSION_OPS: { op: VersionFilterOp; symbol: string; labelKey: string }[] = [
  { op: 'eq', symbol: '=', labelKey: 'pages.dashboard.versionOpEq' },
  { op: 'lte', symbol: '≤', labelKey: 'pages.dashboard.versionOpLte' },
  { op: 'lt', symbol: '<', labelKey: 'pages.dashboard.versionOpLt' },
  { op: 'gte', symbol: '≥', labelKey: 'pages.dashboard.versionOpGte' },
  { op: 'gt', symbol: '>', labelKey: 'pages.dashboard.versionOpGt' },
]

// Range operators only make sense for real semantic versions; the "unknown"
// bucket (and any non-semver label) supports exact match only.
function isSemverish(v: string): boolean {
  return /^v?\d+\.\d+/.test(v)
}

function symbolForOp(op: VersionFilterOp): string {
  return VERSION_OPS.find((v) => v.op === op)?.symbol ?? '='
}

// Serialize the drawer's currently listed states to a CSV body. Exported for
// unit testing; exportVersionStatesCSV wraps it with the browser download.
export function versionStatesToCsv(states: VersionStateRef[]): string {
  const header = ['source_name', 'source_id', 'state_key', 'terraform_version', 'rum']
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = states.map((s) =>
    [s.source_name, s.source_id, s.state_key, s.terraform_version, s.rum].map(esc).join(','),
  )
  return [header.join(','), ...rows].join('\n')
}

// Trigger a browser download of the listed states via a temporary blob URL
// (same client-side pattern as the audit-log export). The filename carries the
// active filter so multiple exports stay distinct.
function exportVersionStatesCSV(states: VersionStateRef[], op: VersionFilterOp, version: string) {
  const slug = `${op}-${version || 'unknown'}`.replace(/[^a-zA-Z0-9._-]+/g, '_')
  const blob = new Blob([versionStatesToCsv(states)], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `state-files-${slug}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Side drawer listing the state files behind a clicked Terraform-version bar.
 * The operator toggle broadens the exact match to a semver range (e.g. < 1.0.0);
 * each row deep-links into the Sources page with that state preselected.
 */
function VersionStatesDrawer({
  version,
  op,
  onOpChange,
  onClose,
}: {
  version: string | null
  op: VersionFilterOp
  onOpChange: (op: VersionFilterOp) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const rangeAllowed = version ? isSemverish(version) : false
  const q = useQuery({
    queryKey: queryKeys.dashboard.statesByVersion(version ?? '', op),
    queryFn: () => api.listStatesByVersion(version as string, op),
    enabled: Boolean(version),
  })
  const states = q.data ?? []

  const openInSources = (s: VersionStateRef) => {
    const params = new URLSearchParams({ source: s.source_id, state: s.state_key })
    onClose()
    navigate(`/sources?${params.toString()}`)
  }

  return (
    <Drawer anchor="right" open={Boolean(version)} onClose={onClose}>
      <Box
        sx={{
          width: { xs: 320, sm: 420 },
          p: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {t('pages.dashboard.versionStatesTitle')}
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label={t('common.close')}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={op}
            onChange={(_, v: VersionFilterOp | null) => {
              if (v) onOpChange(v)
            }}
            aria-label={t('pages.dashboard.versionOpAria')}
          >
            {VERSION_OPS.map(({ op: o, symbol, labelKey }) => (
              <Tooltip key={o} title={t(labelKey)}>
                <span>
                  <ToggleButton value={o} disabled={o !== 'eq' && !rangeAllowed} aria-label={t(labelKey)}>
                    {symbol}
                  </ToggleButton>
                </span>
              </Tooltip>
            ))}
          </ToggleButtonGroup>
          <Chip
            size="small"
            variant="outlined"
            sx={{ fontFamily: 'monospace' }}
            label={`${symbolForOp(op)} ${version ?? ''}`}
          />
        </Stack>

        {q.isLoading && <CircularProgress size={22} sx={{ mt: 2, alignSelf: 'center' }} />}
        {q.isError && <Alert severity="error">{t('pages.dashboard.versionStatesError')}</Alert>}
        {q.isSuccess && states.length === 0 && (
          <Typography color="text.secondary" variant="body2" sx={{ mt: 2 }}>
            {t('pages.dashboard.versionStatesEmpty')}
          </Typography>
        )}

        {states.length > 0 && (
          <>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                {t('pages.dashboard.versionStatesCount', { count: states.length })}
              </Typography>
              <Button
                size="small"
                startIcon={<DownloadIcon fontSize="small" />}
                onClick={() => exportVersionStatesCSV(states, op, version ?? '')}
              >
                {t('pages.dashboard.versionExportCsv')}
              </Button>
            </Stack>
            <List dense disablePadding sx={{ overflow: 'auto' }}>
              {states.map((s) => (
                <ListItemButton key={`${s.source_id}:${s.state_key}`} onClick={() => openInSources(s)}>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                        {s.state_key}
                      </Typography>
                    }
                    secondary={`${s.source_name} · ${s.terraform_version || t('pages.dashboard.versionUnknown')
                      } · ${t('pages.dashboard.versionStateRum', { count: s.rum })}`}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </Box>
    </Drawer>
  )
}
