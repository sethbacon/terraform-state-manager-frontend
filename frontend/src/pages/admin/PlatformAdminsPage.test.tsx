import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PlatformAdminsPage from './PlatformAdminsPage'
import { api, type AdminUser, type PlatformAdmin } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import i18n from '../../i18n'

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>()
  return {
    ...actual,
    api: {
      listPlatformAdmins: vi.fn(),
      grantPlatformAdmin: vi.fn(),
      revokePlatformAdmin: vi.fn(),
      listAdminUsers: vi.fn(),
    },
  }
})
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }))

const mocked = vi.mocked(api)
const mockedUseAuth = vi.mocked(useAuth)
type AuthShape = ReturnType<typeof useAuth>

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts) as string

/** The signed-in operator: alice, who also holds a grant of her own. */
const ALICE_ID = '11111111-1111-1111-1111-111111111111'
const BOB_ID = '22222222-2222-2222-2222-222222222222'
const CAROL_ID = '33333333-3333-3333-3333-333333333333'
const GHOST_ID = '000000ff-0000-0000-0000-0000000000ff'
const GHOST2_ID = '000000fe-0000-0000-0000-0000000000fe'

/** Resolved grantee, resolved granter, note present — the fully-populated row. */
const alice: PlatformAdmin = {
  user_id: ALICE_ID,
  email: 'alice@example.com',
  name: 'Alice',
  granted_by: '99999999-9999-9999-9999-999999999999',
  granted_by_email: 'root@example.com',
  granted_at: '2026-06-01T09:00:00Z',
  note: 'on call',
  orphaned: false,
}
/** Granter recorded but no longer resolvable, and no note. */
const bob: PlatformAdmin = {
  user_id: BOB_ID,
  email: 'bob@example.com',
  name: 'Bob',
  granted_by: '88888888-8888-8888-8888-888888888888',
  granted_at: '2026-06-02T09:00:00Z',
  note: null,
  orphaned: false,
}
/** Grantee gone (orphan), granted_by NULL (first-boot bootstrap). */
const ghost: PlatformAdmin = {
  user_id: GHOST_ID,
  granted_by: null,
  granted_at: '2026-05-01T09:00:00Z',
  note: 'bootstrap',
  orphaned: true,
}
const ghost2: PlatformAdmin = { ...ghost, user_id: GHOST2_ID, note: null }

const carolUser: AdminUser = {
  id: CAROL_ID,
  email: 'carol@example.com',
  name: 'Carol',
  created_at: '2026-06-01T00:00:00Z',
}
const aliceUser: AdminUser = {
  id: ALICE_ID,
  email: 'alice@example.com',
  name: 'Alice',
  created_at: '2026-06-01T00:00:00Z',
}

/** An axios-shaped rejection: the status is what these paths branch on. */
function httpError(status: number, message?: string) {
  return { response: { status, data: message ? { error: message } : {} } }
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <PlatformAdminsPage />
    </QueryClientProvider>,
  )
}

/** Open the revoke dialog for a listed grant and return the dialog. */
async function openRevoke(admin: PlatformAdmin) {
  fireEvent.click(await screen.findByLabelText(t('admin.platformAdmins.ariaRevoke', { subject: admin.email || admin.user_id })))
  return screen.findByRole('dialog')
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseAuth.mockReturnValue({
    user: { id: ALICE_ID, email: 'alice@example.com', name: 'Alice' },
  } as unknown as AuthShape)
  mocked.listPlatformAdmins.mockResolvedValue([alice, bob])
  mocked.listAdminUsers.mockResolvedValue({ users: [aliceUser, carolUser], total: 2 })
})

