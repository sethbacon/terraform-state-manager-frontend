import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SSOPage from './SSOPage'
import { api } from '../../services/api'
import i18n from '../../i18n'

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>()
  return { ...actual, api: { getSSOConfig: vi.fn() } }
})

const mocked = vi.mocked(api)

const fullConfig = {
  oidc: {
    enabled: true,
    issuer_url: 'https://idp.example.com',
    group_claim_name: 'groups',
    default_role: 'viewer',
    group_mappings: [{ group: 'platform', organization: 'default', role: 'editor' }],
  },
  saml: {
    enabled: true,
    entity_id: 'urn:tsm',
    acs_url: 'https://tsm.example.com/api/v1/auth/saml/acs',
    allow_idp_initiated: false,
    group_attribute_name: 'memberOf',
    default_role: 'viewer',
    idps: ['okta', 'adfs'],
    group_mappings: [],
  },
  ldap: {
    enabled: false,
    host: '',
    use_tls: false,
    start_tls: false,
    base_dn: '',
    default_role: '',
    group_mappings: [],
  },
  mtls: {
    enabled: true,
    client_ca_file: '/etc/tsm/ca.pem',
    mappings: [{ subject: 'CN=ci-runner', scopes: ['state:read', 'state:drift'] }],
  },
  scim: { enabled: true },
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <SSOPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SSOPage', () => {
  it('shows a skeleton while loading', () => {
    mocked.getSSOConfig.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument()
  })

  it('renders every provider section with status, config, and mappings', async () => {
    mocked.getSSOConfig.mockResolvedValue(fullConfig as Awaited<ReturnType<typeof api.getSSOConfig>>)
    renderPage()

    expect(await screen.findByText('https://idp.example.com')).toBeInTheDocument()
    // OIDC group mapping row.
    expect(screen.getByText('platform')).toBeInTheDocument()
    expect(screen.getByText('editor')).toBeInTheDocument()
    // SAML details + IdP chips.
    expect(screen.getByText('urn:tsm')).toBeInTheDocument()
    expect(screen.getByText('okta')).toBeInTheDocument()
    expect(screen.getByText('adfs')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('common.no') as string)).toBeInTheDocument() // IdP-initiated off
    // mTLS subject + scope chips.
    expect(screen.getByText('CN=ci-runner')).toBeInTheDocument()
    expect(screen.getByText('state:drift')).toBeInTheDocument()
    // Disabled LDAP shows its chip; enabled sections show theirs.
    expect(screen.getAllByText(i18n.t('pages.sso.disabled') as string).length).toBeGreaterThan(0)
    expect(screen.getAllByText(i18n.t('pages.sso.enabled') as string).length).toBeGreaterThanOrEqual(3)
    // SCIM note rendered.
    expect(screen.getByText(i18n.t('pages.sso.scimNote') as string)).toBeInTheDocument()
  })

  it('shows the no-mappings note for providers without mappings', async () => {
    mocked.getSSOConfig.mockResolvedValue(fullConfig as Awaited<ReturnType<typeof api.getSSOConfig>>)
    renderPage()
    await screen.findByText('urn:tsm')
    // SAML + LDAP both have empty mapping lists.
    expect(screen.getAllByText(i18n.t('pages.sso.noMappings') as string).length).toBeGreaterThanOrEqual(2)
  })

  it('surfaces a load failure', async () => {
    mocked.getSSOConfig.mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByText(i18n.t('common.error') as string)).toBeInTheDocument()
  })
})
