import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import PageHeader from '../../components/PageHeader'
import { api } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import { getScopeColor } from '../../utils/scopes'

export default function MTLSPage() {
  const { t } = useTranslation()
  const configQuery = useQuery({ queryKey: queryKeys.admin.mtls(), queryFn: api.getMTLSConfig })
  const config = configQuery.data

  return (
    <Box>
      <PageHeader title={t('mtls.pageTitle')} description={t('mtls.pageSubtitle')} />
      {configQuery.isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress aria-label={t('common.loading')} />
        </Box>
      )}
      {configQuery.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('mtls.errLoad')}
        </Alert>
      )}
      {config && (
        <>
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Chip
                label={config.enabled ? t('mtls.enabled') : t('mtls.disabled')}
                color={config.enabled ? 'success' : 'default'}
              />
              {config.client_ca_file && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('mtls.caFile')}: <code>{config.client_ca_file}</code>
                </Typography>
              )}
            </Stack>
          </Paper>

          {config.mappings.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('mtls.certificateSubject')}</TableCell>
                    <TableCell>{t('mtls.scopes')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {config.mappings.map((mapping, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {mapping.subject}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                          {mapping.scopes.map((scope) => (
                            <Chip key={scope} label={scope} size="small" variant="outlined" color={getScopeColor(scope)} />
                          ))}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
              <Typography sx={{ color: 'text.secondary' }}>{t('mtls.noMappings')}</Typography>
            </Paper>
          )}
        </>
      )}
    </Box>
  )
}
