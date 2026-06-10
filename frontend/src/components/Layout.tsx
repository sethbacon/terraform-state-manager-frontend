import { Suspense, useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'
import {
  AppBar,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { CircularProgress } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import SettingsIcon from '@mui/icons-material/Settings'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import SearchIcon from '@mui/icons-material/Search'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import CheckIcon from '@mui/icons-material/Check'
import { useTranslation } from 'react-i18next'
import i18n, { SUPPORTED_LANGUAGES } from '../i18n'
import { homeItem, navGroups, apiDocsItem } from '../navigation'
import { useThemeMode } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { useHelp } from '../contexts/HelpContext'
import HelpPanel, { HELP_PANEL_WIDTH } from './HelpPanel'
import AboutModal from './AboutModal'
import CommandPalette from './CommandPalette'

const DRAWER_WIDTH = 240
const GROUPS_STORAGE_KEY = 'tsm-nav-groups-open'

export default function Layout() {
  const location = useLocation()
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { mode, toggle } = useThemeMode()
  const { user, logout, hasScope } = useAuth()
  const { helpOpen, toggleHelp } = useHelp()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null)
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Scope-filtered groups (drop empty groups).
  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.scope === null || hasScope(i.scope)) }))
    .filter((g) => g.items.length > 0)

  // Collapsible group open-state, persisted; new groups default to open.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    let stored: Record<string, boolean> = {}
    try {
      stored = JSON.parse(localStorage.getItem(GROUPS_STORAGE_KEY) ?? '{}')
    } catch {
      stored = {}
    }
    return Object.fromEntries(navGroups.map((g) => [g.key, stored[g.key] ?? true]))
  })

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  // ⌘K / Ctrl+K opens the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const closeDrawerOnNav = useCallback(() => {
    if (isMobile) setMobileOpen(false)
  }, [isMobile])

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    setSettingsAnchor(null)
  }

  const drawerContent = (
    <Box sx={{ overflow: 'auto' }} role="navigation" aria-label={t('a11y.openNavigation')}>
      <List>
        {/* Home — standalone, no group header */}
        <ListItemButton
          component={RouterLink}
          to={homeItem.path}
          selected={location.pathname === homeItem.path}
          onClick={closeDrawerOnNav}
        >
          <ListItemIcon>{homeItem.icon}</ListItemIcon>
          <ListItemText primary={t(homeItem.labelKey)} />
        </ListItemButton>

        {visibleGroups.map((group) => (
          <Box key={group.key}>
            <ListItemButton onClick={() => toggleGroup(group.key)} dense sx={{ mt: 0.5 }}>
              <ListItemText
                primary={t(group.labelKey)}
                slotProps={{ primary: { variant: 'overline', color: 'text.secondary' } }}
              />
              {openGroups[group.key] ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </ListItemButton>
            <Collapse in={openGroups[group.key]} timeout="auto" unmountOnExit>
              <List disablePadding>
                {group.items.map((item) => (
                  <ListItemButton
                    key={item.path}
                    component={RouterLink}
                    to={item.path}
                    selected={location.pathname === item.path}
                    onClick={closeDrawerOnNav}
                    sx={{ pl: 3 }}
                  >
                    <Tooltip title={item.tooltipKey ? t(item.tooltipKey) : ''} placement="right">
                      <ListItemIcon>{item.icon}</ListItemIcon>
                    </Tooltip>
                    <ListItemText primary={t(item.labelKey)} />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </Box>
        ))}

        {/* API docs — standalone at the bottom */}
        <ListItemButton
          component={RouterLink}
          to={apiDocsItem.path}
          selected={location.pathname === apiDocsItem.path}
          onClick={closeDrawerOnNav}
          sx={{ mt: 0.5 }}
        >
          <ListItemIcon>{apiDocsItem.icon}</ListItemIcon>
          <ListItemText primary={t(apiDocsItem.labelKey)} />
        </ListItemButton>
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Skip link for keyboard/screen-reader users */}
      <Link
        href="#main-content"
        sx={{
          position: 'absolute',
          left: -9999,
          top: 8,
          zIndex: (th) => th.zIndex.tooltip + 1,
          '&:focus': { left: 8, p: 1, bgcolor: 'background.paper', borderRadius: 1 },
        }}
      >
        {t('a11y.skipToContent')}
      </Link>

      <AppBar position="fixed" sx={{ zIndex: (th) => th.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={t('a11y.openNavigation')}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {t('app.name')}
          </Typography>

          <Tooltip title={t('commandPalette.hint')}>
            <IconButton color="inherit" onClick={() => setPaletteOpen(true)} aria-label={t('commandPalette.openButton')}>
              <SearchIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={t('help.open')}>
            <IconButton color="inherit" onClick={toggleHelp} aria-label={t('help.open')} aria-pressed={helpOpen}>
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={t('settings.title')}>
            <IconButton
              color="inherit"
              onClick={(e) => setSettingsAnchor(e.currentTarget)}
              aria-label={t('settings.title')}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={user?.email ?? t('auth.account')}>
            <IconButton color="inherit" onClick={(e) => setAccountAnchor(e.currentTarget)} aria-label={t('auth.account')}>
              <AccountCircleIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Settings menu: theme + language */}
      <Menu anchorEl={settingsAnchor} open={Boolean(settingsAnchor)} onClose={() => setSettingsAnchor(null)}>
        <ListSubheader sx={{ bgcolor: 'transparent', lineHeight: '2.5em' }}>{t('settings.appearance')}</ListSubheader>
        <MenuItem
          onClick={() => {
            toggle()
            setSettingsAnchor(null)
          }}
        >
          <ListItemIcon>{mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}</ListItemIcon>
          {mode === 'dark' ? t('settings.themeLight') : t('settings.themeDark')}
        </MenuItem>
        <Divider />
        <ListSubheader sx={{ bgcolor: 'transparent', lineHeight: '2.5em' }}>{t('settings.language')}</ListSubheader>
        {SUPPORTED_LANGUAGES.map((lng) => (
          <MenuItem key={lng.code} selected={i18n.language?.startsWith(lng.code)} onClick={() => changeLanguage(lng.code)}>
            <ListItemIcon>{i18n.language?.startsWith(lng.code) ? <CheckIcon fontSize="small" /> : null}</ListItemIcon>
            {lng.label}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            setAboutOpen(true)
            setSettingsAnchor(null)
          }}
        >
          <ListItemIcon>
            <InfoOutlinedIcon fontSize="small" />
          </ListItemIcon>
          {t('about.title')}
        </MenuItem>
      </Menu>

      {/* Account menu */}
      <Menu anchorEl={accountAnchor} open={Boolean(accountAnchor)} onClose={() => setAccountAnchor(null)}>
        <MenuItem disabled sx={{ opacity: 1 }}>
          <Box>
            <Typography variant="body2">{user?.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setAccountAnchor(null)
            logout()
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          {t('auth.signOut')}
        </MenuItem>
      </Menu>

      {/* Navigation drawer: temporary on mobile, permanent on desktop */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}
        >
          <Toolbar />
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          <Toolbar />
          {drawerContent}
        </Drawer>
      )}

      <Box
        component="main"
        id="main-content"
        sx={{
          flexGrow: 1,
          p: 3,
          transition: (th) => th.transitions.create('margin'),
          marginRight: { md: helpOpen ? `${HELP_PANEL_WIDTH}px` : 0 },
        }}
      >
        <Toolbar />
        <Suspense
          fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress aria-label={t('common.loading')} />
            </Box>
          }
        >
          <Outlet />
        </Suspense>
      </Box>

      <HelpPanel />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </Box>
  )
}
