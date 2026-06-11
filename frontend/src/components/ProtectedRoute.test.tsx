import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import { useAuth } from '../contexts/AuthContext'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

function renderGuarded(requiredScope?: string) {
  return render(
    <MemoryRouter initialEntries={['/secret']}>
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route
          path="/secret"
          element={
            <ProtectedRoute requiredScope={requiredScope}>
              <div>secret content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

type AuthShape = ReturnType<typeof useAuth>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProtectedRoute', () => {
  it('shows a spinner while the session resolves', () => {
    mockedUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true, hasScope: () => false } as unknown as AuthShape)
    renderGuarded()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.queryByText('secret content')).not.toBeInTheDocument()
  })

  it('redirects anonymous users to /login', () => {
    mockedUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false, hasScope: () => false } as unknown as AuthShape)
    renderGuarded()
    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('renders children for an authenticated user', () => {
    mockedUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, hasScope: () => true } as unknown as AuthShape)
    renderGuarded()
    expect(screen.getByText('secret content')).toBeInTheDocument()
  })

  it('blocks users missing the required scope with an explanation', () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      hasScope: (s: string) => s !== 'admin',
    } as unknown as AuthShape)
    renderGuarded('admin')
    expect(screen.queryByText('secret content')).not.toBeInTheDocument()
    // The insufficient-permissions explanation includes the missing scope.
    expect(screen.getByText(/admin/)).toBeInTheDocument()
  })

  it('allows users who hold the required scope', () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      hasScope: (s: string) => s === 'state:read',
    } as unknown as AuthShape)
    renderGuarded('state:read')
    expect(screen.getByText('secret content')).toBeInTheDocument()
  })
})
