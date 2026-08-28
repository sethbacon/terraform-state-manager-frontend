/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { ORGANIZATION_HEADER } from '@4cloudguru/cloud-suite-ui'

import { apiClient, setActingOrganization } from './api'

/**
 * GUARD: a write that must be stamped with an organization cannot leave this
 * frontend without naming one.
 *
 * # What it is guarding against
 *
 * Nine handlers in the backend resolve an ACTING ORGANIZATION before they insert
 * a row, and eleven routes reach them. A request that arrives without
 * `X-Organization-Id` is refused with 400 "name the organization to act in" for
 * any caller who could act in more than one place, and unconditionally for a
 * platform administrator. See sethbacon/terraform-state-manager-backend#437.
 *
 * The failure is SILENT in every way that matters. Nothing throws. The header is
 * attached in one interceptor, so a call site that reaches the network another
 * way simply omits it, and the omission is invisible until a multi-organization
 * user tries to write — which single-organization development and
 * single-organization testing never do.
 *
 * # Why the assertion is where it is
 *
 * Asserting per call site would be the obvious place and the wrong one: it
 * proves something about the call sites that exist today and nothing about the
 * next one. The header is attached by the axios request interceptor, so the
 * property that actually holds the line is a pair:
 *
 *   1. THE DOOR ALWAYS STAMPS. The interceptor attaches the header for every
 *      method and every url, so a route added tomorrow is covered by
 *      construction and no list has to be maintained for it to be.
 *
 *   2. THERE IS ONLY ONE DOOR. No module outside this one may reach the network
 *      at all, so there is nowhere for a request to be issued that the
 *      interceptor does not see.
 *
 * Either half alone is trivially bypassable. An unconditional interceptor is
 * irrelevant to a `fetch` call somewhere else; a transport monopoly is worthless
 * if the monopolist decides some requests do not need stamping.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(HERE, '..')

// The interceptor under test, reached the way the existing api tests reach it.
type RequestConfig = { method?: string; url?: string; headers?: Record<string, string> }
type Handlers = { handlers: { fulfilled: (c: RequestConfig) => RequestConfig }[] }
const runInterceptor = (config: RequestConfig): RequestConfig =>
  (apiClient.interceptors.request as unknown as Handlers).handlers[0].fulfilled(config)

const ACTING = '11111111-1111-4111-8111-111111111111'

afterEach(() => setActingOrganization(null))

/**
 * The eleven routes whose handler resolves an acting organization before it
 * inserts, as of backend `internal/api`. Nine call sites, because `mintKey`
 * serves both create and rotate and `doTransfer` serves both backup and migrate.
 *
 * This list is a READABILITY aid, not the guard's load-bearing part — the
 * property test below covers any url at all, including one this list has never
 * heard of. It is here so the failure message names the actual user-facing
 * operation that would break, and because #437 was reported against exactly one
 * of these and it was worth writing down that it is not the only one.
 */
const STAMPED_ROUTES: [string, string][] = [
  ['POST', '/api/v1/apikeys'],
  ['POST', '/api/v1/apikeys/k-1/rotate'],
  ['POST', '/api/v1/sources'],
  ['POST', '/api/v1/sources/s-1/state/backup'],
  ['POST', '/api/v1/sources/s-1/state/migrate'],
  ['POST', '/api/v1/pipelines'],
  ['POST', '/api/v1/ci-sources'],
  ['POST', '/api/v1/drift/runs'],
  ['POST', '/api/v1/health-lab/runs'],
  ['POST', '/api/v1/schedules'],
  ['POST', '/api/v1/notifications/channels'],
]

describe('GUARD: every organization-stamped write carries the acting organization', () => {
  it.each(STAMPED_ROUTES)('%s %s carries the header', (method, url) => {
    setActingOrganization(ACTING)
    const out = runInterceptor({ method: method.toLowerCase(), url, headers: {} })
    expect(
      out.headers?.[ORGANIZATION_HEADER],
      `${method} ${url} would be refused with "name the organization to act in"`,
    ).toBe(ACTING)
  })

  // Every route above is issued through apiClient today. If one stops being, the
  // interceptor never sees it and the assertion above goes vacuous while staying
  // green — so pin that the api module is where these urls actually live.
  it.each(STAMPED_ROUTES)('%s %s is issued through the shared client', (_method, url) => {
    const source = readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8')
    // Compare on the static prefix: the real call sites interpolate an id.
    const prefix = url.split('/').slice(0, 4).join('/')
    expect(source, `${url} is no longer issued from services/api.ts`).toContain(prefix)
  })
})

/**
 * THE BLIND AXIS. The list above is a set of examples, and a guard made only of
 * examples is defeated by anything not on it.
 *
 * The realistic way this breaks is not a deleted interceptor — it is someone
 * narrowing it, because sending an organization on a GET looks redundant. Narrow
 * it to mutations and every read stops carrying it, which is the header /me needs
 * to answer with the SELECTED organization's scopes rather than a union. Narrow
 * it to a url prefix and the next route family outside that prefix is born
 * broken. Both leave the eleven cases above green.
 *
 * So the property, not the examples: for ANY method and ANY url, if there is an
 * acting organization the header goes out.
 */
