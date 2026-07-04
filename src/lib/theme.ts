import { createTheme, ThemeOptions } from '@mui/material/styles';

/**
 * Heading / display type (Adobe Typekit kit — loaded non-blocking in root
 * layout; `aesthet-nova-fallback` is the size-adjusted Georgia face in
 * globals.css that prevents layout shift during the font swap).
 */
export const FONT_HEADING = '"aesthet-nova", "aesthet-nova-fallback", Georgia, "Times New Roman", serif';

/** UI / body type (loaded via `next/font/google` in `app/layout.tsx`). */
export const FONT_SANS =
  'var(--font-instrument-sans), "Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif';

/**
 * MUI Modal marks direct siblings in its container with aria-hidden while open. Using document.body,
 * that hides the skip link, header, main landmark, and footer while they stay keyboard-focusable (axe: aria-hidden-focus).
 * Portaling into `#main-content` scopes hiding to in-main siblings only.
 */
export function getMainContentModalContainer(): Element | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById('main-content') ?? document.body;
}

const muiModalAccessibilityPortal = {
  MuiModal: { defaultProps: { container: getMainContentModalContainer } },
  MuiDialog: { defaultProps: { container: getMainContentModalContainer } },
  MuiDrawer: { defaultProps: { ModalProps: { container: getMainContentModalContainer } } },
  MuiPopover: { defaultProps: { container: getMainContentModalContainer } },
};

// Slate scale — mirrors the Framer neutral ramp.
const slate = {
  50:  '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
};

// Civic palette tokens consumed by MUI and by the in-app design-system page.
export const civicPaletteTokens = {
  primary: {
    main: '#1E40AF',
    light: '#2563EB',
    dark: '#1E3A8A',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#16A34A',
    light: '#22C55E',
    dark: '#15803D',
    contrastText: '#FFFFFF',
  },
  neutral: slate,
  success: { main: '#16A34A', light: '#22C55E', dark: '#15803D' },
  warning: { main: '#D97706', light: '#F59E0B', dark: '#B45309' },
  error:   { main: '#DC2626', light: '#EF4444', dark: '#B91C1C' },
  // `info` aliases `primary` — the system has one blue.
  info:    { main: '#1E40AF', light: '#2563EB', dark: '#1E3A8A' },
};

// Utilities kept for downstream consumers.
export const getThemeColor = (theme: any, colorPath: string, fallback?: string) => {
  const path = colorPath.split('.');
  let value: any = theme;
  for (const key of path) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return fallback || '#000000';
    }
  }
  return value;
};

export const getContrastText = (theme: any, backgroundColor: string) =>
  theme.palette.getContrastText(backgroundColor);

export const getEventTypeColor = (_theme: any, eventType: string) => {
  switch (eventType) {
    case 'hearing': return civicPaletteTokens.primary.main;
    case 'floor':   return civicPaletteTokens.secondary.main;
    case 'markup':  return civicPaletteTokens.warning.main;
    default:        return slate[600];
  }
};

export const getPriorityColor = (_theme: any, priority: number) => {
  if (priority <= 3) return civicPaletteTokens.error.main;
  if (priority <= 6) return civicPaletteTokens.warning.main;
  return slate[600];
};

