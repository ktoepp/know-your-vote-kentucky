import { createTheme, ThemeOptions, Theme } from '@mui/material/styles';

// Government and Civic Color Palette
const colors = {
  // Primary: Government Blue (trustworthy, authoritative) - Updated to match navigation
  primary: {
    main: '#1e40af', // Updated to match navigation
    light: '#3b82f6',
    dark: '#1e3a8a',
    contrastText: '#ffffff',
  },
  // Secondary: Civic Green (democracy, engagement)
  secondary: {
    main: '#2e7d32',
    light: '#60ad5e',
    dark: '#005005',
    contrastText: '#ffffff',
  },
  // Neutral: Professional grays
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  // Semantic colors
  success: {
    main: '#2e7d32',
    light: '#60ad5e',
    dark: '#005005',
  },
  warning: {
    main: '#ed6c02',
    light: '#ff9800',
    dark: '#e65100',
  },
  error: {
    main: '#d32f2f',
    light: '#ef5350',
    dark: '#c62828',
  },
  info: {
    main: '#0288d1',
    light: '#03a9f4',
    dark: '#01579b',
  },
};

// Theme utility functions
export const getThemeColor = (theme: any, colorPath: string, fallback?: string) => {
  const path = colorPath.split('.');
  let value = theme;
  
  for (const key of path) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return fallback || '#000000';
    }
  }
  
  return value;
};

export const getContrastText = (theme: any, backgroundColor: string) => {
  return theme.palette.getContrastText(backgroundColor);
};

export const getEventTypeColor = (theme: any, eventType: string) => {
  const isDark = theme.palette.mode === 'dark';
  
  switch (eventType) {
    case 'hearing':
      return isDark ? '#60a5fa' : '#1e40af';
    case 'floor':
      return isDark ? '#a855f7' : '#7c3aed';
    case 'markup':
      return isDark ? '#4ade80' : '#15803d';
    default:
      return isDark ? theme.palette.text.secondary : theme.palette.text.secondary;
  }
};

export const getPriorityColor = (theme: any, priority: number) => {
  const isDark = theme.palette.mode === 'dark';
  
  if (priority <= 3) {
    return isDark ? '#f87171' : '#dc2626';
  } else if (priority <= 6) {
    return isDark ? '#fbbf24' : '#d97706';
  } else {
    return isDark ? theme.palette.text.secondary : theme.palette.text.secondary;
  }
};

