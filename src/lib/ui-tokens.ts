/**
 * Shared visual scale for icons and typography roles.
 * Prefer these over ad-hoc px/rem so nav, drawers, and page sections stay aligned.
 */

/** Icon sizes as rem (16px base) */
export const ICON_REM = {
  /** Dense UI, table rows, captions */
  inline: '1rem',
  /** App bar nav buttons, list rows, form-adjacent icons */
  nav: '1.375rem',
  /** Section headers (e.g. SectionHeader), card titles with leading icon */
  section: '1.5rem',
  /** Hero / spotlight rows */
  hero: '1.75rem',
} as const;

export type IconRole = keyof typeof ICON_REM;

/** Standard `sx` for MUI SvgIcon / icon in cloneElement */
export function iconRemSx(role: IconRole) {
  return { fontSize: ICON_REM[role] };
}

/**
 * Semantic typography roles — pair with MUI Typography `variant`.
 * Page: one primary h1 (usually variant h3–h4 visually); sections: h5–h6.
 */
export const TYPE = {
  heroTitle: { variant: 'h3' as const, fontWeight: 700 },
  pageTitle: { variant: 'h4' as const, fontWeight: 700 },
  sectionTitle: { variant: 'h5' as const, fontWeight: 700 },
  cardTitle: { variant: 'h6' as const, fontWeight: 700 },
  subsection: { variant: 'subtitle1' as const, fontWeight: 600 },
  body: { variant: 'body1' as const },
  supporting: { variant: 'body2' as const },
  meta: { variant: 'caption' as const },
} as const;

/** Slightly larger than body text — use for MuiLink defaults and prominent text links */
export const LINK = {
  fontSize: '1.0625rem',
  fontWeight: 500,
} as const;

/** External / “open in new tab” affordance — matches nav icon scale */
export const EXTERNAL_LINK_ICON_SX = { fontSize: ICON_REM.nav } as const;
