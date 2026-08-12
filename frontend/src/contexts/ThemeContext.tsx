import type { ReactNode } from 'react'
import { SuiteThemeProvider, useThemeMode as useSuiteThemeMode } from '@4cloudguru/cloud-suite-ui'
import { api } from '../services/api'
import { isSafeExternalUrl } from '../utils/externalUrl'

const STORAGE_KEY = 'tsm-theme'
const DEFAULT_PRODUCT_NAME = 'Terraform State Manager'

// Defense-in-depth: the whitelabel URLs come from the backend /api/v1/ui/theme; validate each at
// the app boundary and drop any that fails, before handing them to the shared theme provider.
// Exported for the app-boundary test (#221) that verifies unsafe URLs are stripped.
export async function getSafeUITheme() {
  const theme = await api.getUITheme()
  if (!theme) return theme
  return {
    ...theme,
    logo_url: isSafeExternalUrl(theme.logo_url) ? theme.logo_url : undefined,
    favicon_url: isSafeExternalUrl(theme.favicon_url) ? theme.favicon_url : undefined,
    login_hero_url: isSafeExternalUrl(theme.login_hero_url) ? theme.login_hero_url : undefined,
  }
}

/** Wraps the shared SuiteThemeProvider with this app's storage key + whitelabel fetch. */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <SuiteThemeProvider
      storageKey={STORAGE_KEY}
      defaultProductName={DEFAULT_PRODUCT_NAME}
      getUITheme={getSafeUITheme}
    >
      {children}
    </SuiteThemeProvider>
  )
}

// TSM consumers call `toggle`; the package exposes `toggleTheme` — alias it.
export function useThemeMode() {
  const value = useSuiteThemeMode()
  return { ...value, toggle: value.toggleTheme }
}
