import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline, PaletteMode } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { UIThemeConfig } from '../types';
import apiClient from '../services/api';
import { queryKeys } from '../services/queryKeys';

// Built-in defaults — kept identical to the backend's default white-label
// theme so the app renders correctly even when the /ui/theme request fails.
const DEFAULT_PRIMARY = '#5C4EE5';
const DEFAULT_SECONDARY_LIGHT = '#F4F4F5';
const DEFAULT_SECONDARY_DARK = '#18181B';
const DEFAULT_PRODUCT_NAME = 'Terraform State Manager';

const DEFAULT_THEME: UIThemeConfig = {
  product_name: DEFAULT_PRODUCT_NAME,
  primary_color: DEFAULT_PRIMARY,
  secondary_color_light: DEFAULT_SECONDARY_LIGHT,
  secondary_color_dark: DEFAULT_SECONDARY_DARK,
  logo_url: null,
  favicon_url: null,
  login_hero_url: null,
};

interface ThemeContextType {
  mode: PaletteMode;
  toggleTheme: () => void;
  /** Display name for the product, from the white-label config or the built-in default. */
  productName: string;
  /** Logo image URL, or null if no custom logo is configured. */
  logoUrl: string | null;
  /** Login-page hero image URL, or null if not configured. */
  loginHeroUrl: string | null;
  direction: 'ltr' | 'rtl';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'tsm_theme_mode';

/** Apply the favicon override to the document's <link rel="icon">. */
function applyFavicon(faviconUrl: string | null | undefined) {
  if (!faviconUrl) return;
  const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (link) {
    link.href = faviconUrl;
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem(THEME_KEY, mode);
  }, [mode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (!savedTheme) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Fetch the public white-label theme once on load. The endpoint is
  // unauthenticated and always returns a populated default, but we still fall
  // back to the built-in DEFAULT_THEME on any fetch failure so render is never
  // blocked. The fetch is non-blocking: the built-in default is used until the
  // request resolves (via placeholderData), so the app never flashes unstyled.
  const { data: uiTheme } = useQuery({
    queryKey: queryKeys.uiTheme.get(),
    queryFn: () => apiClient.getUiTheme(),
    staleTime: 5 * 60 * 1000,
    retry: false,
    placeholderData: DEFAULT_THEME,
  });

  // Resolve each field over the built-in defaults so individual missing fields
  // (e.g. a null logo) still fall back sensibly. `uiTheme` is only undefined in
  // the unlikely window before placeholderData applies; default covers it.
  const theme = uiTheme ?? DEFAULT_THEME;
  const primaryColor = theme.primary_color ?? DEFAULT_PRIMARY;
  const secondaryLight = theme.secondary_color_light ?? DEFAULT_SECONDARY_LIGHT;
  const secondaryDark = theme.secondary_color_dark ?? DEFAULT_SECONDARY_DARK;
  const productName = theme.product_name ?? DEFAULT_PRODUCT_NAME;
  const logoUrl = theme.logo_url ?? null;
  const loginHeroUrl = theme.login_hero_url ?? null;
  const faviconUrl = theme.favicon_url ?? null;

  // Reflect the product name in the browser tab title.
  useEffect(() => {
    document.title = productName;
  }, [productName]);

  // Apply the favicon override when provided.
  useEffect(() => {
    applyFavicon(faviconUrl);
  }, [faviconUrl]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: primaryColor,
          },
          secondary: {
            main: mode === 'dark' ? secondaryDark : secondaryLight,
          },
          ...(mode === 'dark' && {
            background: {
              default: '#121212',
              paper: '#1e1e1e',
            },
          }),
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              ':root': {
                '--brand-primary': primaryColor,
                '--brand-secondary': mode === 'dark' ? secondaryDark : secondaryLight,
              },
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
              'pre, code': {
                backgroundColor: mode === 'dark' ? '#2d2d2d' : '#f5f5f5',
                color: mode === 'dark' ? '#e6e6e6' : '#1e1e1e',
              },
              '@media (prefers-reduced-motion: reduce)': {
                '*, *::before, *::after': {
                  animationDuration: '0.01ms !important',
                  animationIterationCount: '1 !important',
                  transitionDuration: '0.01ms !important',
                },
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none' as const,
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                borderRight: 'none',
              },
            },
          },
        },
      }),
    [mode, primaryColor, secondaryLight, secondaryDark]
  );

  const value = useMemo<ThemeContextType>(
    () => ({
      mode,
      toggleTheme,
      productName,
      logoUrl,
      loginHeroUrl,
      direction: 'ltr',
    }),
    [mode, productName, logoUrl, loginHeroUrl]
  );

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
