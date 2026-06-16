import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SetupWizardPage from './SetupWizardPage'
import { setupApi, type SetupStatus } from '../services/setupApi'

vi.mock('../services/setupApi', () => ({
  setupApi: {
    getStatus: vi.fn(),
    validateToken: vi.fn(),
    configureOwner: vi.fn(),
    testOIDC: vi.fn(),
    saveOIDC: vi.fn(),
    testSource: vi.fn(),
    saveSource: vi.fn(),
    complete: vi.fn(),
  },
}))

const mocked = vi.mocked(setupApi)

const baseStatus = (over: Partial<SetupStatus> = {}): SetupStatus => ({
  setup_required: true,
  setup_completed: false,
  pending_feature_setup: false,
  auth_method: '',
  admin_configured: false,
  oidc_configured: false,
  ldap_configured: false,
  sources_configured: false,
  identity_owned_externally: false,
  ...over,
})

function renderWizard() {
  return render(
    <MemoryRouter initialEntries={['/setup']}>
      <SetupWizardPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocked.getStatus.mockResolvedValue(baseStatus())
  mocked.validateToken.mockResolvedValue({ valid: true })
  mocked.configureOwner.mockResolvedValue(undefined)
  mocked.saveOIDC.mockResolvedValue(undefined)
  mocked.saveSource.mockResolvedValue(undefined)
  mocked.complete.mockResolvedValue(undefined)
})

describe('SetupWizardPage', () => {
  it('drives the standalone flow end-to-end and completes', async () => {
    renderWizard()

    // Authenticate
    fireEvent.change(await screen.findByLabelText('Setup token'), {
      target: { value: 'tsm_setup_abc' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    // Owner
    fireEvent.change(await screen.findByLabelText('Owner email'), {
      target: { value: 'owner@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create owner' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // OIDC
    fireEvent.change(await screen.findByLabelText('Issuer URL'), {
      target: { value: 'https://idp.example.com' },
    })
    fireEvent.change(screen.getByLabelText('Client ID'), { target: { value: 'cid' } })
    fireEvent.change(screen.getByLabelText('Client secret'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Sources (type defaults to local)
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'prod-backend' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add source' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Review + complete
    fireEvent.click(await screen.findByRole('button', { name: 'Complete setup' }))
    await waitFor(() => expect(mocked.complete).toHaveBeenCalledWith('tsm_setup_abc'))
    expect(mocked.configureOwner).toHaveBeenCalledWith('tsm_setup_abc', 'owner@example.com')
    expect(mocked.saveSource).toHaveBeenCalled()
  })

  it('hides the owner and OIDC steps in coupled mode', async () => {
    mocked.getStatus.mockResolvedValue(baseStatus({ identity_owned_externally: true }))
    renderWizard()

    fireEvent.change(await screen.findByLabelText('Setup token'), { target: { value: 't' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    // Validation jumps straight to the source step; identity steps are absent.
    expect(await screen.findByText('First state source')).toBeInTheDocument()
    expect(screen.queryByText('Owner')).toBeNull()
    expect(screen.queryByText('Identity provider (OIDC)')).toBeNull()
  })

  it('renders nothing once setup is already complete', async () => {
    mocked.getStatus.mockResolvedValue(baseStatus({ setup_completed: true }))
    renderWizard()
    await waitFor(() => expect(mocked.getStatus).toHaveBeenCalled())
    await waitFor(() =>
      expect(screen.queryByText('Terraform State Manager setup')).not.toBeInTheDocument(),
    )
  })

  it('surfaces an error when the token is rejected', async () => {
    mocked.validateToken.mockRejectedValue({ response: { data: { error: 'Invalid setup token' } } })
    renderWizard()
    fireEvent.change(await screen.findByLabelText('Setup token'), { target: { value: 'bad' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Invalid setup token')).toBeInTheDocument()
  })
})