describe('PlatformAdminsPage — provenance listing', () => {
  it('shows a spinner while the carrier is read', () => {
    mocked.listPlatformAdmins.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders grantee, granter, timestamp and note for every grant', async () => {
    renderPage()
    expect(await screen.findByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    // Own grant is marked.
    expect(screen.getByText(t('admin.platformAdmins.chipYou'))).toBeInTheDocument()
    // Granter resolved → address; granter deleted → id, not a blank cell.
    expect(screen.getByText('root@example.com')).toBeInTheDocument()
    expect(
      screen.getByText(t('admin.platformAdmins.grantedByUnresolved', { id: bob.granted_by })),
    ).toBeInTheDocument()
    // Note present, and the placeholder where there is none.
    expect(screen.getByText('on call')).toBeInTheDocument()
    expect(screen.getByText(t('admin.platformAdmins.noNote'))).toBeInTheDocument()
    expect(screen.getByText(new Date(alice.granted_at).toLocaleString())).toBeInTheDocument()
  })

  it('names the first-boot bootstrap row rather than showing an empty granter', async () => {
    mocked.listPlatformAdmins.mockResolvedValue([ghost])
    renderPage()
    expect(await screen.findByText(t('admin.platformAdmins.grantedByBootstrap'))).toBeInTheDocument()
  })

  it('lists orphaned grants with a visual state and summarises them', async () => {
    mocked.listPlatformAdmins.mockResolvedValue([alice, ghost])
    renderPage()
    expect(await screen.findByText(t('admin.platformAdmins.orphanTitle'))).toBeInTheDocument()
    // The id is all the carrier still knows: it must be shown, not blanked.
    expect(screen.getByText(GHOST_ID)).toBeInTheDocument()
    expect(screen.getByText(t('admin.platformAdmins.orphanHint'))).toBeInTheDocument()
    expect(
      within(screen.getByTestId('platform-admins-orphan-summary')).getByText(
        t('admin.platformAdmins.orphanSummary', { count: 1 }),
      ),
    ).toBeInTheDocument()
    // A resolved grant must not pick up the orphan treatment.
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.queryByText(ALICE_ID)).not.toBeInTheDocument()
  })

  it('shows the empty state when the carrier holds no grants', async () => {
    mocked.listPlatformAdmins.mockResolvedValue([])
    renderPage()
    expect(await screen.findByTestId('platform-admins-empty-state')).toBeInTheDocument()
    expect(screen.queryByTestId('platform-admins-orphan-summary')).not.toBeInTheDocument()
  })

  it('re-reads the carrier on refresh', async () => {
    renderPage()
    await screen.findByText('Alice')
    fireEvent.click(screen.getByRole('button', { name: t('common.refresh') }))
    await waitFor(() => expect(mocked.listPlatformAdmins).toHaveBeenCalledTimes(2))
  })
})

describe('PlatformAdminsPage — 503 is not 500', () => {
  it('offers retry and a configuration hint when the carrier cannot answer', async () => {
    mocked.listPlatformAdmins.mockRejectedValue(httpError(503, 'the identity store could not be reached'))
    renderPage()
    const alert = await screen.findByTestId('platform-admins-unavailable')
    expect(within(alert).getByText(t('admin.platformAdmins.unavailableTitle'))).toBeInTheDocument()
    expect(within(alert).getByText(t('admin.platformAdmins.errUnavailable'))).toBeInTheDocument()
    expect(screen.queryByTestId('platform-admins-load-error')).not.toBeInTheDocument()

    fireEvent.click(within(alert).getByRole('button', { name: t('common.retry') }))
    await waitFor(() => expect(mocked.listPlatformAdmins).toHaveBeenCalledTimes(2))
  })

  it('reports any other failure as a plain load error', async () => {
    mocked.listPlatformAdmins.mockRejectedValue(httpError(500, 'boom'))
    renderPage()
    const alert = await screen.findByTestId('platform-admins-load-error')
    expect(within(alert).getByText('boom')).toBeInTheDocument()
    expect(screen.queryByTestId('platform-admins-unavailable')).not.toBeInTheDocument()
  })
})

