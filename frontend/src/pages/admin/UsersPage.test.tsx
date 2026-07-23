import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import UsersPage from './UsersPage'
import { api } from '../../services/api'
import i18n from '../../i18n'

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>()
  return {
    ...actual,
    api: {
      listAdminUsers: vi.fn(),
      listAdminOrganizations: vi.fn(),
      listAdminRoles: vi.fn(),
      createAdminUser: vi.fn(),
      updateAdminUser: vi.fn(),
      deleteAdminUser: vi.fn(),
      eraseAdminUser: vi.fn(),
      exportAdminUserData: vi.fn(),
      getAdminUserMemberships: vi.fn(),
      addAdminOrgMember: vi.fn(),
      updateAdminOrgMember: vi.fn(),
      removeAdminOrgMember: vi.fn(),
    },
  }
})

const mocked = vi.mocked(api)

const alice = {
  id: 'u1',
  email: 'alice@example.com',
  name: 'Alice',
  created_at: '2026-06-01T00:00:00Z',
  memberships: [
    {
      organization_id: 'o1',
      organization_name: 'default',
      role_template_id: 'r1',
      role_template_name: 'editor',
      role_template_display_name: 'Editor',
      role_template_scopes: ['state:read', 'state:write'],
      created_at: '2026-06-01T00:00:00Z',
    },
  ],
}

const orgs = [
  { id: 'o1', name: 'default', display_name: 'Default' },
  { id: 'o2', name: 'platform', display_name: 'Platform' },
]
const roles = [
  { id: 'r1', name: 'editor', display_name: 'Editor', description: '', scopes: ['state:write'], is_system: true },
  { id: 'r2', name: 'viewer', display_name: 'Viewer', description: '', scopes: ['state:read'], is_system: true },
]

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <UsersPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocked.listAdminUsers.mockResolvedValue({ users: [alice], total: 1 } as Awaited<ReturnType<typeof api.listAdminUsers>>)
  mocked.listAdminOrganizations.mockResolvedValue(orgs as Awaited<ReturnType<typeof api.listAdminOrganizations>>)
  mocked.listAdminRoles.mockResolvedValue(roles as Awaited<ReturnType<typeof api.listAdminRoles>>)
})

