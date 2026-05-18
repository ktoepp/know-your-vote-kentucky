import { createTheme, ThemeOptions } from '@mui/material/styles';

/** Display / heading type (Adobe Typekit kit `yru3sto` — loaded via <link> in root layout). */
export const FONT_HEADING = '"aesthet-nova", Georgia, "Times New Roman", serif';

/** UI / body type — loaded via next/font/google in layout.tsx, exposed as --font-sans. */
export const FONT_SANS = '"Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif';

/**
 * MUI Modal marks direct siblings in its container with aria-hidden while open. Using document.body,
 * that hides the skip link, header, main landmark, and footer while they stay keyboard-focusable
 * (axe: aria-hidden-focus). Portaling into `#main-content` scopes hiding to in-main siblings only.
 */
export function getMainContentModalContainer(): Element | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById('main-content') ?? document.body;
}

const muiModalAccessibilityPortal = {
  MuiModal: {
    defaultProps: { container: getMainContentModalContainer },
  },
  MuiDialog: {
    defaultProps: { container: getMainContentModalContainer },
  },
  MuiDrawer: {
    defaultProps: { ModalProps: { container: getMainContentModalContainer } },
  },
  MuiPopover: {
    defaultProps: { container: getMainContentModalContainer },
  },
};

// ---------------------------------------------------------------------------
// Civic Color Palette — aligned to globals.css design tokens (Framer canonical)
// ---------------------------------------------------------------------------
export const civicPaletteTokens = {
  primary: {
    main:         '#1E40AF',  /* --primary */
    light:        '#2563EB',  /* --primary-light */
    dark:         '#1E3A8A',  /* --primary-dark */
    contrastText: '#FFFFFF',
  },
  // House green / "success" green — same semantic meaning, kept as own tokens
  secondary: {
    main:         '#16A34A',  /* --success / --chamber-house */
    light:        '#22C55E',
    dark:         '#15803D',
    contrastText: '#FFFFFF',
  },
  // Slate neutral scale — aligns to globals.css Slate values
  neutral: {
    50:  '#F8FAFC',  /* --bg-page */
    100: '#F1F5F9',  /* --bg-tertiary */
    200: '#E2E8F0',  /* --border-light */
    300: '#CBD5E1',  /* --border */
    400: '#94A3B8',  /* --text-muted */
    500: '#64748B',  /* --text-tertiary */
    600: '#475569',
    700: '#334155',  /* --text-secondary */
    800: '#1E293B',
    900: '#0F172A',  /* --text-primary */
  },
  success: {
    main:  '#16A34A',
    light: '#22C55E',
    dark:  '#15803D',
  },
  warning: {
    main:  '#D97706',  /* --warning */
    light: '#F59E0B',
    dark:  '#B45309',
  },
  error: {
    main:  '#DC2626',  /* --error */
    light: '#EF4444',
    dark:  '#B91C1C',
  },
};

