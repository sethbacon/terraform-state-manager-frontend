import { createTheme, type Theme } from '@mui/material/styles'

export type ThemeMode = 'light' | 'dark'

// Brand tokens shared with the registry frontend for visual parity.
export const BRAND_PRIMARY = '#5C4EE5'
const SECONDARY_LIGHT = '#00796B'
const SECONDARY_DARK = '#00D9C0'

/**
 * createAppTheme builds the MUI theme for the given mode. Colours mirror the
 * sibling terraform-registry-frontend so the two apps share look-and-feel.
 */
export function createAppTheme(mode: ThemeMode): Theme {
  return createTheme({
    palette: {
      mode,
      primary: { main: BRAND_PRIMARY },
      secondary: { main: mode === 'dark' ? SECONDARY_DARK : SECONDARY_LIGHT },
    },
    typography: {
      fontFamily: ['Inter', 'Roboto', 'system-ui', '-apple-system', 'sans-serif'].join(','),
    },
    shape: { borderRadius: 8 },
  })
}
