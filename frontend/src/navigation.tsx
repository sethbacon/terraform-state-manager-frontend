import type { ReactNode } from 'react'
import DashboardIcon from '@mui/icons-material/Dashboard'
import StorageIcon from '@mui/icons-material/Storage'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import ScienceIcon from '@mui/icons-material/Science'
import AssessmentIcon from '@mui/icons-material/Assessment'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import ScheduleIcon from '@mui/icons-material/Schedule'
import DescriptionIcon from '@mui/icons-material/Description'
import KeyIcon from '@mui/icons-material/Key'
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize'
import PeopleIcon from '@mui/icons-material/People'
import BusinessIcon from '@mui/icons-material/Business'
import BadgeIcon from '@mui/icons-material/Badge'
import HistoryIcon from '@mui/icons-material/History'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'
import NotificationsIcon from '@mui/icons-material/Notifications'

export interface NavItem {
  path: string
  /** i18n key for the label. */
  labelKey: string
  /** i18n key for the sidebar tooltip (optional). */
  tooltipKey?: string
  icon: ReactNode
  /** Scope required to see this item; null = always visible to authenticated users. */
  scope: string | null
}

export interface NavGroup {
  key: string
  /** i18n key for the collapsible group header. */
  labelKey: string
  items: NavItem[]
}

// Home is shown standalone at the top, above the grouped sections.
export const homeItem: NavItem = {
  path: '/',
  labelKey: 'nav.dashboard',
  tooltipKey: 'nav.dashboardTooltip',
  icon: <DashboardIcon />,
  scope: null,
}

// Collapsible, scope-filtered nav groups. The Administration group is populated
// in Phase D (identity management); until then it has no items and is not shown.
export const navGroups: NavGroup[] = [
  {
    key: 'main',
    labelKey: 'nav.groups.main',
    items: [
      { path: '/sources', labelKey: 'nav.sources', tooltipKey: 'nav.sourcesTooltip', icon: <StorageIcon />, scope: 'state:read' },
      { path: '/drift', labelKey: 'nav.drift', tooltipKey: 'nav.driftTooltip', icon: <CompareArrowsIcon />, scope: 'state:read' },
      { path: '/version-lab', labelKey: 'nav.versionLab', tooltipKey: 'nav.versionLabTooltip', icon: <ScienceIcon />, scope: 'state:read' },
      { path: '/schedules', labelKey: 'nav.schedules', tooltipKey: 'nav.schedulesTooltip', icon: <ScheduleIcon />, scope: 'sources:manage' },
      { path: '/reports', labelKey: 'nav.reports', tooltipKey: 'nav.reportsTooltip', icon: <AssessmentIcon />, scope: 'state:read' },
      { path: '/transfer', labelKey: 'nav.transfer', tooltipKey: 'nav.transferTooltip', icon: <SwapHorizIcon />, scope: 'state:transfer' },
    ],
  },
  // Admin categories mirror the registry's sidebar: an Identity group for the
  // who-can-do-what pages and a System group for operational concerns. The admin
  // Dashboard renders standalone above these groups (see Layout).
  {
    key: 'identity',
    labelKey: 'nav.groups.identity',
    items: [
      { path: '/admin/organizations', labelKey: 'nav.admin.organizations', tooltipKey: 'nav.admin.organizationsTooltip', icon: <BusinessIcon />, scope: 'admin' },
      { path: '/admin/roles', labelKey: 'nav.admin.roles', tooltipKey: 'nav.admin.rolesTooltip', icon: <BadgeIcon />, scope: 'admin' },
      { path: '/admin/users', labelKey: 'nav.admin.users', tooltipKey: 'nav.admin.usersTooltip', icon: <PeopleIcon />, scope: 'admin' },
      { path: '/admin/oidc', labelKey: 'nav.admin.oidcGroups', tooltipKey: 'nav.admin.oidcGroupsTooltip', icon: <ManageAccountsIcon />, scope: 'admin' },
      { path: '/admin/mtls', labelKey: 'nav.admin.mtls', tooltipKey: 'nav.admin.mtlsTooltip', icon: <VerifiedUserIcon />, scope: 'admin' },
      { path: '/admin/sso', labelKey: 'nav.admin.sso', tooltipKey: 'nav.admin.ssoTooltip', icon: <VpnKeyIcon />, scope: 'admin' },
      // Registry placement: API keys live under Identity. scope null —
      // self-service (everyone manages their own keys; admins see all).
      { path: '/admin/apikeys', labelKey: 'nav.admin.apiKeys', tooltipKey: 'nav.admin.apiKeysTooltip', icon: <KeyIcon />, scope: null },
    ],
  },
  {
    key: 'system',
    labelKey: 'nav.groups.system',
    items: [
      { path: '/admin/notifications', labelKey: 'nav.admin.notifications', tooltipKey: 'nav.admin.notificationsTooltip', icon: <NotificationsIcon />, scope: 'admin' },
      { path: '/admin/audit-logs', labelKey: 'nav.admin.auditLogs', tooltipKey: 'nav.admin.auditLogsTooltip', icon: <HistoryIcon />, scope: 'admin' },
    ],
  },
]

// Admin dashboard — standalone above the Identity group (registry pattern).
export const adminDashboardItem: NavItem = {
  path: '/admin',
  labelKey: 'nav.admin.dashboard',
  tooltipKey: 'nav.admin.dashboardTooltip',
  icon: <DashboardCustomizeIcon />,
  scope: 'admin',
}

// API docs — shown standalone directly under Home (always visible).
export const apiDocsItem: NavItem = {
  path: '/api-docs',
  labelKey: 'nav.apiDocs',
  tooltipKey: 'nav.apiDocsTooltip',
  icon: <DescriptionIcon />,
  scope: null,
}

// Flattened list of every routable nav item (home + api docs + admin dashboard +
// group items) for the route table in App.tsx and the command palette.
export const allNavItems: NavItem[] = [
  homeItem,
  apiDocsItem,
  adminDashboardItem,
  ...navGroups.flatMap((g) => g.items),
]
