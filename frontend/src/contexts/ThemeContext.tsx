import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline, PaletteMode } from '@mui/material';

interface ThemeContextType {
  mode: PaletteMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'tsm_theme_mode';

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

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#5C4EE5',
          },
          secondary: {
            main: '#00D9C0',
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
    [mode]
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
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
