import { Link as RouterLink, useLocation } from 'react-router-dom'
import { Box, Breadcrumbs, Link, Typography } from '@mui/material'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import { useTranslation } from 'react-i18next'

export interface BreadcrumbEntry {
  /** i18n key for the crumb label. */
  labelKey: string
  /** Route destination; the final crumb has none (rendered as plain text). */
  to?: string
}

/** Map of /admin/<segment> → i18n label key (labels reuse the nav keys). */
const SEGMENT_LABEL_KEYS: Record<string, string> = {
  users: 'nav.admin.users',
  organizations: 'nav.admin.organizations',
  roles: 'nav.admin.roles',
  'platform-admins': 'nav.admin.platformAdmins',
  oidc: 'nav.admin.oidcGroups',
  mtls: 'nav.admin.mtls',
  sso: 'nav.admin.sso',
  notifications: 'nav.admin.notifications',
  'audit-logs': 'nav.admin.auditLogs',
}

/** Build the breadcrumb trail for an admin pathname; empty for non-admin routes. */
export function buildAdminBreadcrumbs(pathname: string): BreadcrumbEntry[] {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'admin') return []

  const crumbs: BreadcrumbEntry[] = [{ labelKey: 'nav.admin.dashboard', to: '/admin' }]
  const sectionKey = parts.length > 1 ? SEGMENT_LABEL_KEYS[parts[1]] : undefined
  if (sectionKey) crumbs.push({ labelKey: sectionKey })
  return crumbs
}

/**
 * Breadcrumb trail rendered above admin pages (mounted once in Layout, like the
 * registry's AdminBreadcrumbs). Hidden outside /admin and on the dashboard
 * itself — a single-crumb trail carries no information.
 */
export default function AdminBreadcrumbs() {
  const { t } = useTranslation()
  const location = useLocation()
  const crumbs = buildAdminBreadcrumbs(location.pathname)

  if (crumbs.length < 2) return null

  return (
    <Box sx={{ mb: 2 }} data-testid="admin-breadcrumbs">
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label={t('a11y.breadcrumbs')}>
        {crumbs.map((c, i) =>
          c.to ? (
            <Link key={i} component={RouterLink} to={c.to} underline="hover" color="inherit" variant="body2">
              {t(c.labelKey)}
            </Link>
          ) : (
            <Typography key={i} variant="body2" sx={{ color: 'text.primary' }}>
              {t(c.labelKey)}
            </Typography>
          ),
        )}
      </Breadcrumbs>
    </Box>
  )
}
