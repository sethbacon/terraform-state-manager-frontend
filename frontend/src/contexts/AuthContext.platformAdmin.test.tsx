import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ORGANIZATION_HEADER, OrganizationPicker, useAuth } from '@4cloudguru/cloud-suite-ui'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import { AuthProvider } from './AuthContext'
import { api, apiClient } from '../services/api'

/**
 * tsm#437 -- a PLATFORM ADMINISTRATOR BELONGS TO NO ORGANIZATION, and the server
 * refuses every write of theirs until they name one.
 *
 * tenantscope.Resolve returns Scope{PlatformAdmin: true} BEFORE it reads
 * memberships, so their OrgIDs is empty; ActingOrganization then answers
 * ErrAmbiguousActingOrganization for an unnamed write from such a caller
 * unconditionally, and the API returns 400 "name the organization to act in via
 * the X-Organization-Id header". The picker rendered from memberships alone, so
 * the one caller the server always requires to choose was offered nothing.
 *
 * # Why this file drives the REAL api module rather than mocking it
 *
 * The bug is a whole seam, not a component: /me -> the platform-admin standing
 * -> the organization directory -> the provider's choice universe -> a click ->
 * the api module's acting organization -> a request header. A test that mocked
 * `services/api` would assert that a picker renders and stop one step short of
 * the thing that was broken. So the axios ADAPTER is replaced instead: every
 * interceptor on the shared client runs for real, and the assertion is made on
 * the config a request would actually have gone out with.
 *
 * Symbols, not strings: the header is asserted through ORGANIZATION_HEADER
 * because that is what `services/api` writes. Matching a hand-typed
 * "X-Organization-Id" would keep passing if the shared constant moved.
 */

const ADMIN_NO_MEMBERSHIPS = {
  user: { id: 'admin-1', email: 'root@example.test', name: 'Root' },
  // The whole point: a platform administrator has NONE.
  memberships: [],
  // `admin` with no memberships can only have come from the platform_admins
  // carrier -- the role-template union is empty without a membership to carry
  // one -- which is what makes this standing derivable from /me alone.
  allowed_scopes: ['admin'],
}

const DIRECTORY = [
  { id: 'org-alpha', name: 'alpha', display_name: 'Alpha', created_at: '2026-01-01T00:00:00Z' },
  { id: 'org-beta', name: 'beta', display_name: 'Beta', created_at: '2026-01-01T00:00:00Z' },
]

type Sent = { url: string; method: string; organization: string | undefined }

let sent: Sent[]
/**
 * Every directory read this test ever made, counted separately from `sent`.
 *
 * `organizationOnTheWire` empties `sent` to isolate the request it provokes, so
 * a "the directory was never read" assertion made against `sent` afterwards is
 * INERT -- it can only see the probe. A mutation that fetched the directory for
 * every caller passed the whole file until this counter existed.
 */
let directoryReads: number
let originalAdapter: unknown
/**
 * Routes by URL; anything unrouted fails the test loudly rather than silently
 * 200ing. `fail` rejects the request the way a real outage or a 403 would.
 */
let routes: Array<{ match: RegExp; body?: unknown; fail?: boolean }>

function headerOf(config: AxiosRequestConfig, name: string): string | undefined {
  const headers = config.headers as
    | (Record<string, unknown> & { get?: (n: string) => unknown })
    | undefined
  if (!headers) return undefined
  const direct = headers[name]
  if (typeof direct === 'string') return direct
  const viaGetter = headers.get?.(name)
  return typeof viaGetter === 'string' ? viaGetter : undefined
}

