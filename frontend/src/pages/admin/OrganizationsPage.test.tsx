import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OrganizationsPage from './OrganizationsPage'
import { api } from '../../services/api'
import i18n from '../../i18n'

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>()
  return {
    ...actual,
    api: {
      listAdminOrganizations: vi.fn(),
      listAdminRoles: vi.fn(),
      listAdminUsers: vi.fn(),
      createAdminOrganization: vi.fn(),
      updateAdminOrganization: vi.fn(),
      deleteAdminOrganization: vi.fn(),
      listAdminOrgMembers: vi.fn(),
      addAdminOrgMember: vi.fn(),
      updateAdminOrgMember: vi.fn(),
      removeAdminOrgMember: vi.fn(),
    },
  }
})

const mocked = vi.mocked(api)

const orgs = [
  {
    id: 'o1',
    name: 'default',
    display_name: 'Default',
    idp_type: 'oidc',
    idp_name: 'keycloak',
    member_count: 2,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 'o2',
    name: 'guests',
    display_name: 'Guests',
    idp_type: null,
    idp_name: null,
    member_count: 0,
    created_at: '2026-06-02T00:00:00Z',
    updated_at: '2026-06-02T00:00:00Z',
  },
]

const roles = [
  { id: 'r1', name: 'editor', display_name: 'Editor', description: '', scopes: [], is_system: true, created_at: '', updated_at: '' },
  { id: 'r2', name: 'viewer', display_name: 'Viewer', description: '', scopes: [], is_system: true, created_at: '', updated_at: '' },
]

const members = [
  {
    organization_id: 'o1',
    user_id: 'u1',
    role_template_id: 'r1',
    user_name: 'Alice',
    user_email: 'alice@example.com',
    role_template_scopes: [],
    created_at: '2026-06-01T00:00:00Z',
  },
]

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <OrganizationsPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocked.listAdminOrganizations.mockResolvedValue(orgs as Awaited<ReturnType<typeof api.listAdminOrganizations>>)
  mocked.listAdminRoles.mockResolvedValue(roles as Awaited<ReturnType<typeof api.listAdminRoles>>)
})

