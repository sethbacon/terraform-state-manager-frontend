import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material'
import { createAppTheme, type ThemeMode } from '../theme'
import { api, type UIThemeConfig } from '../services/api'
import i18n from '../i18n'

type Direction = 'ltr' | 'rtl'

interface ThemeContextValue {
  mode: ThemeMode
  toggle: () => void
  /** Text direction derived from the active language (RTL for ar/he/fa/ur/yi). */
  direction: Direction
  /** Display name from the whitelabel config, or the built-in default. */
  productName: string
  /** Logo image URL from the whitelabel config, or null. */
  logoUrl: string | null
  /** Login-page hero image URL from the whitelabel config, or null. */
  loginHeroUrl: string | null
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)
const STORAGE_KEY = 'tsm-theme'
const DEFAULT_PRODUCT_NAME = 'Terraform State Manager'

// Languages that use right-to-left text direction. Mirrors the registry frontend.
const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur', 'yi'])

function getDirection(lang: string): Direction {
  return RTL_LANGUAGES.has(lang.split('-')[0]) ? 'rtl' : 'ltr'
}

function initialMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * AppThemeProvider holds the light/dark preference (persisted to localStorage) and
 * installs the MUI theme + CssBaseline. Mirrors the registry frontend's ThemeContext.
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(initialMode)
  // Direction tracks the text direction of the active i18n language.
  const [direction, setDirection] = useState<Direction>(() => getDirection(i18n.language ?? 'en'))
  const [uiTheme, setUiTheme] = useState<UIThemeConfig | null>(null)

  const toggle = () =>
    setMode((current) => {
      const next: ThemeMode = current === 'light' ? 'dark' : 'light'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })

  // Sync direction when the i18n language changes, and reflect it on <html dir/lang>.
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      const dir = getDirection(lng)
      setDirection(dir)
      document.documentElement.dir = dir
      document.documentElement.lang = lng
    }
    // Apply immediately in case the language was already set before mount.
    handleLanguageChanged(i18n.language ?? 'en')
    i18n.on('languageChanged', handleLanguageChanged)
    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [])

  // Follow the OS colour scheme until the user picks a theme explicitly (no stored value).
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setMode(e.matches ? 'dark' : 'light')
      }
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Fetch the runtime whitelabel config once on mount; fall back to defaults.
  useEffect(() => {
    let cancelled = false
    // Normalise the call so it tolerates the various ways the api module is mocked
    // across the test suite (absent method, vi.fn returning undefined, pending promise).
    Promise.resolve(api.getUITheme?.())
      .then((config) => {
        if (cancelled || !config) return
        setUiTheme(config)
        if (config.favicon_url) {
          const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
          if (link) link.href = config.favicon_url
        }
      })
      .catch(() => {
        // ignore — built-in defaults apply
      })
    return () => {
      cancelled = true
    }
  }, [])

  const reducedMotion = useMemo(prefersReducedMotion, [])
  const theme = useMemo(
    () =>
      createAppTheme(mode, reducedMotion, direction, {
        primary: uiTheme?.primary_color,
        secondaryLight: uiTheme?.secondary_color_light,
        secondaryDark: uiTheme?.secondary_color_dark,
      }),
    [mode, reducedMotion, direction, uiTheme],
  )
  const value = useMemo(
    () => ({
      mode,
      toggle,
      direction,
      productName: uiTheme?.product_name ?? DEFAULT_PRODUCT_NAME,
      logoUrl: uiTheme?.logo_url ?? null,
      loginHeroUrl: uiTheme?.login_hero_url ?? null,
    }),
    [mode, direction, uiTheme],
  )

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  )
}

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeMode must be used within AppThemeProvider')
  return ctx
}
