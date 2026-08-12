import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { api } from '../../../services/api'
import { queryKeys } from '../../../services/queryKeys'
import { breakableSegments } from '../addresses'

export default function ResourcesTab({ sourceId, stateKey }: { sourceId: string; stateKey: string }) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')
  const q = useQuery({
    queryKey: queryKeys.sources.resources(sourceId, stateKey),
    queryFn: () => api.listStateResources(sourceId, stateKey),
  })
  if (q.isLoading) return <CircularProgress />
  if (q.isError || !q.data) return <Alert severity="error">{t('pages.sources.resourcesFailed')}</Alert>

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
        placeholder={t('pages.sources.filterResources')}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        fullWidth
      />
      <Table size="small" sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '22%' }}>{t('pages.sources.module')}</TableCell>
            <TableCell sx={{ width: '24%' }}>{t('common.type')}</TableCell>
            <TableCell sx={{ width: '20%' }}>{t('common.name')}</TableCell>
            <TableCell sx={{ width: '16%' }}>{t('common.provider')}</TableCell>
            <TableCell sx={{ width: '9%' }}>{t('pages.sources.mode')}</TableCell>
            <TableCell align="right" sx={{ width: '9%', pr: 2 }}>
              {t('pages.sources.instances')}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={`${r.module}/${r.type}.${r.name}-${i}`}>
              <TableCell sx={{ overflowWrap: 'anywhere' }}>{breakableSegments(r.module)}</TableCell>
              <TableCell sx={{ overflowWrap: 'anywhere' }}>{r.type}</TableCell>
              <TableCell sx={{ overflowWrap: 'anywhere' }}>{r.name}</TableCell>
              <TableCell sx={{ overflowWrap: 'anywhere' }}>{breakableSegments(r.provider)}</TableCell>
              <TableCell>{r.mode}</TableCell>
              <TableCell align="right" sx={{ pr: 2 }}>
                {r.instances}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* Divergence, preserved: this empty-state string is hard-coded English
          while every other empty state on the page goes through i18n. */}
      {rows.length === 0 && (
        <Typography color="text.secondary" variant="body2">
          No matching resources.
        </Typography>
      )}
    </Stack>
  )
}