// Light Theme
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: colors.primary,
    secondary: colors.secondary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    background: {
      default: colors.neutral[50],
      paper: '#ffffff',
    },
    text: {
      primary: colors.neutral[900],
      secondary: colors.neutral[700],
    },
    divider: colors.neutral[200],
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: colors.neutral[700],
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: colors.neutral[600],
    },
    subtitle1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: '0.875rem',
      lineHeight: 1.4,
      fontWeight: 500,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.3,
      color: colors.neutral[600],
    },
    overline: {
      fontSize: '0.75rem',
      lineHeight: 1.3,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
          padding: '8px 16px',
          minHeight: 40,
        },
        contained: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
          },
        },
        outlined: (props: any) => {
          const { theme } = props;
          return {
            borderRadius: 8,
            borderWidth: 1.5,
            borderColor: theme.palette.divider,
            '&.MuiButton-outlinedPrimary': {
              color: theme.palette.primary.main,
              borderColor: theme.palette.primary.main,
              '& .MuiButton-startIcon, & .MuiButton-endIcon': {
                color: theme.palette.primary.main,
              },
            },
            '&:hover': {
              borderWidth: 1.5,
              borderColor: theme.palette.primary.light,
              backgroundColor: 'rgba(30,64,175,0.08)',
            },
          };
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: (props: any) => {
          const { theme } = props;
          return {
            borderRadius: 12,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          };
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: (props: any) => {
          const { theme, ownerState } = props;
          // Only target outlined chips with color default in dark mode
          if (
            ownerState.variant === 'outlined' &&
            (!ownerState.color || ownerState.color === 'default') &&
            theme.palette.mode === 'dark'
          ) {
            return {
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.palette.primary.light,
              color: theme.palette.primary.light,
              backgroundColor: 'rgba(30,64,175,0.10)',
              fontSize: '0.75rem',
              fontWeight: 600,
              height: 24,
              '&.MuiChip-sizeSmall': {
                fontSize: '0.7rem',
                height: 20,
              },
              '&.MuiChip-sizeLarge': {
                fontSize: '0.875rem',
                height: 32,
              },
            };
          }
          // Existing root styles for all other chips
          return {
            borderRadius: 8,
            borderWidth: 1,
            borderColor: 'rgba(0, 0, 0, 0.12)',
            fontSize: '0.75rem',
            fontWeight: 600,
            height: 24,
            '&.MuiChip-sizeSmall': {
              fontSize: '0.7rem',
              height: 20,
            },
            '&.MuiChip-sizeLarge': {
              fontSize: '0.875rem',
              height: 32,
            },
          };
        },
        label: {
          color: 'inherit',
        },
        outlined: (props: any) => {
          const { theme, ownerState } = props;
          // Outlined chip with color default in dark mode
          if (theme.palette.mode === 'dark' && (!ownerState.color || ownerState.color === 'default')) {
            return {
              borderColor: theme.palette.primary.light,
              color: theme.palette.primary.light,
              backgroundColor: 'rgba(30,64,175,0.10)',
            };
          }
          // Default for other cases
          return {
            borderColor: 'rgba(0, 0, 0, 0.12)',
            color: theme.palette.text.primary,
            backgroundColor: 'transparent',
          };
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            borderColor: 'inherit',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: colors.neutral[900],
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderBottom: `1px solid ${colors.neutral[200]}`,
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 64,
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: colors.primary.main,
          textDecoration: 'none',
          '&:hover': {
            textDecoration: 'underline',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: (props: any) => {
          const { theme } = props;
          return {
            borderRadius: 12,
            border: `1px solid ${theme.palette.divider}`,
          };
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: (props: any) => {
          const { theme } = props;
          return {
            borderRadius: 12,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: 'none',
            '&:before': { display: 'none' },
          };
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          '&.bill-number': {
            color: (theme: any) => theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
            fontWeight: 700,
            fontSize: '1.1rem',
            cursor: 'help',
            textShadow: (theme: any) => theme.palette.mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
            '&:hover': {
              color: (theme: any) => theme.palette.mode === 'dark' ? theme.palette.primary.main : theme.palette.primary.dark,
            }
          },
          '&.bill-number-small': {
            color: (theme: any) => theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
            fontWeight: 600,
            fontSize: '0.75rem',
            '&:hover': {
              color: (theme: any) => theme.palette.mode === 'dark' ? theme.palette.primary.main : theme.palette.primary.dark,
            }
          },
          '&.bill-number-medium': {
            color: (theme: any) => theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
            fontWeight: 600,
            fontSize: '0.875rem',
            '&:hover': {
              color: (theme: any) => theme.palette.mode === 'dark' ? theme.palette.primary.main : theme.palette.primary.dark,
            }
          }
        }
      }
    },
  },
} as ThemeOptions);

