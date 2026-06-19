import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LandingPage from './LandingPage'
import { useAuth } from '../contexts/AuthContext'
import i18n from '../i18n'

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))

const mockedUseAuth = vi.mocked(useAuth)
type AuthShape = ReturnType<typeof useAuth>

function setAuth(isAuthenticated: boolean) {
  mockedUseAuth.mockReturnValue({ isAuthenticated } as unknown as AuthShape)
}

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/admin" element={<div>dashboard page</div>} />
        <Route path="/sources" element={<div>sources page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('LandingPage', () => {
  it('shows the hero, feature cards, and sign-in CTAs for anonymous visitors', () => {
    setAuth(false)
    renderLanding()

    expect(screen.getByText(i18n.t('landing.heroTitle') as string)).toBeInTheDocument()
    expect(screen.getByText(i18n.t('landing.features.sources.title') as string)).toBeInTheDocument()
    expect(screen.getByText(i18n.t('landing.features.transfer.title') as string)).toBeInTheDocument()
    // Sign-in links present; the dashboard CTA is not.
    expect(
      screen.getAllByRole('link', { name: new RegExp(i18n.t('landing.signIn') as string, 'i') }).length,
    ).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: i18n.t('landing.goToDashboard') as string })).not.toBeInTheDocument()
  })

  it('routes an anonymous feature CTA to sign in', () => {
    setAuth(false)
    renderLanding()
    fireEvent.click(screen.getAllByRole('button', { name: i18n.t('landing.signInToUse') as string })[0])
    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('offers a go-to-dashboard CTA and deep-links features for authenticated users', () => {
    setAuth(true)
    renderLanding()

    expect(
      screen.queryByRole('link', { name: new RegExp(i18n.t('landing.signIn') as string, 'i') }),
    ).not.toBeInTheDocument()

    // First feature card ("Sources") opens its page when authenticated.
    fireEvent.click(screen.getAllByRole('button', { name: i18n.t('landing.open') as string })[0])
    expect(screen.getByText('sources page')).toBeInTheDocument()
  })

  it('navigates to the dashboard from the hero CTA when authenticated', () => {
    setAuth(true)
    renderLanding()
    fireEvent.click(screen.getByRole('button', { name: i18n.t('landing.goToDashboard') as string }))
    expect(screen.getByText('dashboard page')).toBeInTheDocument()
  })
})
