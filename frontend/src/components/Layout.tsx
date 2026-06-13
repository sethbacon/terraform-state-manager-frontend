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
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import SettingsIcon from '@mui/icons-material/Settings'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined'
import SearchIcon from '@mui/icons-material/Search'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import CheckIcon from '@mui/icons-material/Check'
import { useTranslation } from 'react-i18next'
import i18n, { SUPPORTED_LANGUAGES } from '../i18n'
import { homeItem, navGroups, apiDocsItem, adminDashboardItem } from '../navigation'
import { useThemeMode } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { useHelp } from '../contexts/HelpContext'
import HelpPanel, { HELP_PANEL_WIDTH } from './HelpPanel'
import AboutModal from './AboutModal'
import AdminBreadcrumbs from './AdminBreadcrumbs'
import CommandPalette from './CommandPalette'
import SessionExpiryWarning from './SessionExpiryWarning'

const DRAWER_WIDTH = 240
const GROUPS_STORAGE_KEY = 'tsm-nav-groups-open'

export default function Layout() {
  const location = useLocation()
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { mode, toggle } = useThemeMode()
  const { user, logout, hasScope } = useAuth()
  const { helpOpen, openHelp } = useHelp()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null)
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null)
  const [supportAnchor, setSupportAnchor] = useState<null | HTMLElement>(null)
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

  // Active nav-item treatment mirroring the registry: a brand accent bar on the
  // left, a faint brand-tinted background, a brand-coloured icon, and a bolder
  // label. basePl is the inactive left padding (px); the 3px accent eats into it
  // when active so the icon and label never shift horizontally.
  const navItemSx = (active: boolean, basePl: number) => ({
    borderLeft: active ? `3px solid ${theme.palette.primary.main}` : '3px solid transparent',
    bgcolor: active ? `${theme.palette.primary.main}14` : 'transparent',
    pl: `${active ? basePl - 3 : basePl}px`,
  })
  const navTextProps = (active: boolean) => ({ primary: { sx: { fontWeight: active ? 600 : 400 } } })
  const homeActive = location.pathname === homeItem.path
  const apiDocsActive = location.pathname === apiDocsItem.path
  const adminDashActive = location.pathname === adminDashboardItem.path

  const drawerContent = (
    <Box sx={{ overflow: 'auto' }} role="navigation" aria-label={t('a11y.openNavigation')}>
      <List>
        {/* Home — standalone, no group header */}
        <ListItemButton
          component={RouterLink}
          to={homeItem.path}
          onClick={closeDrawerOnNav}
          aria-current={homeActive ? 'page' : undefined}
          sx={navItemSx(homeActive, 16)}
        >
          <ListItemIcon sx={{ color: homeActive ? 'primary.main' : 'inherit' }}>{homeItem.icon}</ListItemIcon>
          <ListItemText primary={t(homeItem.labelKey)} slotProps={navTextProps(homeActive)} />
        </ListItemButton>

        {/* API docs — standalone, directly under Home */}
        <ListItemButton
          component={RouterLink}
          to={apiDocsItem.path}
          onClick={closeDrawerOnNav}
          aria-current={apiDocsActive ? 'page' : undefined}
          sx={navItemSx(apiDocsActive, 16)}
        >
          <ListItemIcon sx={{ color: apiDocsActive ? 'primary.main' : 'inherit' }}>{apiDocsItem.icon}</ListItemIcon>
          <ListItemText primary={t(apiDocsItem.labelKey)} slotProps={navTextProps(apiDocsActive)} />
        </ListItemButton>

        {visibleGroups.map((group) => (
          <Box key={group.key}>
            {/* Admin Dashboard — standalone above the Identity group, like the
                registry renders it without a group header. The Identity group is
                scope-filtered, so this only appears for admins. */}
            {group.key === 'identity' && (
              <>
                <Divider sx={{ my: 0.5 }} />
                <ListItemButton
                  component={RouterLink}
                  to={adminDashboardItem.path}
                  onClick={closeDrawerOnNav}
                  aria-current={adminDashActive ? 'page' : undefined}
                  sx={navItemSx(adminDashActive, 16)}
                >
                  <ListItemIcon sx={{ color: adminDashActive ? 'primary.main' : 'inherit' }}>
                    {adminDashboardItem.icon}
                  </ListItemIcon>
                  <ListItemText primary={t(adminDashboardItem.labelKey)} slotProps={navTextProps(adminDashActive)} />
                </ListItemButton>
              </>
            )}
            <ListItemButton onClick={() => toggleGroup(group.key)} dense sx={{ mt: 0.5 }}>
              <ListItemText
                primary={t(group.labelKey)}
                slotProps={{ primary: { variant: 'overline', color: 'text.secondary', sx: { fontWeight: 600 } } }}
              />
              {openGroups[group.key] ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </ListItemButton>
            <Collapse in={openGroups[group.key]} timeout="auto" unmountOnExit>
              <List disablePadding>
                {group.items.map((item) => {
                  const active = location.pathname === item.path
                  return (
                    <ListItemButton
                      key={item.path}
                      component={RouterLink}
                      to={item.path}
                      onClick={closeDrawerOnNav}
                      aria-current={active ? 'page' : undefined}
                      sx={navItemSx(active, 24)}
                    >
                      <Tooltip title={item.tooltipKey ? t(item.tooltipKey) : ''} placement="right" arrow>
                        <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.main' : 'inherit' }}>
                          {item.icon}
                        </ListItemIcon>
                      </Tooltip>
                      <ListItemText primary={t(item.labelKey)} slotProps={navTextProps(active)} />
                    </ListItemButton>
                  )
                })}
              </List>
            </Collapse>
          </Box>
        ))}

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
            <IconButton
              color="inherit"
              onClick={() => setPaletteOpen(true)}
              aria-label={t('commandPalette.openButton')}
              sx={{ mr: 1 }}
            >
              <SearchIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={t('settings.title')}>
            <IconButton
              color="inherit"
              onClick={(e) => setSettingsAnchor(e.currentTarget)}
              aria-label={t('settings.title')}
              aria-haspopup="true"
              aria-controls={settingsAnchor ? 'settings-menu' : undefined}
              sx={{ mr: 1 }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={t('support.title')}>
            <IconButton
              color="inherit"
              onClick={(e) => setSupportAnchor(e.currentTarget)}
              aria-label={t('support.title')}
              aria-haspopup="true"
              aria-controls={supportAnchor ? 'support-menu' : undefined}
              sx={{ mr: 1 }}
            >
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={user?.email ?? t('auth.account')}>
            <IconButton color="inherit" onClick={(e) => setAccountAnchor(e.currentTarget)} aria-label={t('auth.account')}>
              <AccountCircleIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Settings menu: theme + language (registry shape — support items live in their own menu) */}
      <Menu
        id="settings-menu"
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={() => setSettingsAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            toggle()
            setSettingsAnchor(null)
          }}
        >
          <ListItemIcon>
            {mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
          </ListItemIcon>
          {mode === 'dark' ? t('settings.themeLight') : t('settings.themeDark')}
        </MenuItem>
        <Divider />
        {SUPPORTED_LANGUAGES.map((lng) => (
          <MenuItem key={lng.code} selected={i18n.language?.startsWith(lng.code)} onClick={() => changeLanguage(lng.code)}>
            <ListItemIcon>{i18n.language?.startsWith(lng.code) ? <CheckIcon fontSize="small" /> : null}</ListItemIcon>
            {lng.label}
          </MenuItem>
        ))}
      </Menu>

      {/* Support menu: context help + about */}
      <Menu
        id="support-menu"
        anchorEl={supportAnchor}
        open={Boolean(supportAnchor)}
        onClose={() => setSupportAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            setSupportAnchor(null)
            openHelp()
          }}
        >
          <ListItemIcon>
            <HelpOutlineIcon fontSize="small" />
          </ListItemIcon>
          {t('support.contextHelp')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setSupportAnchor(null)
            setAboutOpen(true)
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
          // minWidth:0 lets the flex child shrink correctly on narrow viewports.
          minWidth: 0,
          p: 3,
          transition: (th) => th.transitions.create('margin'),
          marginRight: { md: helpOpen ? `${HELP_PANEL_WIDTH}px` : 0 },
        }}
      >
        <Toolbar />
        {/* Cap content width (left-aligned, registry-style) so forms don't stretch
            edge-to-edge — but at xl: the data-dense tables (sources states browser,
            audit log) earn the room on modern monitors. API docs is exempt (its
            two-column swagger layout uses the full width, as in the registry). */}
        <Box sx={{ maxWidth: apiDocsActive ? 'none' : (th) => th.breakpoints.values.xl }}>
          <AdminBreadcrumbs />
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
      </Box>

      <HelpPanel />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <SessionExpiryWarning />
    </Box>
  )
}
