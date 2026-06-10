import { createTheme, type Theme } from '@mui/material/styles'

export type ThemeMode = 'light' | 'dark'

// Brand tokens shared with the registry frontend for visual parity.
export const BRAND_PRIMARY = '#5C4EE5'
const SECONDARY_LIGHT = '#00796B'
const SECONDARY_DARK = '#00D9C0'

/**
 * createAppTheme builds the MUI theme for the given mode. Colours, font stack, and
 * the component baseline mirror the sibling terraform-registry-frontend so the two
 * apps share look-and-feel. When prefersReducedMotion is set, all MUI transitions
 * are disabled to honour the OS accessibility preference.
 */
export function createAppTheme(mode: ThemeMode, prefersReducedMotion = false): Theme {
  const secondary = mode === 'dark' ? SECONDARY_DARK : SECONDARY_LIGHT
  return createTheme({
    palette: {
      mode,
      primary: { main: BRAND_PRIMARY },
      secondary: { main: secondary },
      // Match the registry's dark surfaces so the two apps share the same depth.
      ...(mode === 'dark' && {
        background: { default: '#121212', paper: '#1e1e1e' },
      }),
    },
    typography: {
      fontFamily: ['Inter', 'Roboto', 'Helvetica', 'Arial', 'system-ui', 'sans-serif'].join(','),
    },
    shape: { borderRadius: 8 },
    ...(prefersReducedMotion && {
      transitions: {
        create: () => 'none',
        duration: {
          shortest: 0,
          shorter: 0,
          short: 0,
          standard: 0,
          complex: 0,
          enteringScreen: 0,
          leavingScreen: 0,
        },
      },
    }),
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          // Expose brand colours as CSS custom properties for non-MUI elements.
          ':root': {
            '--brand-primary': BRAND_PRIMARY,
            '--brand-secondary': secondary,
          },
          // Dark-mode-safe code styling so inline code and blocks stay legible.
          'pre, code': {
            backgroundColor: mode === 'dark' ? '#2d2d2d' : '#f5f5f5',
            color: mode === 'dark' ? '#e6e6e6' : '#1e1e1e',
          },
          // Dark-mode scrollbars: scrollbarColor covers Firefox, the webkit
          // pseudo-elements cover Chromium/WebKit so they don't stay light.
          body: {
            scrollbarColor: mode === 'dark' ? '#6b6b6b #2b2b2b' : undefined,
            '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
              backgroundColor: mode === 'dark' ? '#2b2b2b' : undefined,
            },
            '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
              backgroundColor: mode === 'dark' ? '#6b6b6b' : undefined,
              borderRadius: 8,
            },
          },
        },
      },
    },
  })
}