// Dark Theme
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1e40af', // Keep consistent with navigation
      light: '#3b82f6',
      dark: '#1e3a8a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#81c784',
      light: '#a5d6a7',
      dark: '#388e3c',
      contrastText: '#000000',
    },
    success: {
      main: '#66bb6a',
      light: '#81c784',
      dark: '#388e3c',
    },
    warning: {
      main: '#ffa726',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    info: {
      main: '#29b6f6',
      light: '#4fc3f7',
      dark: '#0288d1',
    },
    background: {
      default: '#000000',
      paper: '#1a1a1a',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.87)',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
    action: {
      active: 'rgba(255, 255, 255, 0.54)',
      hover: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(255, 255, 255, 0.16)',
      disabled: 'rgba(255, 255, 255, 0.3)',
      disabledBackground: 'rgba(255, 255, 255, 0.12)',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    subtitle1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: '0.875rem',
      lineHeight: 1.4,
      fontWeight: 500,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.3,
    },
    overline: {
      fontSize: '0.75rem',
      lineHeight: 1.3,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
          padding: '8px 16px',
          minHeight: 40,
        },
        contained: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          },
        },
        outlined: (props: any) => {
          const { theme } = props;
          return {
            borderRadius: 8,
            borderWidth: 1.5,
            borderColor: theme.palette.divider,
            '&.MuiButton-outlinedPrimary': {
              color: theme.palette.primary.light,
              borderColor: theme.palette.primary.light,
              '& .MuiButton-startIcon, & .MuiButton-endIcon': {
                color: theme.palette.primary.light,
              },
            },
            '&:hover': {
              borderWidth: 1.5,
              borderColor: theme.palette.primary.light,
              backgroundColor: 'rgba(96,165,250,0.12)',
            },
          };
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: (props: any) => {
          const { theme } = props;
          return {
            borderRadius: 12,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            backgroundColor: '#1a1a1a',
          };
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: (props: any) => {
          const { theme, ownerState } = props;
          // Only target outlined chips with color default in dark mode
          if (
            ownerState.variant === 'outlined' &&
            (!ownerState.color || ownerState.color === 'default') &&
            theme.palette.mode === 'dark'
          ) {
            return {
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.palette.primary.light,
              color: theme.palette.primary.light,
              backgroundColor: 'rgba(30,64,175,0.10)',
              fontSize: '0.75rem',
              fontWeight: 600,
              height: 24,
              '&.MuiChip-sizeSmall': {
                fontSize: '0.7rem',
                height: 20,
              },
              '&.MuiChip-sizeLarge': {
                fontSize: '0.875rem',
                height: 32,
              },
            };
          }
          // Existing root styles for all other chips
          return {
            borderRadius: 8,
            borderWidth: 1,
            borderColor: 'rgba(0, 0, 0, 0.12)',
            fontSize: '0.75rem',
            fontWeight: 600,
            height: 24,
            '&.MuiChip-sizeSmall': {
              fontSize: '0.7rem',
              height: 20,
            },
            '&.MuiChip-sizeLarge': {
              fontSize: '0.875rem',
              height: 32,
            },
          };
        },
        label: {
          color: 'inherit',
        },
        outlined: (props: any) => {
          const { theme, ownerState } = props;
          // Outlined chip with color default in dark mode
          if (theme.palette.mode === 'dark' && (!ownerState.color || ownerState.color === 'default')) {
            return {
              borderColor: theme.palette.primary.light,
              color: theme.palette.primary.light,
              backgroundColor: 'rgba(30,64,175,0.10)',
            };
          }
          // Default for other cases
          return {
            borderColor: 'rgba(0, 0, 0, 0.12)',
            color: theme.palette.text.primary,
            backgroundColor: 'transparent',
          };
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            borderColor: (theme: any) => theme.palette.divider,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 64,
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#64b5f6',
          textDecoration: 'none',
          '&:hover': {
            textDecoration: 'underline',
            color: '#90caf9',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: (props: any) => {
          const { theme } = props;
          return {
            borderRadius: 12,
            border: `1px solid ${theme.palette.divider}`,
          };
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: (props: any) => {
          const { theme } = props;
          return {
            borderRadius: 12,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: 'none',
            '&:before': { display: 'none' },
          };
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          '&.bill-number': {
            color: (theme: any) => theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
            fontWeight: 700,
            fontSize: '1.1rem',
            cursor: 'help',
            textShadow: (theme: any) => theme.palette.mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
            '&:hover': {
              color: (theme: any) => theme.palette.mode === 'dark' ? theme.palette.primary.main : theme.palette.primary.dark,
            }
          },
          '&.bill-number-small': {
            color: (theme: any) => theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
            fontWeight: 600,
            fontSize: '0.75rem',
            '&:hover': {
              color: (theme: any) => theme.palette.mode === 'dark' ? theme.palette.primary.main : theme.palette.primary.dark,
            }
          },
          '&.bill-number-medium': {
            color: (theme: any) => theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
            fontWeight: 600,
            fontSize: '0.875rem',
            '&:hover': {
              color: (theme: any) => theme.palette.mode === 'dark' ? theme.palette.primary.main : theme.palette.primary.dark,
            }
          }
        }
      }
    },
  },
} as ThemeOptions);

// Theme context and provider
export type ThemeMode = 'light' | 'dark' | 'system';

export const getTheme = (mode: ThemeMode) => {
  if (mode === 'dark') return darkTheme;
  if (mode === 'light') return lightTheme;
  
  // System theme
  if (typeof window !== 'undefined') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? darkTheme : lightTheme;
  }
  
  return lightTheme;
}; 