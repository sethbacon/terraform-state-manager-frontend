import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { api, type ModuleFreshness } from '../../../services/api'
import { queryKeys } from '../../../services/queryKeys'
import { breakableSegments } from '../addresses'

// ModulesTab lists the registry modules a state calls, captured from ingested
// plans. Empty is normal (capture only happens on plan push-ingest). A locked
// version is shown when known; otherwise a "constraint only" marker, since TSM
// has no lockfile to resolve the exact version.
export default function ModulesTab({ sourceId, stateKey }: { sourceId: string; stateKey: string }) {
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
    (freshnessQuery.data ?? []).map((f) => [`${f.registry_host} ${f.module_source}`, f]),
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
            <TableCell>{freshnessChip(freshness.get(`${m.registry_host} ${m.module_source}`))}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