beforeEach(() => {
  sent = []
  directoryReads = 0
  routes = [
    { match: /\/api\/v1\/auth\/me$/, body: ADMIN_NO_MEMBERSHIPS },
    { match: /\/api\/v1\/admin\/organizations$/, body: { organizations: DIRECTORY } },
    { match: /\/api\/v1\/apikeys\/[^/]+\/rotate$/, body: { key: 'tsm_new', api_key: { id: 'k1' } } },
    { match: /\/api\/v1\/apikeys$/, body: { key: 'tsm_new', api_key: { id: 'k1' } } },
  ]
  originalAdapter = apiClient.defaults.adapter
  apiClient.defaults.adapter = (async (config: AxiosRequestConfig) => {
    const url = config.url ?? ''
    if (url.endsWith('/api/v1/admin/organizations')) directoryReads += 1
    sent.push({
      url,
      method: (config.method ?? 'get').toLowerCase(),
      organization: headerOf(config, ORGANIZATION_HEADER),
    })
    const route = routes.find((r) => r.match.test(url))
    if (!route) throw new Error(`unrouted request in test: ${url}`)
    if (route.fail) throw new Error(`request refused in test: ${url}`)
    return {
      data: route.body,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    } as AxiosResponse
  }) as typeof apiClient.defaults.adapter
})

afterEach(() => {
  session = null
  apiClient.defaults.adapter = originalAdapter as typeof apiClient.defaults.adapter
  window.localStorage.removeItem('tsm.organization')
})

// Hands the test the session it is rendering against, so a transition (sign-out,
// a demotion) can be driven the way the app drives it rather than simulated.
let session: ReturnType<typeof useAuth> | null = null
function CaptureSession() {
  session = useAuth()
  return null
}

function renderShell() {
  return render(
    <AuthProvider>
      <OrganizationPicker tooltip="Organization" unselectedLabel="Select organization" />
      <CaptureSession />
    </AuthProvider>,
  )
}

/** The organization on the LAST request the client actually made. */
function lastOrganization(): string | undefined {
  return sent[sent.length - 1]?.organization
}

/**
 * The organization a REAL request would carry right now.
 *
 * Asserting on whatever request happened last is not the same claim: after /me
 * settles there may be no further traffic at all, and the last request in the
 * log is then the one made BEFORE the organization was known. This provokes a
 * fresh one -- the very API-key rotation the server was refusing -- and reads
 * the header off it.
 */
async function organizationOnTheWire(): Promise<string | undefined> {
  sent.length = 0
  await api.rotateAPIKey('probe', 0)
  return lastOrganization()
}

describe('a platform administrator with no memberships', () => {
  it('is offered a choice, and the choice reaches the wire', async () => {
    const user = userEvent.setup()
    renderShell()

    // 1. The directory is fetched -- the universe the picker needs exists only
    //    because this caller's memberships do not describe it.
    await waitFor(() => expect(directoryReads).toBe(1))

    // 2. A control appears. Before #437 this rendered nothing at all: the picker
    //    derived from memberships, and there were none.
    const picker = await screen.findByRole('button', { name: /Organization|Select organization/i })

    // 3. Nothing is claimed until they choose. Auto-selecting one of several
    //    would depend on an ordering the server does not promise.
    expect(lastOrganization()).toBeUndefined()

    // 4. Both organizations in the directory are offered.
    await user.click(picker)
    const beta = await screen.findByRole('menuitem', { name: /Beta/ })
    expect(screen.getByRole('menuitem', { name: /Alpha/ })).toBeInTheDocument()

    // 5. Choosing one puts it on the NEXT request. This is the half that was
    //    broken end to end: selecting used to be refused by the provider because
    //    the id matched no membership, so the click landed and nothing changed.
    await user.click(beta)
    await waitFor(() => expect(lastOrganization()).toBe('org-beta'))

    // 6. ...and specifically on the API-key write the server was refusing. Made
    //    through the real api wrapper so the assertion covers the call sites the
    //    defect was reported against, not a synthetic request.
    sent.length = 0
    await api.rotateAPIKey('key-1', 0)
    expect(sent[sent.length - 1]).toMatchObject({
      url: '/api/v1/apikeys/key-1/rotate',
      method: 'post',
      organization: 'org-beta',
    })

    await api.createAPIKey({ name: 'ci', scopes: ['state:read'] })
    expect(lastOrganization()).toBe('org-beta')
  })

  // The universe must not outlive the standing that justified it. The picker does
  // not gate on authentication -- it renders whenever there is more than one
  // choice -- so a directory left in place after sign-out puts an organization
  // chooser on the login screen of the next person to use the browser, offering
  // them a deployment's entire tenant list.
  it('drops the directory when the session ends', async () => {
    renderShell()
    await waitFor(() => expect(directoryReads).toBe(1))
    await screen.findByRole('button', { name: 'Organization' })

    routes.push({ match: /\/api\/v1\/auth\/logout$/, body: {} })
    act(() => session?.logout())

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Organization' })).toBeNull())
  })

  it('degrades to the previous behaviour when the directory cannot be read', async () => {
    routes[1] = { match: /\/api\/v1\/admin\/organizations$/, fail: true }
    renderShell()

    // The session still resolves and the tree survives -- a failed directory
    // read leaves an administrator exactly where they were before this wiring
    // existed (memberships alone, which for them is nothing), never on a blank
    // picker and never on a crash. There is no error boundary between the bridge
    // and the app shell, so "it threw" and "it degraded" look very different to a
    // user.
    await waitFor(() => expect(directoryReads).toBe(1))
    await waitFor(() => expect(screen.queryByRole('button')).toBeNull())
    expect(await organizationOnTheWire()).toBeUndefined()
  })
})

