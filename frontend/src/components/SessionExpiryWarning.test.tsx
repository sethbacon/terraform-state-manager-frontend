import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import SessionExpiryWarning from './SessionExpiryWarning'
import { useAuth } from '../contexts/AuthContext'

vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../contexts/AuthContext')>()
  return { ...actual, useAuth: vi.fn() }
})

const mockedUseAuth = vi.mocked(useAuth)
type AuthShape = ReturnType<typeof useAuth>

function authState(overrides: Record<string, unknown>) {
  return {
    isAuthenticated: true,
    sessionExpiresSoon: true,
    refreshSession: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    ...overrides,
  } as unknown as AuthShape
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SessionExpiryWarning', () => {
  it('renders nothing when the session is not near expiry', () => {
    mockedUseAuth.mockReturnValue(authState({ sessionExpiresSoon: false }))
    render(<SessionExpiryWarning />)
    expect(screen.queryByTestId('session-expiry-warning')).not.toBeInTheDocument()
  })

  it('renders nothing for anonymous users', () => {
    mockedUseAuth.mockReturnValue(authState({ isAuthenticated: false }))
    render(<SessionExpiryWarning />)
    expect(screen.queryByTestId('session-expiry-warning')).not.toBeInTheDocument()
  })

  it('shows the warning with refresh and sign-out actions', () => {
    mockedUseAuth.mockReturnValue(authState({}))
    render(<SessionExpiryWarning />)
    expect(screen.getByTestId('session-expiry-warning')).toBeInTheDocument()
  })

  it('refresh button rotates the session', async () => {
    const state = authState({})
    mockedUseAuth.mockReturnValue(state)
    render(<SessionExpiryWarning />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    await waitFor(() =>
      expect((state as unknown as { refreshSession: ReturnType<typeof vi.fn> }).refreshSession).toHaveBeenCalled(),
    )
  })

  it('sign-out button logs out', () => {
    const state = authState({})
    mockedUseAuth.mockReturnValue(state)
    render(<SessionExpiryWarning />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[1])
    expect((state as unknown as { logout: ReturnType<typeof vi.fn> }).logout).toHaveBeenCalled()
  })
})
