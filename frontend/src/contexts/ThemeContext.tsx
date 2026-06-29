import type { ReactNode } from 'react'
import { SuiteThemeProvider, useThemeMode as useSuiteThemeMode } from '@sethbacon/terraform-suite-ui'
import { api } from '../services/api'

const STORAGE_KEY = 'tsm-theme'
const DEFAULT_PRODUCT_NAME = 'Terraform State Manager'

/** Wraps the shared SuiteThemeProvider with this app's storage key + whitelabel fetch. */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <SuiteThemeProvider
      storageKey={STORAGE_KEY}
      defaultProductName={DEFAULT_PRODUCT_NAME}
      getUITheme={api.getUITheme}
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
