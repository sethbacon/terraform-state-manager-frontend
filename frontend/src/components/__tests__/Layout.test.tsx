import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within, waitForElementToBeRemoved } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Layout from '../Layout'

const mockUseAuth = vi.fn()
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../../contexts/ThemeContext', () => ({
  useThemeMode: () => ({ mode: 'light', toggleTheme: vi.fn(), productName: 'TSM' }),
}))

vi.mock('../../contexts/HelpContext', () => ({
  useHelp: () => ({ helpOpen: false, openHelp: vi.fn() }),
}))

vi.mock('../../hooks/useHotkey', () => ({
  useHotkey: vi.fn(),
}))

// Heavy children pull in their own contexts/state; stub them so the test stays
// focused on the nav drawer.
vi.mock('../DevUserSwitcher', () => ({ default: () => null }))
vi.mock('../HelpPanel', () => ({ default: () => null, HELP_PANEL_WIDTH: 0 }))
vi.mock('../AboutModal', () => ({ default: () => null }))
vi.mock('../CommandPalette', () => ({ default: () => null }))

function setAuth(overrides: { isAuthenticated?: boolean; scopes?: string[] } = {}) {
  const { isAuthenticated = true, scopes = ['admin'] } = overrides
  mockUseAuth.mockReturnValue({
    user: { email: 'test@example.com' },
    isAuthenticated,
    logout: vi.fn(),
    hasScope: (scope: string) => scopes.includes('admin') || scopes.includes(scope),
  })
}

function renderLayout() {
  return render(
    <MemoryRouter>
      <Layout />
    </MemoryRouter>,
  )
}

describe('Layout nav sections', () => {
  beforeEach(() => {
    localStorage.clear()
    setAuth()
  })

  it('renders feature sections expanded by default with their items visible', () => {
    renderLayout()
    // Section headers
    expect(screen.getByText('State Management')).toBeInTheDocument()
    expect(screen.getByText('Observability')).toBeInTheDocument()
    expect(screen.getByText('Configuration')).toBeInTheDocument()
    // Items inside the (default-open) sections
    expect(screen.getByText('Backups')).toBeInTheDocument()
    expect(screen.getByText('Drift')).toBeInTheDocument()
    expect(screen.getByText('Version Drift')).toBeInTheDocument()
  })

  it('collapses a feature section when its header is clicked', async () => {
    renderLayout()
    expect(screen.getByText('Backups')).toBeInTheDocument()
    fireEvent.click(screen.getByText('State Management'))
    // Collapse transition unmounts the items.
    await waitForElementToBeRemoved(() => screen.queryByText('Backups'))
    // Header itself remains so the section can be re-expanded.
    expect(screen.getByText('State Management')).toBeInTheDocument()
  })

  it('persists collapsed feature-section state to localStorage', () => {
    renderLayout()
    fireEvent.click(screen.getByText('Observability'))
    const stored = JSON.parse(localStorage.getItem('tsmNavSections') ?? '{}')
    expect(stored.observability).toBe(false)
  })

  it('restores collapsed state from localStorage on mount', () => {
    localStorage.setItem('tsmNavSections', JSON.stringify({ configuration: false }))
    renderLayout()
    // Configuration section is collapsed → its item is hidden.
    expect(screen.getByText('Configuration')).toBeInTheDocument()
    expect(screen.queryByText('State Sources')).not.toBeInTheDocument()
    // Other sections still default open.
    expect(screen.getByText('Backups')).toBeInTheDocument()
  })

  it('keeps the admin Identity/System groups collapsible', async () => {
    renderLayout()
    expect(screen.getByText('Users')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Identity'))
    await waitForElementToBeRemoved(() => screen.queryByText('Users'))
    expect(screen.getByText('Identity')).toBeInTheDocument()
  })

  it('drops sections whose items are all hidden by scope', () => {
    // Only a backups:read scope → State Management keeps Backups, but
    // Observability/Configuration items requiring other scopes are dropped.
    setAuth({ scopes: ['backups:read'] })
    renderLayout()
    expect(screen.getByText('State Management')).toBeInTheDocument()
    expect(screen.getByText('Backups')).toBeInTheDocument()
    expect(screen.queryByText('Migrations')).not.toBeInTheDocument()
    expect(screen.queryByText('Configuration')).not.toBeInTheDocument()
  })

  it('toggling only affects the clicked section', async () => {
    renderLayout()
    fireEvent.click(screen.getByText('State Management'))
    await waitForElementToBeRemoved(() => screen.queryByText('Backups'))
    // Observability untouched.
    const drift = screen.getByText('Drift')
    expect(within(drift.closest('a') as HTMLElement).getByText('Drift')).toBeInTheDocument()
  })
})
