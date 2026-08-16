import { describe, it, expect } from 'vitest'
import { buildAdminBreadcrumbs } from './AdminBreadcrumbs'

describe('buildAdminBreadcrumbs', () => {
  it('returns nothing for non-admin routes', () => {
    expect(buildAdminBreadcrumbs('/')).toEqual([])
    expect(buildAdminBreadcrumbs('/sources')).toEqual([])
  })

  it('returns a single dashboard crumb on /admin (hidden by the component)', () => {
    expect(buildAdminBreadcrumbs('/admin')).toEqual([{ labelKey: 'nav.admin.dashboard', to: '/admin' }])
  })

  it('builds Dashboard → section with only the final crumb unlinked', () => {
    expect(buildAdminBreadcrumbs('/admin/users')).toEqual([
      { labelKey: 'nav.admin.dashboard', to: '/admin' },
      { labelKey: 'nav.admin.users' },
    ])
    expect(buildAdminBreadcrumbs('/admin/audit-logs')).toEqual([
      { labelKey: 'nav.admin.dashboard', to: '/admin' },
      { labelKey: 'nav.admin.auditLogs' },
    ])
    expect(buildAdminBreadcrumbs('/admin/platform-admins')).toEqual([
      { labelKey: 'nav.admin.dashboard', to: '/admin' },
      { labelKey: 'nav.admin.platformAdmins' },
    ])
  })

  it('ignores unknown admin segments', () => {
    expect(buildAdminBreadcrumbs('/admin/nonexistent')).toEqual([
      { labelKey: 'nav.admin.dashboard', to: '/admin' },
    ])
  })
})
