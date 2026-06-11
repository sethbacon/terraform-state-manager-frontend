import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MTLSPage from './MTLSPage'
import { api } from '../../services/api'
import i18n from '../../i18n'

vi.mock('../../services/api', () => ({
  api: { getMTLSConfig: vi.fn() },
}))

const mocked = vi.mocked(api)

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MTLSPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MTLSPage', () => {
  it('renders the enabled state, CA file, and subject→scopes mappings', async () => {
    mocked.getMTLSConfig.mockResolvedValue({
      enabled: true,
      client_ca_file: '/etc/tsm/ca.pem',
      mappings: [{ subject: 'CN=ci-runner', scopes: ['state:read', 'state:drift'] }],
    })
    renderPage()

    expect(await screen.findByText(i18n.t('mtls.enabled') as string)).toBeInTheDocument()
    expect(screen.getByText('/etc/tsm/ca.pem')).toBeInTheDocument()
    expect(screen.getByText('CN=ci-runner')).toBeInTheDocument()
    expect(screen.getByText('state:read')).toBeInTheDocument()
    expect(screen.getByText('state:drift')).toBeInTheDocument()
  })

  it('shows the disabled chip and empty-mapping note', async () => {
    mocked.getMTLSConfig.mockResolvedValue({ enabled: false, client_ca_file: '', mappings: [] })
    renderPage()

    expect(await screen.findByText(i18n.t('mtls.disabled') as string)).toBeInTheDocument()
    expect(screen.getByText(i18n.t('mtls.noMappings') as string)).toBeInTheDocument()
  })

  it('surfaces a load error', async () => {
    mocked.getMTLSConfig.mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByText(i18n.t('mtls.errLoad') as string)).toBeInTheDocument()
  })
})