describe('OrganizationsPage', () => {
  it('lists organizations with their IdP binding', async () => {
    renderPage()
    expect(await screen.findByText('default')).toBeInTheDocument()
    expect(screen.getByText(/OIDC: keycloak/)).toBeInTheDocument()
    expect(screen.getByText(i18n.t('admin.organizations.idpAny') as string)).toBeInTheDocument()
  })

  it('shows the empty state with a create shortcut', async () => {
    mocked.listAdminOrganizations.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(i18n.t('admin.organizations.emptyState') as string)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: i18n.t('admin.organizations.createFirst') as string })).toBeInTheDocument()
  })

  it('creates an organization', async () => {
    mocked.createAdminOrganization.mockResolvedValue(orgs[1] as Awaited<ReturnType<typeof api.createAdminOrganization>>)
    renderPage()
    await screen.findByText('default')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('admin.organizations.addOrganization') as string }))
    fireEvent.change(await screen.findByLabelText(new RegExp(`^${i18n.t('admin.organizations.labelName')}`)), {
      target: { value: 'engineering' },
    })
    fireEvent.change(screen.getByLabelText(new RegExp(`^${i18n.t('admin.organizations.labelDisplayName')}`)), {
      target: { value: 'Engineering' },
    })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('admin.organizations.create') as string }))
    await waitFor(() =>
      expect(mocked.createAdminOrganization).toHaveBeenCalledWith({ name: 'engineering', display_name: 'Engineering' }),
    )
  })

  it('rejects an invalid organization name client-side', async () => {
    renderPage()
    await screen.findByText('default')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('admin.organizations.addOrganization') as string }))
    fireEvent.change(await screen.findByLabelText(new RegExp(`^${i18n.t('admin.organizations.labelName')}`)), {
      target: { value: 'Bad Name!' },
    })
    fireEvent.change(screen.getByLabelText(new RegExp(`^${i18n.t('admin.organizations.labelDisplayName')}`)), {
      target: { value: 'Bad' },
    })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('admin.organizations.create') as string }))
    expect(await screen.findByText(i18n.t('admin.organizations.errName') as string)).toBeInTheDocument()
    expect(mocked.createAdminOrganization).not.toHaveBeenCalled()
  })

  it('edits an organization with a rename warning and IdP binding', async () => {
    mocked.updateAdminOrganization.mockResolvedValue(orgs[0] as Awaited<ReturnType<typeof api.updateAdminOrganization>>)
    renderPage()
    await screen.findByText('default')

    fireEvent.click(screen.getAllByLabelText(i18n.t('admin.organizations.ariaEditOrg') as string)[0])
    const nameField = await screen.findByLabelText(new RegExp(`^${i18n.t('admin.organizations.labelName')}`))
    expect(nameField).toHaveValue('default')

    fireEvent.change(nameField, { target: { value: 'renamed' } })
    expect(await screen.findByText(new RegExp(i18n.t('admin.organizations.renameWarnPart1') as string))).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: i18n.t('admin.organizations.save') as string }))
    await waitFor(() =>
      expect(mocked.updateAdminOrganization).toHaveBeenCalledWith('o1', expect.objectContaining({ name: 'renamed' })),
    )
  })

  it('deletes after confirmation', async () => {
    mocked.deleteAdminOrganization.mockResolvedValue(undefined)
    renderPage()
    await screen.findByText('default')

    fireEvent.click(screen.getAllByLabelText(i18n.t('admin.organizations.ariaDeleteOrg') as string)[0])
    fireEvent.click(await screen.findByRole('button', { name: i18n.t('admin.organizations.delete') as string }))
    await waitFor(() => expect(mocked.deleteAdminOrganization.mock.calls[0]?.[0]).toBe('o1'))
  })

  it('manages members: list, change role, remove, and add', async () => {
    mocked.listAdminOrgMembers.mockResolvedValue(members as Awaited<ReturnType<typeof api.listAdminOrgMembers>>)
    mocked.listAdminUsers.mockResolvedValue({
      users: [
        { id: 'u1', email: 'alice@example.com', name: 'Alice' },
        { id: 'u2', email: 'bob@example.com', name: 'Bob' },
      ],
      total: 2,
    } as Awaited<ReturnType<typeof api.listAdminUsers>>)
    mocked.updateAdminOrgMember.mockResolvedValue(undefined)
    mocked.removeAdminOrgMember.mockResolvedValue(undefined)
    mocked.addAdminOrgMember.mockResolvedValue(undefined)
    renderPage()
    await screen.findByText('default')

    fireEvent.click(screen.getAllByRole('button', { name: new RegExp(i18n.t('admin.organizations.viewMembers') as string) })[0])
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('alice@example.com')).toBeInTheDocument()

    // Inline role change: grab the row's select before opening it (the open
    // menu marks the dialog aria-hidden, hiding the combobox from queries).
    const roleSelect = within(dialog).getAllByRole('combobox')[0]
    fireEvent.mouseDown(roleSelect)
    const listbox = await screen.findByRole('listbox')
    fireEvent.click(within(listbox).getByText('Viewer'))
    await waitFor(() =>
      expect(mocked.updateAdminOrgMember).toHaveBeenCalledWith('o1', 'u1', { role_template_id: 'r2' }),
    )

    // Remove member.
    fireEvent.click(within(dialog).getByLabelText(i18n.t('admin.organizations.ariaRemoveMember') as string))
    await waitFor(() => expect(mocked.removeAdminOrgMember).toHaveBeenCalledWith('o1', 'u1'))

    // Add member via the user picker.
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('admin.organizations.addMember') as string }))
    const userBox = await screen.findByLabelText(new RegExp(`^${i18n.t('admin.organizations.labelSelectUser')}`))
    fireEvent.mouseDown(userBox)
    fireEvent.change(userBox, { target: { value: 'bob' } })
    fireEvent.click(await screen.findByRole('option', { name: /bob@example.com/ }))

    const addDialog = userBox.closest('[role="dialog"]') as HTMLElement
    fireEvent.click(within(addDialog).getByRole('button', { name: i18n.t('admin.organizations.addMember') as string }))
    await waitFor(() =>
      expect(mocked.addAdminOrgMember).toHaveBeenCalledWith('o1', expect.objectContaining({ user_id: 'u2' })),
    )
  })

  it('surfaces a save failure', async () => {
    mocked.createAdminOrganization.mockRejectedValue(new Error('dup'))
    renderPage()
    await screen.findByText('default')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('admin.organizations.addOrganization') as string }))
    fireEvent.change(await screen.findByLabelText(new RegExp(`^${i18n.t('admin.organizations.labelName')}`)), {
      target: { value: 'dup' },
    })
    fireEvent.change(screen.getByLabelText(new RegExp(`^${i18n.t('admin.organizations.labelDisplayName')}`)), {
      target: { value: 'Dup' },
    })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('admin.organizations.create') as string }))
    expect(await screen.findByText(i18n.t('admin.organizations.errSave') as string)).toBeInTheDocument()
  })
})