describe('GUARD: the interceptor stamps unconditionally, not selectively', () => {
  const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', undefined]
  const URLS = [
    '/api/v1/sources',
    '/api/v1/auth/me',
    '/health',
    '/api/v2/something-that-does-not-exist-yet',
    '/api/v1/a/route/family/invented/after/this/guard/was/written',
    '',
    undefined,
  ]

  for (const method of METHODS) {
    for (const url of URLS) {
      it(`stamps ${method ?? '(default)'} ${url === undefined ? '(no url)' : url || '(empty)'}`, () => {
        setActingOrganization(ACTING)
        const out = runInterceptor({ method, url, headers: {} })
        expect(out.headers?.[ORGANIZATION_HEADER]).toBe(ACTING)
      })
    }
  }

  // The converse, so the guard cannot be satisfied by hardcoding a value: with
  // nothing selected nothing is sent. A caller who reaches several organizations
  // and has not chosen has nothing to claim, and the backend refuses that write
  // deliberately — inventing a value here would be the tenancy bug, not the fix.
  it('sends nothing when no organization is selected', () => {
    setActingOrganization(null)
    const out = runInterceptor({ method: 'post', url: '/api/v1/sources', headers: {} })
    expect(out.headers?.[ORGANIZATION_HEADER]).toBeUndefined()
  })

  // The name is the shared constant, not a hand-typed string. Two ends spelling
  // it differently is the exact defect the shared package exists to close, and a
  // literal here would drift silently the day the constant changed.
  it('spells the header with the shared constant', () => {
    const source = readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8')
    expect(source).toContain('ORGANIZATION_HEADER')
    expect(source).not.toMatch(/['"`]X-Organization-Id['"`]/)
    expect(ORGANIZATION_HEADER).toBe('X-Organization-Id')
  })
})

/**
 * THE TRANSPORT MONOPOLY. An unconditional interceptor guards nothing if a
 * module can reach the network without going through it.
 *
 * Every legal spelling of "escape the client" is matched, because matching only
 * `axios.post` is the shape of guard this estate has had defeated before:
 * `axios.request`, a second `axios.create`, `fetch`, `XMLHttpRequest` and
 * `sendBeacon` are all requests the interceptor never sees.
 */
describe('GUARD: services/api.ts is the only way out of this frontend', () => {
  // Each entry is a file that legitimately reaches the network another way, with
  // the reason. The check is BIDIRECTIONAL: an entry whose escape has since been
  // removed fails too, so the allowlist cannot quietly accumulate permissions for
  // code that no longer needs them and then cover a later, unrelated escape.
  const ALLOWED = new Map<string, string>([
    [
      'services/api.ts',
      'the client itself, and the one place the interceptor attaches the header',
    ],
    [
      'hooks/useSuite.ts',
      'a pre-authentication GET of /api/v1/ui/config that must degrade to "no sibling" ' +
        'rather than participate in session handling; it reads nothing and writes nothing',
    ],
  ])

  // EVERY LEGAL SPELLING, not the obvious one. Each pattern below was written,
  // then defeated by a rewrite of the same escape, then widened until the rewrite
  // was caught too. The three that got through the first draft are recorded
  // because they are what a guard like this is normally defeated by:
  //
  //   globalThis.fetch(...)   a lookbehind excluding "." to skip refetch/prefetch
  //                           also excused every qualified call
  //   window.fetch(...)       same hole, different receiver
  //   await import('axios')   matching `from 'axios'` sees static imports only
  //
  // So: fetch is matched on a non-word boundary, which still skips `refetch(`
  // and `prefetchQuery(` but no longer excuses a qualified receiver; and axios is
  // matched on the MODULE SPECIFIER, which every way of loading it must spell —
  // static import, dynamic import, or require.
  const ESCAPES: [string, RegExp][] = [
    ['loads axios directly', /['"]axios['"]/],
    ['calls fetch', /(?<!\w)fetch\s*\(/],
    ['uses XMLHttpRequest', /\bXMLHttpRequest\b/],
    ['uses navigator.sendBeacon', /\bsendBeacon\s*\(/],
  ]

  function sourceFiles(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'locales') continue
        sourceFiles(full, acc)
      } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
        acc.push(full)
      }
    }
    return acc
  }

  const files = sourceFiles(SRC)

  // A guard that enumerated nothing would pass for the wrong reason. This is the
  // "failing on an empty universe" check: if the walk breaks, say so loudly
  // instead of certifying a codebase nobody looked at.
  it('found the source tree it is supposed to be checking', () => {
    expect(files.length).toBeGreaterThan(50)
    expect(files.some((f) => f.endsWith(path.join('services', 'api.ts')))).toBe(true)
  })

  it('no module outside the allowlist reaches the network directly', () => {
    const offenders: string[] = []
    for (const file of files) {
      const rel = path.relative(SRC, file).split(path.sep).join('/')
      if (ALLOWED.has(rel)) continue
      const source = readFileSync(file, 'utf8')
      for (const [what, pattern] of ESCAPES) {
        if (pattern.test(source)) {
          offenders.push(
            `${rel} ${what} — it would bypass the interceptor that attaches ` +
              `${ORGANIZATION_HEADER}, and any organization-stamped write it issues ` +
              `would be refused. Route it through services/api.ts, or add it to ` +
              `ALLOWED here with the reason it needs no acting organization.`,
          )
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('every allowlisted exemption is still needed', () => {
    for (const [rel, why] of ALLOWED) {
      const source = readFileSync(path.join(SRC, rel), 'utf8')
      const escapes = ESCAPES.some(([, pattern]) => pattern.test(source))
      expect(
        escapes,
        `${rel} no longer reaches the network directly, so its exemption ("${why}") ` +
          `is stale. Remove it — a stale entry is a standing permission for whatever ` +
          `is added to that file next.`,
      ).toBe(true)
    }
  })
})
