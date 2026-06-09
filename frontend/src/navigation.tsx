import type { ReactNode } from 'react'
import DashboardIcon from '@mui/icons-material/Dashboard'
import StorageIcon from '@mui/icons-material/Storage'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import ScienceIcon from '@mui/icons-material/Science'
import AssessmentIcon from '@mui/icons-material/Assessment'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'

export interface NavItem {
  path: string
  label: string
  icon: ReactNode
  /** Roadmap phase the page is delivered in (shown on placeholder pages). */
  phase?: string
  description?: string
}

// Single source of truth for the sidebar and the route table (see App.tsx).
export const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  {
    path: '/sources',
    label: 'Sources',
    icon: <StorageIcon />,
    phase: 'Phase 1',
    description: 'Connect to existing state backends (HCP/TFC, Azure Blob, S3, GCS, local, Git) and browse their state.',
  },
  {
    path: '/drift',
    label: 'Drift',
    icon: <CompareArrowsIcon />,
    phase: 'Phase 3',
    description: 'Compare state ↔ code ↔ live infrastructure via CI pipelines and diagnose drift.',
  },
  {
    path: '/version-lab',
    label: 'Version Lab',
    icon: <ScienceIcon />,
    phase: 'Phase 4',
    description: 'Test plan health against specific Terraform, provider, and module versions.',
  },
  {
    path: '/reports',
    label: 'Reports',
    icon: <AssessmentIcon />,
    phase: 'Phase 1',
    description: 'Generate and download Markdown / JSON / CSV analyzer reports.',
  },
  {
    path: '/transfer',
    label: 'Transfer',
    icon: <SwapHorizIcon />,
    phase: 'Phase 2',
    description: 'Back up or migrate Terraform state between backends with verification.',
  },
]
