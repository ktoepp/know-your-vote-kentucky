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

/**
 * Shared chip sizing/padding tokens. Canonical chip primitives in
 * `src/components/ui/Chip.tsx` compose these; existing `STATUS_OUTLINED_CHIP_SX`
 * / `MEMBER_SPONSOR_OUTLINED_CHIP_SX` constants continue to resolve to the same
 * styles for current call sites.
 */
export const CHIP = {
  /** Card-level chip (topic, chamber, status) — 0.875rem / 600, standard label padding */
  standard: {
    fontSize: '0.875rem',
    fontWeight: 600,
    '& .MuiChip-label': { px: 1.1 },
  },
  /** Compact badge (sponsor role, governor, inline status) — 0.7rem / 700, 22px tall */
  compact: {
    fontSize: '0.7rem',
    height: 22,
    fontWeight: 700,
    '& .MuiChip-label': { px: 0.9 },
  },
  /** Additional slot for chips that carry a leading avatar */
  avatar: {
    maxWidth: '100%',
    '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', px: 1.1 },
    '& .MuiChip-avatar': { ml: 0.5 },
  },
} as const;

export type ChipScale = keyof typeof CHIP;