describe('PlatformAdminsPage — the last-administrator floor', () => {
  it('counts orphans as nobody, so the one resolvable grant is the last one', async () => {
    // Three administrators listed; two of them elevate no one. `length > 1`
    // would let this revoke through.
    mocked.listPlatformAdmins.mockResolvedValue([bob, ghost, ghost2])
    renderPage()
    const dialog = await openRevoke(bob)

    expect(within(dialog).getByTestId('platform-admins-last-admin')).toBeInTheDocument()
    expect(within(dialog).getByText(t('admin.platformAdmins.lastAdminBody'))).toBeInTheDocument()
    // The refusal explains what the floor counts; it must not claim the
    // deployment would be stranded (role-template admins are not counted).
    expect(within(dialog).getByText(t('admin.platformAdmins.lastAdminScope'))).toBeInTheDocument()
    expect(
      within(dialog).queryByRole('button', { name: t('admin.platformAdmins.confirmRevoke') }),
    ).not.toBeInTheDocument()
    expect(mocked.revokePlatformAdmin).not.toHaveBeenCalled()
  })

  it('confirms normally while another grant still resolves', async () => {
    mocked.revokePlatformAdmin.mockResolvedValue(undefined)
    renderPage()
    const dialog = await openRevoke(bob)

    expect(within(dialog).queryByTestId('platform-admins-last-admin')).not.toBeInTheDocument()
    expect(
      within(dialog).getByText(t('admin.platformAdmins.revokeConfirm', { subject: 'bob@example.com' })),
    ).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: t('admin.platformAdmins.confirmRevoke') }))

    await waitFor(() => expect(mocked.revokePlatformAdmin).toHaveBeenCalledWith(BOB_ID))
    expect(
      await screen.findByText(t('admin.platformAdmins.msgRevoked', { subject: 'bob@example.com' })),
    ).toBeInTheDocument()
  })

  it('explains a server 409 in place instead of reporting it as a failure', async () => {
    // The client-side prediction passes here (two resolvable grants), so the
    // 409 can only come from the server — a user deleted between list and
    // revoke is exactly the case the prediction cannot see.
    mocked.revokePlatformAdmin.mockRejectedValue(httpError(409, 'the last platform administrator cannot be revoked'))
    renderPage()
    const dialog = await openRevoke(bob)
    fireEvent.click(within(dialog).getByRole('button', { name: t('admin.platformAdmins.confirmRevoke') }))

    expect(await within(dialog).findByTestId('platform-admins-last-admin')).toBeInTheDocument()
    expect(screen.queryByText(t('admin.platformAdmins.errRevoke'))).not.toBeInTheDocument()
    // The client's picture of who resolves was evidently stale — re-read it.
    await waitFor(() => expect(mocked.listPlatformAdmins).toHaveBeenCalledTimes(2))
  })

  it('reports a revoke 404 and re-reads the listing', async () => {
    mocked.revokePlatformAdmin.mockRejectedValue(httpError(404, 'that user is not a platform administrator'))
    renderPage()
    const dialog = await openRevoke(bob)
    fireEvent.click(within(dialog).getByRole('button', { name: t('admin.platformAdmins.confirmRevoke') }))

    expect(await screen.findByText(t('admin.platformAdmins.errRevokeGone'))).toBeInTheDocument()
    await waitFor(() => expect(mocked.listPlatformAdmins).toHaveBeenCalledTimes(2))
  })

  it('maps a revoke 503 to the unavailable message', async () => {
    mocked.revokePlatformAdmin.mockRejectedValue(httpError(503))
    renderPage()
    const dialog = await openRevoke(bob)
    fireEvent.click(within(dialog).getByRole('button', { name: t('admin.platformAdmins.confirmRevoke') }))

    expect(await screen.findByText(t('admin.platformAdmins.errUnavailable'))).toBeInTheDocument()
  })

  it('falls back to the server message on any other revoke failure', async () => {
    mocked.revokePlatformAdmin.mockRejectedValue(httpError(500, 'carrier exploded'))
    renderPage()
    const dialog = await openRevoke(bob)
    fireEvent.click(within(dialog).getByRole('button', { name: t('admin.platformAdmins.confirmRevoke') }))

    expect(await screen.findByText('carrier exploded')).toBeInTheDocument()
  })
})