// Light theme (single source — dark mode is out of scope, see guidelines §14)
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: civicPaletteTokens.primary,
    secondary: civicPaletteTokens.secondary,
    success: civicPaletteTokens.success,
    warning: civicPaletteTokens.warning,
    error:   civicPaletteTokens.error,
    info:    civicPaletteTokens.info,
    background: {
      default: slate[50],   // --bg-page
      paper:   '#FFFFFF',   // --bg-surface
    },
    text: {
      primary:   slate[900],
      secondary: slate[700],
      disabled:  slate[400],
    },
    divider: slate[200],
  },
  typography: {
    fontFamily: FONT_SANS,
    // All headings: Aesthet Nova Medium (500), neutral tracking, line-height 1.4.
    h1: { fontFamily: FONT_HEADING, fontWeight: 500, fontSize: '2.5rem',    lineHeight: 1.4, letterSpacing: 0 }, // 40px
    h2: { fontFamily: FONT_HEADING, fontWeight: 500, fontSize: '1.875rem',  lineHeight: 1.4, letterSpacing: 0 }, // 30px
    h3: { fontFamily: FONT_HEADING, fontWeight: 500, fontSize: '1.625rem',  lineHeight: 1.4, letterSpacing: 0 }, // 26px
    h4: { fontFamily: FONT_HEADING, fontWeight: 500, fontSize: '1.375rem',  lineHeight: 1.4, letterSpacing: 0 }, // 22px
    h5: { fontFamily: FONT_HEADING, fontWeight: 500, fontSize: '1.125rem',  lineHeight: 1.4, letterSpacing: 0 }, // 18px
    h6: { fontFamily: FONT_HEADING, fontWeight: 500, fontSize: '1rem',      lineHeight: 1.4, letterSpacing: 0 }, // 16px
    body1: { fontSize: '0.875rem',  lineHeight: 1.4, color: slate[700] },   // 14px
    body2: { fontSize: '0.8125rem', lineHeight: 1.6, color: slate[600] },   // 13px
    subtitle1: { fontSize: '0.9375rem', lineHeight: 1.5, fontWeight: 500 }, // 15px lead
    subtitle2: { fontSize: '0.875rem',  lineHeight: 1.4, fontWeight: 500 },
    caption: { fontSize: '0.75rem', lineHeight: 1.4, color: slate[600] },   // 12px label
    overline: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
  },
  shape: { borderRadius: 8 },
  components: {
    ...muiModalAccessibilityPortal,
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          borderRadius: 8,
          padding: '10px 20px',
          minHeight: 44,
          boxShadow: 'none',
        },
        contained: {
          boxShadow: 'none',
          '&:hover':  { boxShadow: 'none' },
          '&:active': { boxShadow: 'none' },
        },
        outlined: (props: any) => {
          const { theme } = props;
          return {
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.palette.divider,
            color: theme.palette.text.primary,
            '&.MuiButton-outlinedPrimary': {
              color: theme.palette.primary.main,
              borderColor: theme.palette.primary.main,
            },
            '&:hover': {
              borderWidth: 1,
              borderColor: theme.palette.text.disabled,
              backgroundColor: slate[50],
            },
          };
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: (props: any) => ({
          borderRadius: 8,
          border: `1px solid ${props.theme.palette.divider}`,
          boxShadow: 'none',
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: (props: any) => ({
          borderRadius: 8,
          border: `1px solid ${props.theme.palette.divider}`,
          boxShadow: 'none',
        }),
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: (props: any) => ({
          borderRadius: 8,
          border: `1px solid ${props.theme.palette.divider}`,
          boxShadow: 'none',
          '&:before': { display: 'none' },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          borderWidth: 1,
          borderColor: slate[200],
          fontFamily: FONT_SANS,
          fontSize: '0.75rem',
          fontWeight: 600,
          height: 24,
          '&.MuiChip-sizeSmall': { fontSize: '0.7rem',    height: 20 },
          '&.MuiChip-sizeLarge': { fontSize: '0.875rem',  height: 32 },
        },
        label: { color: 'inherit' },
        outlined: (props: any) => ({
          borderColor: slate[200],
          color: props.theme.palette.text.primary,
          backgroundColor: 'transparent',
        }),
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            minHeight: 44,
          },
        },
      },
    },
    /**
     * Touch-target floor for icon buttons (WCAG 2.5.5). Mirrors the MuiButton
     * minHeight: 44 above. `size="small"` IconButtons keep their compact footprint
     * for genuine density needs (e.g. Chip delete icons, dense table rows).
     */
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 44,
          minHeight: 44,
        },
        sizeSmall: {
          minWidth: 32,
          minHeight: 32,
        },
      },
    },
    /**
     * Compact `size="small"` Select still respects the touch-target floor on its
     * outer hit area. The visible adornment may render shorter but the click
     * region inherits the 44px MuiOutlinedInput-root minHeight.
     */
    MuiSelect: {
      styleOverrides: {
        select: {
          minHeight: '44px !important',
          boxSizing: 'border-box',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: slate[900],
          boxShadow: 'none',
          borderBottom: `1px solid ${slate[200]}`,
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: { minHeight: 72 },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: civicPaletteTokens.primary.main,
          fontFamily: FONT_SANS,
          fontWeight: 500,
          textDecoration: 'none',
          '&:hover': { textDecoration: 'underline' },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          // Legacy bill-number classes — kept while callers migrate.
          // Re-spec to match the new type scale; no text-shadow, cursor: pointer (links, not help).
          '&.bill-number': {
            color: civicPaletteTokens.primary.main,
            fontFamily: FONT_HEADING,
            fontWeight: 500,
            fontSize: '1.375rem', // h4 / 22px
            cursor: 'pointer',
            '&:hover': { color: civicPaletteTokens.primary.dark },
          },
          '&.bill-number-medium': {
            color: civicPaletteTokens.primary.main,
            fontWeight: 500,
            fontSize: '0.875rem', // body1 / 14px
            '&:hover': { color: civicPaletteTokens.primary.dark },
          },
          '&.bill-number-small': {
            color: civicPaletteTokens.primary.main,
            fontWeight: 500,
            fontSize: '0.8125rem', // body2 / 13px
            '&:hover': { color: civicPaletteTokens.primary.dark },
          },
        },
      },
    },
  },
} as ThemeOptions);

// Dark mode is out of scope (guidelines §14). Keep `darkTheme` as a light-theme
// alias so any unmigrated import keeps working without a second palette to maintain.
export const darkTheme = lightTheme;

export type ThemeMode = 'light' | 'dark' | 'system';

export const getTheme = (_mode?: ThemeMode) => lightTheme;
