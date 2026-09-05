import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LandingPage from './LandingPage'
import { useAuth } from '../contexts/AuthContext'
import { api, type DashboardOverview, type DriftSummary } from '../services/api'
import i18n from '../i18n'

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../services/api', () => ({ api: { getDashboardOverview: vi.fn(), getDriftSummary: vi.fn() } }))

const mockedUseAuth = vi.mocked(useAuth)
const mockedApi = vi.mocked(api)
type AuthShape = ReturnType<typeof useAuth>

function setAuth(isAuthenticated: boolean) {
  mockedUseAuth.mockReturnValue({ isAuthenticated } as unknown as AuthShape)
}

function renderLanding() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<div>login page</div>} />
          <Route path="/admin" element={<div>dashboard page</div>} />
          <Route path="/sources" element={<div>sources page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  // Keep the estate query pending by default so non-estate tests don't trigger
  // async state updates; the estate test overrides this with real data.
  mockedApi.getDashboardOverview.mockReturnValue(new Promise<DashboardOverview>(() => { }))
  mockedApi.getDriftSummary.mockReturnValue(new Promise<DriftSummary>(() => { }))
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

  it('shows the estate summary with live counts for authenticated users', async () => {
    mockedApi.getDashboardOverview.mockResolvedValue({
      sources: 3,
      states: 5,
      rum: 42,
      total_resources: 50,
    } as unknown as DashboardOverview)
    setAuth(true)
    renderLanding()
    expect(screen.getByText(i18n.t('landing.estateTitle') as string)).toBeInTheDocument()
    expect(await screen.findByText('3')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('hides the estate summary from anonymous visitors', () => {
    setAuth(false)
    renderLanding()
    expect(screen.queryByText(i18n.t('landing.estateTitle') as string)).not.toBeInTheDocument()
  })

  it('shows fleet drift cards, summed from the summary endpoint, for authenticated users', async () => {
    mockedApi.getDriftSummary.mockResolvedValue({
      records_by_source: [
        { source_id: 's1', source_name: 'a', open: 2, acknowledged: 1, critical: 1 },
        { source_id: 's2', source_name: 'b', open: 3, acknowledged: 0, critical: 0 },
      ],
      runs_24h: { completed: 10, failed: 1, dispatched: 2 },
      incomplete_records: 4,
      in_flight: 2,
    } as DriftSummary)
    setAuth(true)
    renderLanding()
    expect(screen.getByText(i18n.t('landing.driftTitle') as string)).toBeInTheDocument()
    expect(screen.getByText(i18n.t('landing.drift.openDrift') as string)).toBeInTheDocument()
    // Open drift summed across sources (2 + 3), critical summed (1 + 0).
    expect(await screen.findByText('5')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('hides the drift cards from anonymous visitors', () => {
    setAuth(false)
    renderLanding()
    expect(screen.queryByText(i18n.t('landing.driftTitle') as string)).not.toBeInTheDocument()
  })
})
