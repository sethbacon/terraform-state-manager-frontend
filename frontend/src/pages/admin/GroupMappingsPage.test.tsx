import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GroupMappingsPage from './GroupMappingsPage'
import { api } from '../../services/api'
import i18n from '../../i18n'

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>()
  return {
    ...actual,
    api: {
      getAdminOIDCConfig: vi.fn(),
      getIdentityGroupMappings: vi.fn(),
      listAdminOrganizations: vi.fn(),
      listAdminRoles: vi.fn(),
      updateOIDCGroupMapping: vi.fn(),
    },
  }
})

const mocked = vi.mocked(api)

const oidcConfig = {
  provider_type: 'oidc',
  issuer_url: 'https://idp.example.com',
  client_id: 'tsm',
  is_active: true,
  group_claim_name: 'groups',
  default_role: 'viewer',
  group_mappings: [{ group: 'platform', organization: 'default', role: 'editor' }],
}

const identityMappings = {
  saml: {
    group_attribute_name: 'memberOf',
    default_role: 'viewer',
    group_mappings: [{ group: 'saml-ops', organization: 'default', role: 'operator' }],
  },
  ldap: {
    default_role: 'viewer',
    group_mappings: [{ group_dn: 'cn=ops,dc=example', organization: 'default', role: 'operator' }],
  },
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <GroupMappingsPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocked.getAdminOIDCConfig.mockResolvedValue(oidcConfig as Awaited<ReturnType<typeof api.getAdminOIDCConfig>>)
  mocked.getIdentityGroupMappings.mockResolvedValue(identityMappings as Awaited<
    ReturnType<typeof api.getIdentityGroupMappings>
  >)
  mocked.listAdminOrganizations.mockResolvedValue([
    { id: 'o1', name: 'default', display_name: 'Default' },
    { id: 'o2', name: 'platform-org', display_name: 'Platform' },
  ] as Awaited<ReturnType<typeof api.listAdminOrganizations>>)
  mocked.listAdminRoles.mockResolvedValue([
    { id: 'r1', name: 'editor', display_name: 'Editor', description: '', scopes: [], is_system: true, created_at: '', updated_at: '' },
    { id: 'r2', name: 'viewer', display_name: 'Viewer', description: '', scopes: [], is_system: true, created_at: '', updated_at: '' },
  ] as Awaited<ReturnType<typeof api.listAdminRoles>>)
})

describe('GroupMappingsPage', () => {
  it('renders the OIDC overlay editor seeded from the server config', async () => {
    renderPage()
    expect(await screen.findByText('platform')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('admin.oidcSettings.active') as string)).toBeInTheDocument()
    expect(screen.getByLabelText(new RegExp(`^${i18n.t('admin.oidcSettings.labelGroupClaimName')}`))).toHaveValue('groups')
  })

  it('shows the read-only SAML and LDAP mapping sections', async () => {
    renderPage()
    expect(await screen.findByText('saml-ops')).toBeInTheDocument()
    expect(screen.getByText('cn=ops,dc=example')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('admin.oidcSettings.samlReadOnly') as string)).toBeInTheDocument()
  })

  it('adds a mapping through the dialog and saves the overlay', async () => {
    mocked.updateOIDCGroupMapping.mockResolvedValue({
      ...oidcConfig,
      group_mappings: [
        ...oidcConfig.group_mappings,
        { group: 'sre', organization: 'platform-org', role: 'operator' },
      ],
    } as Awaited<ReturnType<typeof api.updateOIDCGroupMapping>>)
    renderPage()
    await screen.findByText('platform')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('admin.oidcSettings.addMapping') as string }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${i18n.t('admin.oidcSettings.labelIdpGroup')}`)), {
      target: { value: 'sre' },
    })
    // Pick the role first; the autocomplete popup interferes with later
    // combobox queries if it still holds focus.
    // The role select offers the system role names directly.
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox').at(-1)!)
    fireEvent.click(await screen.findByRole('option', { name: 'operator' }))

    const orgBox = within(dialog).getByLabelText(new RegExp(`^${i18n.t('admin.oidcSettings.labelOrganization')}`))
    fireEvent.mouseDown(orgBox)
    fireEvent.change(orgBox, { target: { value: 'platform' } })
    fireEvent.click(await screen.findByRole('option', { name: /platform-org/ }))

    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('admin.oidcSettings.add') as string }))
    // The new row appears locally once the dialog closes; persist it.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('sre')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: i18n.t('admin.oidcSettings.saveChanges') as string }))
    await waitFor(() =>
      expect(mocked.updateOIDCGroupMapping).toHaveBeenCalledWith({
        group_claim_name: 'groups',
        default_role: 'viewer',
        group_mappings: expect.arrayContaining([
          expect.objectContaining({ group: 'sre', organization: 'platform-org', role: 'operator' }),
        ]),
      }),
    )
    expect(await screen.findByText(i18n.t('admin.oidcSettings.msgSaved') as string)).toBeInTheDocument()
  })

  it('edits an existing mapping in place', async () => {
    renderPage()
    await screen.findByText('platform')

    fireEvent.click(screen.getByLabelText(i18n.t('admin.oidcSettings.ariaEdit') as string))
    const dialog = await screen.findByRole('dialog')
    const groupField = within(dialog).getByLabelText(new RegExp(`^${i18n.t('admin.oidcSettings.labelIdpGroup')}`))
    expect(groupField).toHaveValue('platform')

    fireEvent.change(groupField, { target: { value: 'platform-eng' } })
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('admin.oidcSettings.update') as string }))
    expect(await screen.findByText('platform-eng')).toBeInTheDocument()
  })

  it('removes a mapping after confirmation', async () => {
    renderPage()
    await screen.findByText('platform')

    fireEvent.click(screen.getByLabelText(i18n.t('admin.oidcSettings.ariaDelete') as string))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('admin.oidcSettings.remove') as string }))
    await waitFor(() => expect(screen.queryByText('platform')).not.toBeInTheDocument())
  })

  it('surfaces a save failure', async () => {
    mocked.updateOIDCGroupMapping.mockRejectedValue(new Error('boom'))
    renderPage()
    await screen.findByText('platform')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('admin.oidcSettings.saveChanges') as string }))
    expect(await screen.findByText(i18n.t('admin.oidcSettings.errSave') as string)).toBeInTheDocument()
  })
})
