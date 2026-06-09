import type { ReactNode } from 'react'
import DashboardIcon from '@mui/icons-material/Dashboard'
import StorageIcon from '@mui/icons-material/Storage'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import ScienceIcon from '@mui/icons-material/Science'
import AssessmentIcon from '@mui/icons-material/Assessment'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import ApiIcon from '@mui/icons-material/Api'

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
      { path: '/reports', labelKey: 'nav.reports', tooltipKey: 'nav.reportsTooltip', icon: <AssessmentIcon />, scope: 'state:read' },
      { path: '/transfer', labelKey: 'nav.transfer', tooltipKey: 'nav.transferTooltip', icon: <SwapHorizIcon />, scope: 'state:transfer' },
    ],
  },
  {
    key: 'administration',
    labelKey: 'nav.groups.administration',
    items: [],
  },
]

// API docs — shown standalone at the bottom of the drawer (always visible).
export const apiDocsItem: NavItem = {
  path: '/api-docs',
  labelKey: 'nav.apiDocs',
  tooltipKey: 'nav.apiDocsTooltip',
  icon: <ApiIcon />,
  scope: null,
}

// Flattened list of every routable nav item (home + group items + api docs) for
// the route table in App.tsx and the command palette.
export const allNavItems: NavItem[] = [homeItem, ...navGroups.flatMap((g) => g.items), apiDocsItem]
