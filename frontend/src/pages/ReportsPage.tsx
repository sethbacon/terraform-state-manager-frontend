import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Autocomplete,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/PageHeader'
import { api, type ReportFormat } from '../services/api'
import { queryKeys } from '../services/queryKeys'

function apiErr(e: unknown): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Request failed.'
}

const FORMATS: { value: ReportFormat; label: string }[] = [
  { value: 'md', label: 'Markdown' },
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
]

export default function ReportsPage() {
  const { t } = useTranslation()
  const [sourceId, setSourceId] = useState('')
  const [stateKey, setStateKey] = useState('')
  const [downloading, setDownloading] = useState<ReportFormat | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const sourcesQuery = useQuery({ queryKey: queryKeys.sources.list(), queryFn: api.listSources })
  const statesQuery = useQuery({
    queryKey: queryKeys.sources.states(sourceId),
    queryFn: () => api.listStates(sourceId),
    enabled: Boolean(sourceId),
  })
  const analysisQuery = useQuery({
    queryKey: queryKeys.sources.analysis(sourceId, stateKey),
    queryFn: () => api.analyzeState(sourceId, stateKey),
    enabled: Boolean(sourceId && stateKey),
  })

  const onPickSource = (id: string) => {
    setSourceId(id)
    setStateKey('')
    setDownloadError(null)
  }

  const download = async (format: ReportFormat) => {
    setDownloadError(null)
    setDownloading(format)
    try {
      await api.downloadReport(sourceId, stateKey, format)
    } catch (e) {
      setDownloadError(apiErr(e))
    } finally {
      setDownloading(null)
    }
  }

  const a = analysisQuery.data?.analysis

  return (
    <Box>
      <PageHeader title={t('nav.reports')} description={t('help.pages.reports.body')} />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3, maxWidth: 760 }}>
        <TextField select label={t('pages.reports.source')} value={sourceId} onChange={(e) => onPickSource(e.target.value)} fullWidth>
          {(sourcesQuery.data ?? []).map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name} ({s.type})
            </MenuItem>
          ))}
        </TextField>
        <Autocomplete
          options={statesQuery.data ?? []}
          loading={statesQuery.isLoading}
          getOptionLabel={(st) => st.name || st.key}
          value={(statesQuery.data ?? []).find((st) => st.key === stateKey) ?? null}
          onChange={(_, v) => setStateKey(v?.key ?? '')}
          disabled={!sourceId || statesQuery.isLoading}
          fullWidth
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('pages.reports.stateFile')}
              helperText={sourceId && statesQuery.data?.length === 0 ? t('pages.reports.noStates') : ' '}
            />
          )}
        />
      </Stack>

      {!sourceId && <Alert severity="info">{t('pages.reports.chooseSource')}</Alert>}

      {sourceId && stateKey && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {FORMATS.map((f) => (
              <Button
                key={f.value}
                variant="outlined"
                startIcon={downloading === f.value ? <CircularProgress size={16} /> : <DownloadIcon />}
                disabled={downloading !== null || analysisQuery.isLoading}
                onClick={() => download(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </Stack>
          {downloadError && <Alert severity="error">{downloadError}</Alert>}

          {analysisQuery.isLoading && <CircularProgress size={20} />}
          {analysisQuery.isError && <Alert severity="error">{apiErr(analysisQuery.error)}</Alert>}
          {a && (
            <>
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                {[
                  { label: 'RUM', value: a.rum },
                  { label: 'Managed', value: a.managed_resources },
                  { label: 'Data sources', value: a.data_sources },
                  { label: 'Total instances', value: a.total_resources },
                  { label: 'Terraform', value: a.terraform_version || '—' },
                  { label: 'Serial', value: a.serial },
                ].map((s) => (
                  <Card key={s.label} variant="outlined">
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="overline" color="text.secondary">
                        {s.label}
                      </Typography>
                      <Typography variant="h6">{s.value}</Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                <BreakdownTable title={t('pages.reports.topResourceTypes')} rows={a.resource_types.slice(0, 10)} />
                <BreakdownTable title={t('pages.reports.providers')} rows={a.providers} />
              </Box>
            </>
          )}
        </Stack>
      )}
    </Box>
  )
}

function BreakdownTable({ title, rows }: { title: string; rows: { key: string; count: number }[] }) {
  const { t } = useTranslation()
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Divider sx={{ mb: 1 }} />
        {rows.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            None
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common.name')}</TableCell>
                <TableCell align="right">{t('pages.reports.count')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell sx={{ wordBreak: 'break-all' }}>{r.key}</TableCell>
                  <TableCell align="right">{r.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