describe('UsersPage', () => {
  it('lists users with their org/role membership chips', async () => {
    renderPage()
    expect(await screen.findByText('alice@example.com')).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('admin.users.chipMembership', { org: 'default', role: 'Editor' }) as string),
    ).toBeInTheDocument()
  })

  it('shows the empty state when there are no users', async () => {
    mocked.listAdminUsers.mockResolvedValue({ users: [], total: 0 } as Awaited<ReturnType<typeof api.listAdminUsers>>)
    renderPage()
    expect(await screen.findByTestId('users-empty-state')).toBeInTheDocument()
  })

  it('searches by text (server-side q param)', async () => {
    renderPage()
    await screen.findByText('alice@example.com')

    fireEvent.change(screen.getByPlaceholderText(i18n.t('admin.users.searchPlaceholder') as string), {
      target: { value: 'bob' },
    })
    await waitFor(() =>
      expect(mocked.listAdminUsers).toHaveBeenCalledWith(expect.objectContaining({ q: 'bob' })),
    )
  })

  it('creates a user and assigns the optional org membership', async () => {
    mocked.createAdminUser.mockResolvedValue({ ...alice, id: 'u9', email: 'bob@example.com' } as Awaited<
      ReturnType<typeof api.createAdminUser>
    >)
    mocked.addAdminOrgMember.mockResolvedValue(undefined)
    renderPage()
    await screen.findByText('alice@example.com')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('admin.users.addUser') as string }))
    fireEvent.change(await screen.findByLabelText(new RegExp(`^${i18n.t('admin.users.labelEmail')}`)), {
      target: { value: 'bob@example.com' },
    })
    fireEvent.change(screen.getByLabelText(new RegExp(`^${i18n.t('admin.users.labelName')}`)), {
      target: { value: 'Bob' },
    })
    // The org/role selects use bare InputLabels (no programmatic association),
    // so address them positionally inside the dialog.
    const dialog = screen.getByRole('dialog')
    const combos = within(dialog).getAllByRole('combobox')
    fireEvent.mouseDown(combos[0]) // organization
    fireEvent.click(await screen.findByRole('option', { name: /Platform/ }))
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[1]) // role template
    fireEvent.click(await screen.findByRole('option', { name: /Viewer/ }))

    fireEvent.click(screen.getByRole('button', { name: i18n.t('admin.users.create') as string }))
    await waitFor(() =>
      expect(mocked.createAdminUser).toHaveBeenCalledWith({ email: 'bob@example.com', name: 'Bob' }),
    )
    await waitFor(() =>
      expect(mocked.addAdminOrgMember).toHaveBeenCalledWith('o2', { user_id: 'u9', role_template_id: 'r2' }),
    )
  })

  it('edits a user (email locked) and manages memberships inline', async () => {
    mocked.updateAdminUser.mockResolvedValue(alice as Awaited<ReturnType<typeof api.updateAdminUser>>)
    mocked.updateAdminOrgMember.mockResolvedValue(undefined)
    mocked.removeAdminOrgMember.mockResolvedValue(undefined)
    mocked.getAdminUserMemberships.mockResolvedValue(alice.memberships as Awaited<
      ReturnType<typeof api.getAdminUserMemberships>
    >)
    renderPage()
    await screen.findByText('alice@example.com')

    fireEvent.click(screen.getByLabelText(i18n.t('admin.users.ariaEdit') as string))
    const email = await screen.findByLabelText(new RegExp(`^${i18n.t('admin.users.labelEmail')}`))
    expect(email).toBeDisabled()

    // Change the existing membership's role inline.
    const dialog = screen.getByRole('dialog')
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[0])
    fireEvent.click(await screen.findByRole('option', { name: /Viewer/ }))
    await waitFor(() =>
      expect(mocked.updateAdminOrgMember).toHaveBeenCalledWith('o1', 'u1', { role_template_id: 'r2' }),
    )

    // Remove the membership.
    fireEvent.click(within(dialog).getByLabelText(i18n.t('admin.users.ariaRemoveFromOrg') as string))
    await waitFor(() => expect(mocked.removeAdminOrgMember).toHaveBeenCalledWith('o1', 'u1'))

    // Rename and save.
    fireEvent.change(screen.getByLabelText(new RegExp(`^${i18n.t('admin.users.labelName')}`)), {
      target: { value: 'Alice A.' },
    })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('admin.users.save') as string }))
    await waitFor(() => expect(mocked.updateAdminUser).toHaveBeenCalledWith('u1', { name: 'Alice A.' }))
  })

  it('deletes a user after the confirm dialog', async () => {
    mocked.deleteAdminUser.mockResolvedValue(undefined)
    renderPage()
    await screen.findByText('alice@example.com')

    fireEvent.click(screen.getByLabelText(i18n.t('admin.users.ariaDelete') as string))
    // Deleting a user is now type-to-confirm (cascades through memberships).
    const confirm = await screen.findByTestId('confirm-dialog-confirm')
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByTestId('confirm-dialog-type-input'), { target: { value: 'Alice' } })
    fireEvent.click(confirm)
    await waitFor(() => expect(mocked.deleteAdminUser.mock.calls[0]?.[0]).toBe('u1'))
  })

  it('GDPR-erases only after the exact email is typed', async () => {
    mocked.eraseAdminUser.mockResolvedValue({ message: 'erased' })
    renderPage()
    await screen.findByText('alice@example.com')

    fireEvent.click(screen.getByLabelText(i18n.t('admin.users.ariaErase') as string))
    const dialog = await screen.findByRole('dialog')
    const eraseBtn = within(dialog)
      .getAllByRole('button')
      .find((b) => (b as HTMLButtonElement).className.includes('containedError') || b.textContent !== i18n.t('common.cancel'))!

    // Guard: button disabled until the email matches.
    const input = within(dialog).getByPlaceholderText('alice@example.com')
    fireEvent.change(input, { target: { value: 'wrong@example.com' } })
    expect(
      within(dialog)
        .getAllByRole('button')
        .some((b) => (b as HTMLButtonElement).disabled),
    ).toBe(true)

    fireEvent.change(input, { target: { value: 'alice@example.com' } })
    fireEvent.click(eraseBtn)
    // Find the now-enabled destructive button and click it.
    const buttons = within(dialog).getAllByRole('button')
    for (const b of buttons) {
      if (!(b as HTMLButtonElement).disabled && b.textContent && b.textContent !== (i18n.t('common.cancel') as string)) {
        fireEvent.click(b)
      }
    }
    await waitFor(() => expect(mocked.eraseAdminUser.mock.calls[0]?.[0]).toBe('u1'))
    expect(await screen.findByText('erased')).toBeInTheDocument()
  })

  it('exports user data as a download', async () => {
    const createObjectURL = vi.fn(() => 'blob:user')
    const revokeObjectURL = vi.fn()
    // Subclass URL so it stays constructable: link.click() triggers happy-dom
    // navigation that calls `new URL` on a microtask, which a plain object stub
    // can't satisfy (leaks an unhandled TypeError under --coverage).
    vi.stubGlobal('URL', Object.assign(class extends URL { }, { createObjectURL, revokeObjectURL }))
    mocked.exportAdminUserData.mockResolvedValue({ blob: new Blob(['{}']), filename: 'user-data-u1.json' })

    renderPage()
    await screen.findByText('alice@example.com')
    fireEvent.click(screen.getByLabelText(i18n.t('admin.users.ariaExport') as string))

    await waitFor(() => expect(mocked.exportAdminUserData.mock.calls[0]?.[0]).toBe('u1'))
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled())
    expect(
      await screen.findByText(i18n.t('admin.users.exportedData', { email: 'alice@example.com' }) as string),
    ).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('surfaces a save failure', async () => {
    mocked.createAdminUser.mockRejectedValue(new Error('dup'))
    renderPage()
    await screen.findByText('alice@example.com')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('admin.users.addUser') as string }))
    fireEvent.change(await screen.findByLabelText(new RegExp(`^${i18n.t('admin.users.labelEmail')}`)), {
      target: { value: 'dup@example.com' },
    })
    fireEvent.change(screen.getByLabelText(new RegExp(`^${i18n.t('admin.users.labelName')}`)), {
      target: { value: 'Dup' },
    })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('admin.users.create') as string }))
    expect(await screen.findByText(i18n.t('admin.users.errSave') as string)).toBeInTheDocument()
  })
})
