import { describe, expect, it } from 'vitest'
import i18n from './i18n'
import { adminDashboardItem, allNavItems, apiDocsItem, homeItem, navGroups } from './navigation'

describe('navigation config', () => {
  it('flattens every group item plus the standalone entries into allNavItems', () => {
    const groupItemCount = navGroups.reduce((n, g) => n + g.items.length, 0)
    expect(allNavItems).toHaveLength(groupItemCount + 3) // home + api docs + admin dashboard
    expect(allNavItems[0]).toBe(homeItem)
    expect(allNavItems[1]).toBe(apiDocsItem)
    expect(allNavItems[2]).toBe(adminDashboardItem)
  })

  it('has unique route paths', () => {
    const paths = allNavItems.map((i) => i.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('gives every item an icon and a label key that resolves in English', () => {
    for (const item of allNavItems) {
      expect(item.icon, item.path).toBeTruthy()
      expect(i18n.exists(item.labelKey), `${item.path} labelKey ${item.labelKey}`).toBe(true)
      if (item.tooltipKey) {
        expect(i18n.exists(item.tooltipKey), `${item.path} tooltipKey ${item.tooltipKey}`).toBe(true)
      }
    }
    for (const group of navGroups) {
      expect(i18n.exists(group.labelKey), `group ${group.key}`).toBe(true)
    }
  })

  it('gates admin routes behind the admin scope and core pages behind read scopes', () => {
    for (const item of allNavItems.filter((i) => i.path.startsWith('/admin'))) {
      if (item.path === '/admin/apikeys' || item.path === '/admin') {
        // /admin/apikeys is self-service. /admin (the dashboard index) shows the
        // estate overview to any authenticated user — its identity counts are
        // gated in-page — while the child /admin/* pages remain admin-only.
        expect(item.scope, item.path).toBeNull()
        continue
      }
      expect(item.scope, item.path).toBe('admin')
    }
    expect(homeItem.scope).toBeNull()
    expect(apiDocsItem.scope).toBeNull()
    const transfer = allNavItems.find((i) => i.path === '/transfer')
    expect(transfer?.scope).toBe('state:transfer')
    const schedules = allNavItems.find((i) => i.path === '/schedules')
    expect(schedules?.scope).toBe('sources:manage')
  })
})
