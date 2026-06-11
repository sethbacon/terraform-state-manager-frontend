import { describe, expect, it } from 'vitest'
import { queryKeys } from './queryKeys'

describe('queryKeys', () => {
  it('scopes every key family under a stable root', () => {
    expect(queryKeys.system.version).toEqual(['system', 'version'])
    expect(queryKeys.system.health).toEqual(['system', 'health'])
    expect(queryKeys.dashboard.overview()).toEqual(['dashboard', 'overview'])
    expect(queryKeys.callbackPreflight()).toEqual(['pipelines', 'callback-preflight'])
  })

  it('admin keys carry optional params for cache separation', () => {
    expect(queryKeys.admin.users()).toEqual(['admin', 'users'])
    expect(queryKeys.admin.users({ page: 2 })).toEqual(['admin', 'users', { page: 2 }])
    expect(queryKeys.admin.auditLogs()).toEqual(['admin', 'audit-logs'])
    expect(queryKeys.admin.auditLogs({ action: 'x' })).toEqual(['admin', 'audit-logs', { action: 'x' }])
    expect(queryKeys.admin.orgMembers('o1')).toEqual(['admin', 'organizations', 'o1', 'members'])
  })

  it('parameterised keys extend their prefix so prefix invalidation reaches them', () => {
    // invalidate(sources.all) must match every sources.* key
    const prefixed = [
      queryKeys.sources.list(),
      queryKeys.sources.states('s1'),
      queryKeys.sources.analysis('s1', 'k'),
      queryKeys.sources.resources('s1', 'k'),
      queryKeys.sources.raw('s1', 'k'),
      queryKeys.sources.backups('s1', 'k'),
    ]
    for (const key of prefixed) {
      expect(key[0]).toBe(queryKeys.sources.all[0])
    }

    expect(queryKeys.pipelines.list()[0]).toBe(queryKeys.pipelines.all[0])
    expect(queryKeys.drift.runs()[0]).toBe(queryKeys.drift.all[0])
    expect(queryKeys.schedules.list()[0]).toBe(queryKeys.schedules.all[0])
    expect(queryKeys.health.runs()[0]).toBe(queryKeys.health.all[0])
    for (const key of [
      queryKeys.ciSources.list(),
      queryKeys.ciSources.pipelines('c'),
      queryKeys.ciSources.repos('c'),
      queryKeys.ciSources.workflows('c', 'r'),
      queryKeys.ciSources.serviceConnections('c'),
    ]) {
      expect(key[0]).toBe(queryKeys.ciSources.all[0])
    }
  })

  it('distinct state keys never collide across ids or state files', () => {
    const a = queryKeys.sources.analysis('s1', 'k1').join('|')
    const b = queryKeys.sources.analysis('s1', 'k2').join('|')
    const c = queryKeys.sources.analysis('s2', 'k1').join('|')
    expect(new Set([a, b, c]).size).toBe(3)
  })
})
