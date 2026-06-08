import { Outlet, Link as RouterLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Collapse,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import Analytics from '@mui/icons-material/Analytics';
import WorkspacesOutlined from '@mui/icons-material/WorkspacesOutlined';
import Backup from '@mui/icons-material/Backup';
import SwapHoriz from '@mui/icons-material/SwapHoriz';
import Assessment from '@mui/icons-material/Assessment';
import Dashboard from '@mui/icons-material/Dashboard';
import NotificationsActive from '@mui/icons-material/NotificationsActive';
import VerifiedUser from '@mui/icons-material/VerifiedUser';
import Description from '@mui/icons-material/Description';
import People from '@mui/icons-material/People';
import Business from '@mui/icons-material/Business';
import VpnKey from '@mui/icons-material/VpnKey';
import Shield from '@mui/icons-material/Shield';
import ManageAccounts from '@mui/icons-material/ManageAccounts';
import History from '@mui/icons-material/History';
import Storage from '@mui/icons-material/Storage';
import Schedule from '@mui/icons-material/Schedule';
import Brightness4 from '@mui/icons-material/Brightness4';
import Brightness7 from '@mui/icons-material/Brightness7';
import HelpOutline from '@mui/icons-material/HelpOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import Search from '@mui/icons-material/Search';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { useHelp } from '../contexts/HelpContext';
import { useHotkey } from '../hooks/useHotkey';
import DevUserSwitcher from './DevUserSwitcher';
import HelpPanel, { HELP_PANEL_WIDTH } from './HelpPanel';
import AboutModal from './AboutModal';
import CommandPalette from './CommandPalette';

const drawerWidth = 240;

// Native names are intentionally hardcoded (not translated) so each language is
// always shown in its own script, making the picker usable even when the active
// locale is one the user does not read. Codes not listed here fall back to the
// raw language code.
const LANGUAGE_NATIVE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  pt: 'Português',
  nl: 'Nederlands',
  nb: 'Norsk bokmål',
  zh: '简体中文',
  it: 'Italiano',
};

// Languages the app is configured for, derived from the i18next config so the
// picker stays in sync as locales are added. `cimode` is i18next's pseudo-locale
// used for debugging and must never be shown.
const SUPPORTED_LANGUAGES: string[] = (
  (i18n.options.supportedLngs || ['en']) as string[]
).filter((lng) => lng !== 'cimode');

