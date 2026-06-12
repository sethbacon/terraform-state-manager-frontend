import { Drawer, Box, Typography, IconButton, Divider, useTheme, useMediaQuery } from '@mui/material'
import Close from '@mui/icons-material/Close'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useHelp } from '../contexts/HelpContext'

export const HELP_PANEL_WIDTH = 320

// Map a route to its help content key under i18n `help.pages.<key>`.
const HELP_KEYS: Record<string, string> = {
  '/': 'dashboard',
  '/sources': 'sources',
  '/drift': 'drift',
  '/version-lab': 'versionLab',
  '/schedules': 'schedules',
  '/reports': 'reports',
  '/transfer': 'transfer',
  '/api-docs': 'apiDocs',
  '/admin': 'admin',
  '/admin/users': 'adminUsers',
  '/admin/organizations': 'adminOrganizations',
  '/admin/roles': 'adminRoles',
  '/admin/oidc': 'adminOidc',
  '/admin/mtls': 'adminMtls',
  '/admin/sso': 'adminSso',
  '/admin/apikeys': 'adminApiKeys',
  '/admin/notifications': 'adminNotifications',
  '/admin/audit-logs': 'adminAudit',
}

function helpKeyForPath(pathname: string): string {
  return HELP_KEYS[pathname] ?? ''
}

const HelpPanel = () => {
  const { helpOpen, closeHelp } = useHelp()
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const key = helpKeyForPath(pathname)
  const title = (key ? t(`help.pages.${key}.title`) : t('help.title')) as string
  const body = (key ? t(`help.pages.${key}.body`) : t('help.none')) as string
  // Optional deeper sections: [{ h, p }] under help.pages.<key>.sections.
  const sections = key
    ? (t(`help.pages.${key}.sections`, { returnObjects: true, defaultValue: [] }) as { h: string; p: string }[])
    : []

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
      anchor="right"
      open={helpOpen}
      onClose={closeHelp}
      ModalProps={{ keepMounted: true }}
      sx={{
        '& .MuiDrawer-paper': {
          width: HELP_PANEL_WIDTH,
          boxSizing: 'border-box',
          top: { xs: 0, md: '64px' },
          height: { xs: '100%', md: 'calc(100% - 64px)' },
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          {title}
        </Typography>
        <IconButton size="small" onClick={closeHelp} aria-label={t('help.close')}>
          <Close fontSize="small" />
        </IconButton>
      </Box>
      <Divider />
      <Box sx={{ px: 2, py: 2, overflowY: 'auto', flexGrow: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {body}
        </Typography>
        {Array.isArray(sections) &&
          sections.map((sec, i) => (
            <Box key={i} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                {sec.h}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {sec.p}
              </Typography>
            </Box>
          ))}
      </Box>
    </Drawer>
  )
}

export default HelpPanel
