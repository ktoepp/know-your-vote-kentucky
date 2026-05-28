/** Shared capitol hero background for marketing + returning home heroes. */
export const LANDING_HERO_BACKGROUND = {
  position: 'relative' as const,
  backgroundImage: 'url(/images/ky-capitol-hero.jpg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  color: 'common.white',
  overflow: 'hidden',
};

/**
 * Scrim for the tall marketing hero, whose large headline + subtitle sit over
 * the darker center of the photo. Verified AA at this strength.
 */
export const LANDING_HERO_SCRIM = {
  position: 'absolute' as const,
  inset: 0,
  background:
    'linear-gradient(180deg, rgba(15, 23, 42, 0.55) 0%, rgba(15, 23, 42, 0.42) 50%, rgba(15, 23, 42, 0.58) 100%)',
  pointerEvents: 'none' as const,
};

/**
 * Stronger scrim for the short returning hero. Because that band is only a few
 * hundred px tall, it crops the brightest slice of the photo (sky behind the
 * dome), so body-size subtitle text needs a much darker overlay to clear WCAG
 * AA. Heavier in the center where the headline/subtitle sit.
 */
export const LANDING_HERO_SCRIM_RETURNING = {
  position: 'absolute' as const,
  inset: 0,
  background:
    'linear-gradient(180deg, rgba(15, 23, 42, 0.62) 0%, rgba(15, 23, 42, 0.72) 50%, rgba(15, 23, 42, 0.62) 100%)',
  pointerEvents: 'none' as const,
};

/**
 * Shared hero CTA vocabulary so the marketing and returning heroes use one
 * button system instead of bespoke per-call-site `sx`. Three weights:
 * primary (filled white) > secondary (filled slate) > tertiary (translucent).
 */
export const HERO_CTA_PRIMARY_SX = {
  bgcolor: 'common.white',
  color: '#0f172a',
  fontWeight: 700,
  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.2)',
  '&:hover': { bgcolor: '#f1f5f9' },
} as const;

export const HERO_CTA_SECONDARY_SX = {
  bgcolor: '#0f172a',
  color: 'common.white',
  fontWeight: 600,
  border: '1px solid rgba(255, 255, 255, 0.35)',
  '&:hover': { bgcolor: '#1e293b' },
} as const;

/**
 * Tertiary: lowest emphasis. A translucent slate fill (not a bare outline)
 * guarantees white-text contrast regardless of the photo behind it.
 */
export const HERO_CTA_TERTIARY_SX = {
  bgcolor: 'rgba(15, 23, 42, 0.3)',
  color: 'common.white',
  fontWeight: 600,
  border: '1px solid rgba(255, 255, 255, 0.5)',
  '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.45)', borderColor: 'common.white' },
} as const;