// ---------------------------------------------------------------------------
// Light Theme (the only theme — dark mode is not in scope for v1)
// ---------------------------------------------------------------------------
export const lightTheme = createTheme({
  palette: {
    mode:       'light',
    primary:    civicPaletteTokens.primary,
    secondary:  civicPaletteTokens.secondary,
    success:    civicPaletteTokens.success,
    warning:    civicPaletteTokens.warning,
    error:      civicPaletteTokens.error,
    background: {
      default: civicPaletteTokens.neutral[50],  /* --bg-page */
      paper:   '#FFFFFF',                         /* --bg-surface */
    },
    text: {
      primary:   civicPaletteTokens.neutral[900], /* #0F172A */
      secondary: civicPaletteTokens.neutral[700], /* #334155 */
    },
    divider: civicPaletteTokens.neutral[200],     /* --border-light */
  },

  typography: {
    fontFamily: FONT_SANS,
    h1: {
      fontFamily:    FONT_HEADING,
      fontWeight:    500,
      fontSize:      '2.5rem',    /* 40px */
      lineHeight:    1.4,
      letterSpacing: 0,
    },
    h2: {
      fontFamily:    FONT_HEADING,
      fontWeight:    500,
      fontSize:      '1.875rem',  /* 30px */
      lineHeight:    1.4,
      letterSpacing: 0,
    },
    h3: {
      fontFamily:    FONT_HEADING,
      fontWeight:    500,
      fontSize:      '1.625rem',  /* 26px */
      lineHeight:    1.4,
      letterSpacing: 0,
    },
    h4: {
      fontFamily:    FONT_HEADING,
      fontWeight:    500,
      fontSize:      '1.375rem',  /* 22px */
      lineHeight:    1.4,
      letterSpacing: 0,
    },
    h5: {
      fontFamily:    FONT_HEADING,
      fontWeight:    500,
      fontSize:      '1.125rem',  /* 18px */
      lineHeight:    1.4,
      letterSpacing: 0,
    },
    h6: {
      fontFamily:    FONT_HEADING,
      fontWeight:    500,
      fontSize:      '1rem',      /* 16px */
      lineHeight:    1.4,
      letterSpacing: 0,
    },
    body1: {
      fontSize:   '0.875rem',   /* 14px — text-body */
      lineHeight: 1.4,
    },
    body2: {
      fontSize:   '0.8125rem',  /* 13px — text-body-sm */
      lineHeight: 1.6,
    },
    subtitle1: {
      fontSize:   '0.9375rem',  /* 15px — text-body-lg */
      lineHeight: 1.5,
      fontWeight: 400,
    },
    subtitle2: {
      fontSize:   '0.875rem',
      lineHeight: 1.4,
      fontWeight: 500,
    },
    caption: {
      fontSize:   '0.75rem',    /* 12px — text-label */
      lineHeight: 1.4,
      fontWeight: 500,
    },
    overline: {
      fontSize:      '0.75rem',
      lineHeight:    1.4,
      fontWeight:    500,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    },
  },

  shape: {
    borderRadius: 8,  /* radius-md */
  },

  components: {
    ...muiModalAccessibilityPortal,

    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight:    500,
          borderRadius:  8,
          padding:       '10px 20px',
          minHeight:     44,    /* WCAG 44×44px tap target */
          boxShadow:     'none',
          transition:    'background-color 120ms cubic-bezier(0.2,0,0,1), border-color 120ms cubic-bezier(0.2,0,0,1)',
          '&:hover':  { boxShadow: 'none' },
          '&:active': { boxShadow: 'none' },
        },
        contained: {
          boxShadow: 'none',
          '&:hover':  { boxShadow: 'none' },
          '&:active': { boxShadow: 'none' },
        },
        outlined: {
          borderWidth: 1,
          '&:hover': { borderWidth: 1 },
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: (props: any) => ({
          borderRadius: 8,
          border:       `1px solid ${props.theme.palette.divider}`,
          boxShadow:    'none',
        }),
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 9999,  /* radius-full — pill shape */
          height:       32,
          fontWeight:   500,
          fontSize:     '0.875rem',
        },
        label: {
          paddingLeft:  14,
          paddingRight: 14,
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            minHeight:    44,
          },
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color:           civicPaletteTokens.neutral[900],
          boxShadow:       'none',
          borderBottom:    `1px solid ${civicPaletteTokens.neutral[200]}`,
        },
      },
    },

    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 72,  /* nav height per design spec */
        },
      },
    },

    MuiLink: {
      styleOverrides: {
        root: {
          color:          civicPaletteTokens.primary.main,
          fontWeight:     500,
          textDecoration: 'none',
          '&:hover': { textDecoration: 'underline' },
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: (props: any) => ({
          borderRadius: 8,
          border:       `1px solid ${props.theme.palette.divider}`,
          boxShadow:    'none',
        }),
      },
    },

    MuiAccordion: {
      styleOverrides: {
        root: (props: any) => ({
          borderRadius: 8,
          border:       `1px solid ${props.theme.palette.divider}`,
          boxShadow:    'none',
          '&:before': { display: 'none' },
        }),
      },
    },

    /* MuiContainer: no borderRadius — layout containers shouldn't have rounded corners */
  },
} as ThemeOptions);

// ---------------------------------------------------------------------------
// Dark theme — NOT in scope for v1.
// Exported as an alias so existing `import { darkTheme }` calls don't break during migration.
// When dark mode ships: re-spec every neutral token with a `--*-dark` paired value.
// ---------------------------------------------------------------------------
export const darkTheme = lightTheme;

// ---------------------------------------------------------------------------
// Theme utilities
// ---------------------------------------------------------------------------

export type ThemeMode = 'light' | 'dark' | 'system';

/** Always returns lightTheme. Dark mode is not in scope. */
export const getTheme = (_mode?: ThemeMode) => lightTheme;

export const getThemeColor = (theme: any, colorPath: string, fallback?: string): string => {
  const path = colorPath.split('.');
  let value: any = theme;
  for (const key of path) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return fallback ?? '#000000';
    }
  }
  return value;
};

export const getEventTypeColor = (_theme: any, eventType: string): string => {
  switch (eventType) {
    case 'hearing': return '#1E40AF';
    case 'floor':   return '#6B21A8';
    case 'markup':  return '#16A34A';
    default:        return civicPaletteTokens.neutral[500];
  }
};

export const getPriorityColor = (_theme: any, priority: number): string => {
  if (priority <= 3) return '#DC2626';
  if (priority <= 6) return '#D97706';
  return civicPaletteTokens.neutral[500];
};