describe('everyone else is untouched', () => {
  it('does not read the directory for a single-organization member, and acts in it', async () => {
    routes[0] = {
      match: /\/api\/v1\/auth\/me$/,
      body: {
        user: { id: 'u1', email: 'a@b.test', name: 'A' },
        memberships: [{ organization_id: 'org-alpha', organization_name: 'Alpha' }],
        allowed_scopes: ['state:read'],
      },
    }
    renderShell()

    // The one organization is implicit -- no picker, and the header goes out
    // without anybody choosing anything.
    await waitFor(async () => expect(await organizationOnTheWire()).toBe('org-alpha'))
    expect(screen.queryByRole('button', { name: 'Organization' })).toBeNull()
    expect(directoryReads).toBe(0)
  })

  it('does not read the directory for a multi-organization member', async () => {
    routes[0] = {
      match: /\/api\/v1\/auth\/me$/,
      body: {
        user: { id: 'u1', email: 'a@b.test', name: 'A' },
        memberships: [
          { organization_id: 'org-alpha', organization_name: 'Alpha' },
          { organization_id: 'org-beta', organization_name: 'Beta' },
        ],
        allowed_scopes: ['state:read'],
      },
    }
    const user = userEvent.setup()
    renderShell()

    const picker = await screen.findByRole('button', { name: 'Organization' })
    await user.click(picker)
    // Exactly their memberships. If the directory leaked in for an ordinary
    // caller they would be offered organizations the server refuses on every
    // write -- a picker that looks like it works and never does.
    expect(await screen.findAllByRole('menuitem')).toHaveLength(2)
    expect(directoryReads).toBe(0)
  })

  it('does not read the directory for a tenant admin who has memberships', async () => {
    routes[0] = {
      match: /\/api\/v1\/auth\/me$/,
      body: {
        user: { id: 'u1', email: 'a@b.test', name: 'A' },
        memberships: [{ organization_id: 'org-alpha', organization_name: 'Alpha' }],
        // `admin` alone does not make somebody platform-wide: in this app it is
        // granted per organization and merely surfaces as a flat scope, so
        // widening on it would hand every single-organization admin the whole
        // directory.
        allowed_scopes: ['admin'],
      },
    }
    renderShell()

    await waitFor(async () => expect(await organizationOnTheWire()).toBe('org-alpha'))
    expect(directoryReads).toBe(0)
  })
})