const Layout = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout, hasScope } = useAuth();
  const { mode, toggleTheme, productName } = useThemeMode();
  const { helpOpen, openHelp } = useHelp();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState<null | HTMLElement>(null);
  const [supportAnchorEl, setSupportAnchorEl] = useState<null | HTMLElement>(null);

  // Cmd/Ctrl-K toggles the command palette (restored for registry parity).
  useHotkey(
    'mod+k',
    useCallback(() => setPaletteOpen((v) => !v), []),
  );

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSettingsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchorEl(event.currentTarget);
  };

  const handleSettingsMenuClose = () => {
    setSettingsAnchorEl(null);
  };

  const handleSupportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSupportAnchorEl(event.currentTarget);
  };

  const handleSupportMenuClose = () => {
    setSupportAnchorEl(null);
  };

  const handleDarkModeToggle = () => {
    toggleTheme();
    setSettingsAnchorEl(null);
  };

  const handleChangeLanguage = useCallback((lang: string) => {
    i18n.changeLanguage(lang);
    setSettingsAnchorEl(null);
  }, []);

  const handleOpenContextHelp = () => {
    setSupportAnchorEl(null);
    openHelp();
  };

  const handleOpenAbout = () => {
    setSupportAnchorEl(null);
    setAboutOpen(true);
  };

  // Primary nav — no section header
  const primaryNavItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/', tooltip: 'Overview charts and metrics', scope: 'dashboard:read' },
    { text: 'Workspaces', icon: <WorkspacesOutlined />, path: '/workspaces', tooltip: 'Browse Terraform workspaces', scope: 'sources:read' },
    { text: 'Analysis', icon: <Analytics />, path: '/analysis', tooltip: 'Run and view state analysis', scope: 'analysis:read' },
  ];

  // Grouped feature nav sections — non-collapsible, always visible section labels
  const navSections = [
    {
      label: 'State Management',
      items: [
        { text: 'Backups', icon: <Backup />, path: '/backups', tooltip: 'Manage state backups', scope: 'backups:read' },
        { text: 'Migrations', icon: <SwapHoriz />, path: '/migrations', tooltip: 'Migrate state between backends', scope: 'migrations:read' },
        { text: 'Reports', icon: <Assessment />, path: '/reports', tooltip: 'Generate and download reports', scope: 'reports:read' },
      ],
    },
    {
      label: 'Observability',
      items: [
        { text: 'Alerts', icon: <NotificationsActive />, path: '/alerts', tooltip: 'Alert rules, channels, and notifications', scope: 'alerts:admin' },
        { text: 'Compliance', icon: <VerifiedUser />, path: '/compliance', tooltip: 'Compliance policies and results', scope: 'compliance:read' },
      ],
    },
    {
      label: 'Configuration',
      items: [
        { text: 'State Sources', icon: <Storage />, path: '/sources', tooltip: 'Configure Terraform state sources', scope: 'sources:write' },
        { text: 'Scheduler', icon: <Schedule />, path: '/scheduler', tooltip: 'Manage scheduled tasks', scope: 'scheduler:admin' },
      ],
    },
  ];

  // Admin dashboard — shown alone, no group header (mirrors the registry).
  const adminDashboardItem = {
    text: t('nav.admin.dashboard'),
    icon: <Dashboard />,
    path: '/admin/dashboard',
    tooltip: t('nav.admin.dashboardTooltip'),
    scope: 'admin' as string | null,
  };

  // Admin / identity nav groups — each group is collapsible. Items are filtered
  // by scope. De-lumped from the previous single "Admin" bucket to mirror the
  // registry's Identity / System grouping.
  const adminNavGroups = [
    {
      key: 'identity',
      label: t('nav.admin.identity'),
      items: [
        { text: t('nav.admin.users'), icon: <People />, path: '/admin/users', tooltip: t('nav.admin.usersTooltip'), scope: 'users:read' as string | null },
        { text: t('nav.admin.organizations'), icon: <Business />, path: '/admin/organizations', tooltip: t('nav.admin.organizationsTooltip'), scope: 'organizations:read' as string | null },
        { text: t('nav.admin.roles'), icon: <Shield />, path: '/admin/roles', tooltip: t('nav.admin.rolesTooltip'), scope: 'admin' as string | null },
        { text: t('nav.admin.oidcGroups'), icon: <ManageAccounts />, path: '/admin/oidc', tooltip: t('nav.admin.oidcGroupsTooltip'), scope: 'admin' as string | null },
        { text: t('nav.admin.apiKeys'), icon: <VpnKey />, path: '/admin/api-keys', tooltip: t('nav.admin.apiKeysTooltip'), scope: null as string | null },
      ],
    },
    {
      key: 'system',
      label: t('nav.admin.system'),
      items: [
        { text: t('nav.admin.auditLogs'), icon: <History />, path: '/admin/audit-logs', tooltip: t('nav.admin.auditLogsTooltip'), scope: 'audit:read' as string | null },
      ],
    },
  ];

  // Bottom nav — always visible, low prominence
  const bottomNavItems = [
    { text: 'API Docs', icon: <Description />, path: '/api-docs', tooltip: 'API Documentation' },
  ];

  // Track which admin groups are open — persisted to localStorage so state
  // survives navigation/refresh. New groups default to open.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const defaults = Object.fromEntries(adminNavGroups.map((g) => [g.key, true]));
    try {
      const stored = localStorage.getItem('tsmAdminNavGroups');
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, boolean>;
        return Object.fromEntries(adminNavGroups.map((g) => [g.key, parsed[g.key] ?? true]));
      }
    } catch {
      // ignore malformed storage
    }
    return defaults;
  });

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('tsmAdminNavGroups', JSON.stringify(next));
      } catch {
        /* quota */
      }
      return next;
    });

  // Filter each group's items by the user's scopes, then drop empty groups.
  const visibleAdminGroups = isAuthenticated
    ? adminNavGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => item.scope === null || hasScope(item.scope)),
        }))
        .filter((group) => group.items.length > 0)
    : [];

  const showAdminDashboard =
    isAuthenticated && (adminDashboardItem.scope === null || hasScope(adminDashboardItem.scope));
  const showAdminSection = showAdminDashboard || visibleAdminGroups.length > 0;

  const renderNavItem = (item: { text: string; icon: React.ReactNode; path: string; tooltip: string }, indented = false) => {
    const isActive = item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path);
    const basePl = indented ? 24 : 16;
    return (
      <ListItem key={item.path} disablePadding>
        <Tooltip title={item.tooltip} placement="right" arrow>
          <ListItemButton
            component={RouterLink}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            sx={{
              borderLeft: isActive ? `3px solid ${theme.palette.primary.main}` : '3px solid transparent',
              bgcolor: isActive ? `${theme.palette.primary.main}14` : 'transparent',
              pl: isActive ? `${basePl - 3}px` : `${basePl}px`,
            }}
          >
            <ListItemIcon sx={{ color: isActive ? theme.palette.primary.main : 'inherit', minWidth: indented ? 36 : undefined }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.text}
              slotProps={{ primary: { sx: { fontWeight: isActive ? 600 : 400 } } }}
            />
          </ListItemButton>
        </Tooltip>
      </ListItem>
    );
  };

  const drawer = (
    <Box component="nav" aria-label={t('layout.mainNavigation', 'Main navigation')}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, color: 'primary.main' }}>
          TSM
        </Typography>
        <Typography variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
          State Manager
        </Typography>
      </Toolbar>
      <Divider />

      {/* Primary nav items */}
      <List>
        {primaryNavItems
          .filter(item => !item.scope || hasScope(item.scope))
          .map((item) => renderNavItem(item))}
      </List>

      <Divider />

      {/* Sectioned feature nav */}
      {navSections.map((section) => {
        const visibleItems = section.items.filter(item => !item.scope || hasScope(item.scope));
        if (visibleItems.length === 0) return null;
        return (
          <Box key={section.label}>
            <List disablePadding>
              <ListItem sx={{ py: 0.5, px: 2 }}>
                <ListItemText
                  primary={section.label}
                  slotProps={{
                    primary: {
                      variant: 'caption',
                      color: 'text.secondary',
                      sx: {
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      },
                    }
                  }}
                />
              </ListItem>
              {visibleItems.map((item) => renderNavItem(item, true))}
            </List>
          </Box>
        );
      })}

      {/* Admin / identity section — Dashboard standalone, then collapsible groups */}
      {showAdminSection && (
        <>
          <Divider />

          {showAdminDashboard && (
            <List disablePadding>{renderNavItem(adminDashboardItem)}</List>
          )}

          {visibleAdminGroups.map((group) => (
            <Box key={group.key}>
              <List disablePadding>
                <ListItemButton onClick={() => toggleGroup(group.key)} dense sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={group.label}
                    slotProps={{
                      primary: {
                        variant: 'caption',
                        color: 'text.secondary',
                        sx: {
                          fontWeight: 600,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        },
                      }
                    }}
                  />
                  {openGroups[group.key]
                    ? <ExpandLess fontSize="small" sx={{ color: 'text.secondary' }} />
                    : <ExpandMore fontSize="small" sx={{ color: 'text.secondary' }} />}
                </ListItemButton>
                <Collapse in={openGroups[group.key]} timeout="auto" unmountOnExit>
                  <List disablePadding>
                    {group.items.map((item) => renderNavItem(item, true))}
                  </List>
                </Collapse>
              </List>
            </Box>
          ))}
        </>
      )}

      <Divider />

      {/* Bottom nav (API Docs) */}
      <List>
        {bottomNavItems.map((item) => renderNavItem(item))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label={t('header.openDrawer')}
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {productName}
          </Typography>
          {isAuthenticated && <DevUserSwitcher />}

          {/* Command palette trigger (Cmd/Ctrl-K) */}
          <Tooltip title={t('commandPalette.openButton')}>
            <IconButton
              color="inherit"
              onClick={() => setPaletteOpen(true)}
              aria-label={t('commandPalette.openButton')}
              data-testid="command-palette-trigger"
              sx={{ mr: 1 }}
            >
              <Search />
            </IconButton>
          </Tooltip>

          {/* Settings dropdown: dark mode + language */}
          <Tooltip title={t('header.settings')}>
            <IconButton
              color="inherit"
              onClick={handleSettingsMenuOpen}
              aria-label={t('header.settings')}
              aria-haspopup="true"
              aria-controls={settingsAnchorEl ? 'settings-menu' : undefined}
              sx={{ mr: 1 }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Menu
            id="settings-menu"
            anchorEl={settingsAnchorEl}
            open={Boolean(settingsAnchorEl)}
            onClose={handleSettingsMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={handleDarkModeToggle}>
              {mode === 'dark' ? (
                <Brightness7 sx={{ mr: 1.5 }} fontSize="small" />
              ) : (
                <Brightness4 sx={{ mr: 1.5 }} fontSize="small" />
              )}
              {mode === 'dark' ? t('header.lightMode') : t('header.darkMode')}
            </MenuItem>
            {SUPPORTED_LANGUAGES.length > 1 && <Divider />}
            {SUPPORTED_LANGUAGES.length > 1 &&
              SUPPORTED_LANGUAGES.map((lang) => (
                <MenuItem
                  key={lang}
                  selected={i18n.language.startsWith(lang)}
                  onClick={() => handleChangeLanguage(lang)}
                >
                  {LANGUAGE_NATIVE_NAMES[lang] ?? lang}
                </MenuItem>
              ))}
          </Menu>

          {/* Support dropdown: context help + about */}
          <Tooltip title={t('header.support')}>
            <IconButton
              color="inherit"
              onClick={handleSupportMenuOpen}
              aria-label={t('header.support')}
              aria-haspopup="true"
              aria-controls={supportAnchorEl ? 'support-menu' : undefined}
              sx={{ mr: 1 }}
            >
              <HelpOutline />
            </IconButton>
          </Tooltip>
          <Menu
            id="support-menu"
            anchorEl={supportAnchorEl}
            open={Boolean(supportAnchorEl)}
            onClose={handleSupportMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={handleOpenContextHelp}>
              <HelpOutline sx={{ mr: 1.5 }} fontSize="small" />
              {t('header.contextHelp')}
            </MenuItem>
            <MenuItem onClick={handleOpenAbout}>
              <InfoOutlined sx={{ mr: 1.5 }} fontSize="small" />
              {t('header.about')}
            </MenuItem>
          </Menu>

          {isAuthenticated ? (
            <div>
              <IconButton
                size="large"
                aria-label={t('header.accountMenu')}
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                <AccountCircle />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                keepMounted
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem disabled>
                  <Typography variant="body2">{user?.email}</Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>{t('header.logout')}</MenuItem>
              </Menu>
            </div>
          ) : (
            <Button color="inherit" component={RouterLink} to="/login">
              {t('header.login')}
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Desktop drawer */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawer}
        </Drawer>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          transition: theme.transitions.create('margin', {
            easing: helpOpen ? theme.transitions.easing.easeOut : theme.transitions.easing.sharp,
            duration: helpOpen
              ? theme.transitions.duration.enteringScreen
              : theme.transitions.duration.leavingScreen,
          }),
          mr: !isMobile && helpOpen ? `${HELP_PANEL_WIDTH}px` : 0,
          px: 3,
          '& .MuiContainer-root': {
            marginLeft: 0,
          },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      <HelpPanel />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </Box>
  );
};

export default Layout;
