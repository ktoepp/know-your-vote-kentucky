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
 * Page: one primary h1 (usually variant h3–h4 visually); card titles: h6.
 */
/**
 * Section headings (MemberProfileView, SectionHeader, MobileHeader): sans-serif stack at ~former h5 size.
 * Page / hero titles remain serif via theme `h3`–`h4`.
 */
export const SECTION_TITLE_DISPLAY_SX = {
  fontSize: '1.125rem',
  lineHeight: 1.4,
} as const;

export const TYPE = {
  heroTitle: { variant: 'h3' as const, fontWeight: 700 },
  pageTitle: { variant: 'h4' as const, fontWeight: 700 },
  /** In-body section headings — sans-serif to match subtitle2-style labels (e.g. “Trending now”). */
  sectionTitle: { variant: 'subtitle2' as const, fontWeight: 700 },
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
 * `src/components/ui/Chip.tsx` compose these for consistent sizing across
 * bill cards, member cards, and detail surfaces.
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

/**
 * Card shell tokens consumed by `<CivicCard />` (see `components/ui/CivicCard.tsx`).
 * `KYBillCard`, `MemberCard`, `OrdinanceCard`, and meeting cards adopt these so
 * border radius, padding, elevation, and hover motion stay aligned across the app.
 *
 * Values use the MUI system scale (multiples of `theme.shape.borderRadius` / `theme.spacing`).
 */
export const CARD = {
  /** Border radius on the outer Card (`sx` scale — 3 × 8px = 24px). */
  borderRadius: 3,
  /** Inner CardContent padding — responsive. */
  padding: { xs: 2, sm: 2.5 },
  /** MUI `elevation` prop values. */
  elevation: {
    rest: 0,
    featured: 3,
    hover: 4,
  },
  /** Hover motion — matches existing KYBillCard / MemberCard. */
  hoverTransform: 'translateY(-2px)',
  hoverTransition: 'all 0.2s ease',
} as const;