describe('PlatformAdminsPage — self-revocation', () => {
  it('warns that the grant being removed is the operator own, and still allows it', async () => {
    mocked.revokePlatformAdmin.mockResolvedValue(undefined)
    renderPage()
    const dialog = await openRevoke(alice)

    expect(within(dialog).getByTestId('platform-admins-self-revoke')).toBeInTheDocument()
    expect(within(dialog).getByText(t('admin.platformAdmins.selfRevokeBody'))).toBeInTheDocument()
    fireEvent.click(
      within(dialog).getByRole('button', { name: t('admin.platformAdmins.confirmRevokeSelf') }),
    )
    await waitFor(() => expect(mocked.revokePlatformAdmin).toHaveBeenCalledWith(ALICE_ID))
  })

  it('does not warn when the grant belongs to somebody else', async () => {
    renderPage()
    const dialog = await openRevoke(bob)
    expect(within(dialog).queryByTestId('platform-admins-self-revoke')).not.toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: t('admin.platformAdmins.confirmRevoke') }),
    ).toBeInTheDocument()
  })
})

describe('PlatformAdminsPage — granting', () => {
  async function openGrant() {
    fireEvent.click(await screen.findByRole('button', { name: t('admin.platformAdmins.grantButton') }))
    return screen.findByRole('dialog')
  }

  it('excludes users who already hold a grant from the picker', async () => {
    renderPage()
    await screen.findByText('Alice')
    await openGrant()
    const input = screen.getByLabelText(new RegExp(`^${t('admin.platformAdmins.labelUser')}`))
    fireEvent.mouseDown(input)
    fireEvent.change(input, { target: { value: 'a' } })

    expect(await screen.findByRole('option', { name: /Carol/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Alice/ })).not.toBeInTheDocument()
  })

  it('grants with the note and names the picked user in the confirmation', async () => {
    mocked.grantPlatformAdmin.mockResolvedValue({
      user_id: CAROL_ID,
      granted_by: ALICE_ID,
      granted_at: '2026-06-03T09:00:00Z',
      note: 'incident 42',
    })
    renderPage()
    await screen.findByText('Alice')
    const dialog = await openGrant()

    const input = screen.getByLabelText(new RegExp(`^${t('admin.platformAdmins.labelUser')}`))
    fireEvent.change(input, { target: { value: 'Carol' } })
    fireEvent.click(await screen.findByRole('option', { name: /Carol/ }))
    fireEvent.change(within(dialog).getByLabelText(t('admin.platformAdmins.labelNote')), {
      target: { value: '  incident 42  ' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: t('admin.platformAdmins.confirmGrant') }))

    await waitFor(() =>
      expect(mocked.grantPlatformAdmin).toHaveBeenCalledWith({ user_id: CAROL_ID, note: 'incident 42' }),
    )
    // The 201 resolves no identity, so the message must come from the pick.
    expect(
      await screen.findByText(t('admin.platformAdmins.msgGranted', { subject: 'carol@example.com' })),
    ).toBeInTheDocument()
    await waitFor(() => expect(mocked.listPlatformAdmins).toHaveBeenCalledTimes(2))
  })

  it('omits an empty note rather than sending a blank one', async () => {
    mocked.grantPlatformAdmin.mockResolvedValue({
      user_id: CAROL_ID,
      granted_by: ALICE_ID,
      granted_at: '2026-06-03T09:00:00Z',
      note: null,
    })
    renderPage()
    await screen.findByText('Alice')
    const dialog = await openGrant()
    const input = screen.getByLabelText(new RegExp(`^${t('admin.platformAdmins.labelUser')}`))
    fireEvent.change(input, { target: { value: 'Carol' } })
    fireEvent.click(await screen.findByRole('option', { name: /Carol/ }))
    fireEvent.change(within(dialog).getByLabelText(t('admin.platformAdmins.labelNote')), {
      target: { value: '   ' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: t('admin.platformAdmins.confirmGrant') }))

    await waitFor(() => expect(mocked.grantPlatformAdmin).toHaveBeenCalledWith({ user_id: CAROL_ID }))
  })

  it('imposes its own note limit, because the server imposes none', async () => {
    renderPage()
    await screen.findByText('Alice')
    const dialog = await openGrant()
    const input = screen.getByLabelText(new RegExp(`^${t('admin.platformAdmins.labelUser')}`))
    fireEvent.change(input, { target: { value: 'Carol' } })
    fireEvent.click(await screen.findByRole('option', { name: /Carol/ }))

    const grant = within(dialog).getByRole('button', { name: t('admin.platformAdmins.confirmGrant') })
    expect(grant).toBeEnabled()

    fireEvent.change(within(dialog).getByLabelText(t('admin.platformAdmins.labelNote')), {
      target: { value: 'x'.repeat(501) },
    })
    expect(
      within(dialog).getByText(t('admin.platformAdmins.errNoteTooLong', { max: 500 })),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: t('admin.platformAdmins.confirmGrant') })).toBeDisabled()
    expect(mocked.grantPlatformAdmin).not.toHaveBeenCalled()
  })

  it('maps 400 to an unknown user, not a generic failure', async () => {
    mocked.grantPlatformAdmin.mockRejectedValue(httpError(400, 'no user with that id'))
    renderPage()
    await screen.findByText('Alice')
    const dialog = await openGrant()
    const input = screen.getByLabelText(new RegExp(`^${t('admin.platformAdmins.labelUser')}`))
    fireEvent.change(input, { target: { value: 'Carol' } })
    fireEvent.click(await screen.findByRole('option', { name: /Carol/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: t('admin.platformAdmins.confirmGrant') }))

    expect(await screen.findByText(t('admin.platformAdmins.errGrantUnknownUser'))).toBeInTheDocument()
  })

  it('maps 409 to already-holds and 503 to unavailable', async () => {
    mocked.grantPlatformAdmin.mockRejectedValue(httpError(409))
    renderPage()
    await screen.findByText('Alice')
    let dialog = await openGrant()
    let input = screen.getByLabelText(new RegExp(`^${t('admin.platformAdmins.labelUser')}`))
    fireEvent.change(input, { target: { value: 'Carol' } })
    fireEvent.click(await screen.findByRole('option', { name: /Carol/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: t('admin.platformAdmins.confirmGrant') }))
    expect(await screen.findByText(t('admin.platformAdmins.errGrantAlready'))).toBeInTheDocument()

    mocked.grantPlatformAdmin.mockRejectedValue(httpError(503))
    dialog = screen.getByRole('dialog')
    input = screen.getByLabelText(new RegExp(`^${t('admin.platformAdmins.labelUser')}`))
    fireEvent.change(input, { target: { value: 'Carol' } })
    fireEvent.click(await screen.findByRole('option', { name: /Carol/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: t('admin.platformAdmins.confirmGrant') }))
    expect(await screen.findByText(t('admin.platformAdmins.errUnavailable'))).toBeInTheDocument()
  })

  it('falls back to the server message on any other grant failure', async () => {
    mocked.grantPlatformAdmin.mockRejectedValue(httpError(418, 'teapot'))
    renderPage()
    await screen.findByText('Alice')
    const dialog = await openGrant()
    const input = screen.getByLabelText(new RegExp(`^${t('admin.platformAdmins.labelUser')}`))
    fireEvent.change(input, { target: { value: 'Carol' } })
    fireEvent.click(await screen.findByRole('option', { name: /Carol/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: t('admin.platformAdmins.confirmGrant') }))

    expect(await screen.findByText('teapot')).toBeInTheDocument()
  })

  it('passes the typed search to the server so a picker beyond one page still finds people', async () => {
    renderPage()
    await screen.findByText('Alice')
    await openGrant()
    await waitFor(() =>
      expect(mocked.listAdminUsers).toHaveBeenCalledWith({ page: 1, per_page: 100 }),
    )
    fireEvent.change(screen.getByLabelText(new RegExp(`^${t('admin.platformAdmins.labelUser')}`)), {
      target: { value: 'carol' },
    })
    await waitFor(() =>
      expect(mocked.listAdminUsers).toHaveBeenCalledWith({ page: 1, per_page: 100, q: 'carol' }),
    )
  })
})
