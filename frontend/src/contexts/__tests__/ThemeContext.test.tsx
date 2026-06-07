import { render, screen, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThemeProvider, useThemeMode } from '../ThemeContext'
import type { UIThemeConfig } from '../../types'

// Mock the API client so we control what GET /api/v1/ui/theme returns.
const getUiThemeMock = vi.fn<() => Promise<UIThemeConfig>>()
vi.mock('../../services/api', () => ({
  default: {
    getUiTheme: () => getUiThemeMock(),
  },
}))

const THEME_KEY = 'tsm_theme_mode'

// A consumer that surfaces the context values for assertions.
function ThemeConsumer() {
  const { mode, toggleTheme, productName, logoUrl, loginHeroUrl } = useThemeMode()
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="product-name">{productName}</span>
      <span data-testid="logo-url">{logoUrl ?? 'none'}</span>
      <span data-testid="hero-url">{loginHeroUrl ?? 'none'}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  )
}

function renderWithProviders() {
  // A fresh QueryClient per test avoids cross-test cache leakage.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

function mockMatchMedia(dark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? dark : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear()
    getUiThemeMock.mockReset()
    mockMatchMedia(false)
    document.title = ''
    // Ensure a favicon link exists so favicon-override assertions have a target.
    document.head.innerHTML = '<link rel="icon" href="/vite.svg" />'
  })

  // ---- Mode toggle behavior (carried over from the static context) ----

  it('throws when useThemeMode is used outside ThemeProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    function BadConsumer() {
      useThemeMode()
      return null
    }
    expect(() => render(<BadConsumer />)).toThrow(
      'useThemeMode must be used within a ThemeProvider',
    )
  })

  it('defaults to light mode when no preference is stored', () => {
    getUiThemeMock.mockResolvedValue({})
    renderWithProviders()
    expect(screen.getByTestId('mode').textContent).toBe('light')
  })

  it('respects system dark mode preference when no localStorage value', () => {
    mockMatchMedia(true)
    getUiThemeMock.mockResolvedValue({})
    renderWithProviders()
    expect(screen.getByTestId('mode').textContent).toBe('dark')
  })

  it('reads saved theme from localStorage', () => {
    localStorage.setItem(THEME_KEY, 'dark')
    getUiThemeMock.mockResolvedValue({})
    renderWithProviders()
    expect(screen.getByTestId('mode').textContent).toBe('dark')
  })

  it('toggleTheme switches mode and persists to localStorage', () => {
    getUiThemeMock.mockResolvedValue({})
    renderWithProviders()
    expect(screen.getByTestId('mode').textContent).toBe('light')

    act(() => {
      screen.getByText('Toggle').click()
    })

    expect(screen.getByTestId('mode').textContent).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  })

  // ---- White-label theme application ----

  it('applies the fetched product name to document.title and context', async () => {
    getUiThemeMock.mockResolvedValue({
      product_name: 'Acme State Manager',
      primary_color: '#112233',
    })
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('product-name').textContent).toBe('Acme State Manager')
    })
    expect(document.title).toBe('Acme State Manager')
  })

  it('applies the favicon override to the icon link', async () => {
    getUiThemeMock.mockResolvedValue({
      favicon_url: 'https://cdn.example.com/favicon.ico',
    })
    renderWithProviders()

    await waitFor(() => {
      const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
      expect(link?.href).toContain('https://cdn.example.com/favicon.ico')
    })
  })

  it('exposes logo and hero URLs from the fetched theme', async () => {
    getUiThemeMock.mockResolvedValue({
      logo_url: 'https://cdn.example.com/logo.svg',
      login_hero_url: 'https://cdn.example.com/hero.png',
    })
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('logo-url').textContent).toBe(
        'https://cdn.example.com/logo.svg',
      )
    })
    expect(screen.getByTestId('hero-url').textContent).toBe(
      'https://cdn.example.com/hero.png',
    )
  })

  // ---- Graceful fallback ----

  it('falls back to built-in defaults when the fetch fails', async () => {
    getUiThemeMock.mockRejectedValue(new Error('network down'))
    renderWithProviders()

    // Renders immediately with the built-in default product name; never blocks.
    expect(screen.getByTestId('product-name').textContent).toBe('Terraform State Manager')
    expect(document.title).toBe('Terraform State Manager')

    // Stays on defaults after the rejected query settles.
    await waitFor(() => {
      expect(getUiThemeMock).toHaveBeenCalled()
    })
    expect(screen.getByTestId('product-name').textContent).toBe('Terraform State Manager')
    expect(screen.getByTestId('logo-url').textContent).toBe('none')
    expect(screen.getByTestId('hero-url').textContent).toBe('none')
  })

  it('renders with built-in defaults before the fetch resolves', () => {
    // A never-resolving fetch must not block render.
    getUiThemeMock.mockReturnValue(new Promise<UIThemeConfig>(() => {}))
    renderWithProviders()

    expect(screen.getByTestId('product-name').textContent).toBe('Terraform State Manager')
    expect(screen.getByTestId('mode').textContent).toBe('light')
  })
})
