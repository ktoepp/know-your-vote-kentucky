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
  sectionTitle: { variant: 'subtitle2' as const, fontWeight: 600 },
  cardTitle: { variant: 'h6' as const, fontWeight: 700 },
  subsection: { variant: 'subtitle1' as const, fontWeight: 600 },
  body: { variant: 'body1' as const },
  supporting: { variant: 'body2' as const },
  meta: { variant: 'caption' as const },
} as const;

/**
 * Legislator identity block on member cards, bill sponsors, and map tooltips.
 * Name is one step up from role/district (h6 vs subtitle1).
 */
export const LEGISLATOR_NAME_SX = {
  variant: TYPE.cardTitle.variant,
  fontWeight: TYPE.cardTitle.fontWeight,
  color: 'text.primary',
  lineHeight: 1.25,
  m: 0,
} as const;

export const LEGISLATOR_ROLE_LINE_SX = {
  variant: TYPE.subsection.variant,
  fontWeight: TYPE.subsection.fontWeight,
  color: 'text.secondary',
  lineHeight: 1.35,
  m: 0,
} as const;

/** Uppercase field labels on dense bill cards (“Primary sponsor”, “Latest action”). */
export const LEGISLATOR_FIELD_LABEL_SX = {
  variant: TYPE.meta.variant,
  display: 'block',
  color: 'text.secondary',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: 600,
  fontSize: '0.7rem',
  mb: 0.5,
} as const;

/** Avatar diameters (px) by surface density. */
export const LEGISLATOR_AVATAR = {
  size: {
    hero: 88,
    card: 72,
    compact: 56,
    detail: 72,
    inline: 40,
    inlineDense: 32,
  },
  initialsFontSize: {
    hero: '1.5rem',
    card: '1.25rem',
    compact: '1.1rem',
    detail: '1.25rem',
    inline: '0.8rem',
    inlineDense: '0.7rem',
  },
} as const;

/** Text-style external links on legislator cards (KY Legislature, Ballotpedia, …). */
export const LEGISLATOR_EXTERNAL_LINK = {
  buttonSx: {
    color: 'text.secondary',
    fontWeight: 500,
    textTransform: 'none',
    fontSize: '0.8125rem',
    minHeight: 32,
    '&:hover': { bgcolor: 'action.hover' },
  },
  iconSx: { fontSize: '0.9rem', opacity: 0.65 },
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
  /**
   * Border radius on the outer Card (`sx` scale — 3 × 8px = 24px). This is the
   * canonical "large" card step, mirrored by the `--radius-lg` CSS token /
   * Tailwind `rounded-card`. Controls (buttons, inputs, MUI Card/Paper) use the
   * 8px `--radius` step instead.
   */
  borderRadius: 3,
  /** Inner CardContent padding — responsive. */
  padding: { xs: 2, sm: 2.5 },
  /** MUI `elevation` prop values. */
  elevation: {
    rest: 0,
    featured: 3,
    /** Legacy MUI elevation index; prefer `hoverBoxShadow` for interactive hover. */
    hover: 2,
  },
  /** Soft hover shadow (low-opacity) for CivicCard interactive states. */
  hoverBoxShadow: '0 2px 10px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
  hoverBoxShadowDark: '0 2px 10px rgba(0, 0, 0, 0.22), 0 1px 3px rgba(0, 0, 0, 0.14)',
  /** Hover motion — matches existing KYBillCard / MemberCard. */
  hoverTransform: 'translateY(-2px)',
  hoverTransition: 'all 0.2s ease',
} as const;

/**
 * Standard responsive card grid. Browse/search/feed surfaces render through
 * `<CardGrid>` / `<CardGridItem>` (see `components/ui/CardGrid.tsx`) so every
 * grid uses the same breakpoints (1 col mobile → 2 tablet → 3 desktop) and gap.
 */
export const GRID = {
  /** `spacing` on the MUI Grid container (sx scale). */
  spacing: 3,
  /** Item breakpoints — legacy MUI Grid API to match existing call sites. */
  item: { xs: 12, sm: 6, md: 4 },
} as const;

/**
 * Shared keyboard focus ring. Apply to interactive cards and stretch-link
 * containers (`&:focus-visible` / `&:has(.stretch-link:focus-visible)`) so the
 * focus indicator is identical everywhere. Outline follows border-radius in
 * modern browsers, so it reads correctly on rounded cards.
 */
export const FOCUS_RING = {
  outline: '2px solid',
  outlineColor: 'primary.main',
  outlineOffset: 2,
} as const;

/**
 * Hover/transition vocabulary for non-card interactive surfaces (list rows,
 * tiles, clickable chips). Cards use the `CARD` shadow+lift tokens instead.
 */
export const INTERACTION = {
  /** Subtle row/list-item hover: background tint with a short transition. */
  rowHover: {
    transition: 'background-color 0.15s ease',
    '&:hover': { bgcolor: 'action.hover' },
  },
  /** Tile/link hover: border + background change with a short transition. */
  tileHover: {
    transition: 'background-color 0.15s ease, border-color 0.15s ease',
    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
  },
} as const;
