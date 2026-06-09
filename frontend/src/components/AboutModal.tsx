import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  Link,
  CircularProgress,
} from '@mui/material'
import { api } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import i18n from '../i18n'

interface AboutModalProps {
  open: boolean
  onClose: () => void
}

const REPO_BASE = 'https://github.com/sethbacon'

const AboutModal = ({ open, onClose }: AboutModalProps) => {
  const { t } = useTranslation()
  const versionQuery = useQuery({ queryKey: queryKeys.system.version, queryFn: api.getVersion, enabled: open })
  const backend = versionQuery.data

  const builtDate =
    backend?.build_date && backend.build_date !== 'unknown'
      ? new Intl.DateTimeFormat(i18n.language).format(new Date(backend.build_date))
      : null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('about.title')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="h6" gutterBottom>
          {t('app.name')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {t('about.description')}
        </Typography>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>
          {t('about.versionsHeading')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: builtDate ? 1 : 0 }}>
          <Chip
            label={t('about.frontend', { version: __APP_VERSION__ })}
            size="small"
            color="primary"
            variant="outlined"
          />
          {versionQuery.isLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CircularProgress size={14} />
            </Box>
          ) : backend ? (
            <Chip
              label={t('about.backend', { version: backend.version })}
              size="small"
              color="secondary"
              variant="outlined"
            />
          ) : (
            <Chip label={t('about.backendUnavailable')} size="small" variant="outlined" />
          )}
        </Box>
        {builtDate && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('about.built', { date: builtDate })}
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>
          {t('about.licenseHeading')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {t('about.licenseText')}{' '}
          <Link href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener noreferrer">
            {t('about.apache')}
          </Link>
          .
        </Typography>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>
          {t('about.sourceHeading')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Link href={`${REPO_BASE}/terraform-state-manager-backend`} target="_blank" rel="noopener noreferrer" variant="body2">
            {t('about.repoBackend')}
          </Link>
          <Link href={`${REPO_BASE}/terraform-state-manager-frontend`} target="_blank" rel="noopener noreferrer" variant="body2">
            {t('about.repoFrontend')}
          </Link>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('about.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}

export default AboutModal
