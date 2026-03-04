import { Outlet, Link as RouterLink, useLocation } from 'react-router-dom';
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
import Storage from '@mui/icons-material/Storage';
import Schedule from '@mui/icons-material/Schedule';
import Brightness4 from '@mui/icons-material/Brightness4';
import Brightness7 from '@mui/icons-material/Brightness7';
import HelpOutline from '@mui/icons-material/HelpOutline';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { useHelp } from '../contexts/HelpContext';
import DevUserSwitcher from './DevUserSwitcher';
import HelpPanel, { HELP_PANEL_WIDTH } from './HelpPanel';

const drawerWidth = 240;

const Layout = () => {
  const { user, isAuthenticated, logout, hasScope } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const { helpOpen, openHelp } = useHelp();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  // Primary nav — no section header
  const primaryNavItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/', tooltip: 'Overview charts and metrics', scope: 'dashboard:read' },
    { text: 'Workspaces', icon: <WorkspacesOutlined />, path: '/workspaces', tooltip: 'Browse Terraform workspaces', scope: 'sources:read' },
    { text: 'Analysis', icon: <Analytics />, path: '/analysis', tooltip: 'Run and view state analysis', scope: 'analysis:read' },
  ];

  // Grouped nav sections — non-collapsible, always visible section labels
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

  // Admin nav items — flat list, under a collapsible "Admin" header
  const adminNavItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/admin/dashboard', tooltip: 'Admin system stats', scope: 'admin' as string | null },
    { text: 'Users', icon: <People />, path: '/admin/users', tooltip: 'View and manage users', scope: 'users:read' as string | null },
    { text: 'Organizations', icon: <Business />, path: '/admin/organizations', tooltip: 'Manage organizations', scope: 'organizations:read' as string | null },
    { text: 'Roles', icon: <Shield />, path: '/admin/roles', tooltip: 'Configure role templates', scope: 'admin' as string | null },
    { text: 'API Keys', icon: <VpnKey />, path: '/admin/api-keys', tooltip: 'Create and manage API keys', scope: null as string | null },
  ];

  // Bottom nav — always visible, low prominence
  const bottomNavItems = [
    { text: 'API Docs', icon: <Description />, path: '/api-docs', tooltip: 'API Documentation' },
  ];

  const [adminOpen, setAdminOpen] = useState(() => {
    try {
      const stored = localStorage.getItem('tsmAdminNavOpen');
      return stored !== null ? JSON.parse(stored) : true;
    } catch { return true; }
  });

  const toggleAdmin = () =>
    setAdminOpen((prev: boolean) => {
      const next = !prev;
      try { localStorage.setItem('tsmAdminNavOpen', JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });

  const visibleAdminItems = isAuthenticated
    ? adminNavItems.filter(item => item.scope === null || hasScope(item.scope))
    : [];

  const renderNavItem = (item: { text: string; icon: React.ReactNode; path: string; tooltip: string }, indented = false) => {
    const isActive = item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path);
    const basePl = indented ? 24 : 16;
    return (
      <ListItem key={item.text} disablePadding>
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
              primaryTypographyProps={{ fontWeight: isActive ? 600 : 400 }}
            />
          </ListItemButton>
        </Tooltip>
      </ListItem>
    );
  };

  const drawer = (
    <Box>
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

      {/* Sectioned nav */}
      {navSections.map((section) => {
        const visibleItems = section.items.filter(item => !item.scope || hasScope(item.scope));
        if (visibleItems.length === 0) return null;
        return (
          <Box key={section.label}>
            <List disablePadding>
              <ListItem sx={{ py: 0.5, px: 2 }}>
                <ListItemText
                  primary={section.label}
                  primaryTypographyProps={{
                    variant: 'caption',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                />
              </ListItem>
              {visibleItems.map((item) => renderNavItem(item, true))}
            </List>
          </Box>
        );
      })}

      {/* Admin section */}
      {visibleAdminItems.length > 0 && (
        <>
          <Divider />
          <List disablePadding>
            <ListItemButton onClick={toggleAdmin} dense sx={{ py: 0.5 }}>
              <ListItemText
                primary="Admin"
                primaryTypographyProps={{
                  variant: 'caption',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                }}
              />
              {adminOpen
                ? <ExpandLess fontSize="small" sx={{ color: 'text.secondary' }} />
                : <ExpandMore fontSize="small" sx={{ color: 'text.secondary' }} />}
            </ListItemButton>
            <Collapse in={adminOpen} timeout="auto" unmountOnExit>
              <List disablePadding>
                {visibleAdminItems.map((item) => renderNavItem(item, true))}
              </List>
            </Collapse>
          </List>
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
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Terraform State Manager
          </Typography>
          {isAuthenticated && <DevUserSwitcher />}
          <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
            <IconButton
              color="inherit"
              onClick={toggleTheme}
              aria-label="toggle dark mode"
              sx={{ mr: 1 }}
            >
              {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Context Help">
            <IconButton
              color="inherit"
              onClick={openHelp}
              aria-label="Context help"
              sx={{ mr: 1 }}
            >
              <HelpOutline />
            </IconButton>
          </Tooltip>
          {isAuthenticated ? (
            <div>
              <IconButton
                size="large"
                aria-label="account of current user"
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
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </div>
          ) : (
            <Button color="inherit" component={RouterLink} to="/login">
              Login
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
    </Box>
  );
};

export default Layout;
