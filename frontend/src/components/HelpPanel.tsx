import { Drawer, Box, Typography, IconButton, Divider, useTheme, useMediaQuery } from '@mui/material'
import Close from '@mui/icons-material/Close'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useHelp } from '../contexts/HelpContext'

export const HELP_PANEL_WIDTH = 320

// Map a route to its help content key under i18n `help.pages.<key>`.
function helpKeyForPath(pathname: string): string {
  switch (pathname) {
    case '/':
      return 'dashboard'
    case '/sources':
      return 'sources'
    case '/drift':
      return 'drift'
    case '/version-lab':
      return 'versionLab'
    case '/reports':
      return 'reports'
    case '/transfer':
      return 'transfer'
    default:
      return ''
  }
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
      </Box>
    </Drawer>
  )
}

export default HelpPanel
