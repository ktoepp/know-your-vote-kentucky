/** Shared capitol hero background for marketing + returning home heroes. */
export const LANDING_HERO_BACKGROUND = {
  position: 'relative' as const,
  backgroundImage: 'url(/images/ky-capitol-hero.jpg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  color: 'common.white',
  overflow: 'hidden',
};

/** Light scrim so headline and CTAs stay readable on bright areas of the photo. */
export const LANDING_HERO_SCRIM = {
  position: 'absolute' as const,
  inset: 0,
  background:
    'linear-gradient(180deg, rgba(15, 23, 42, 0.35) 0%, rgba(15, 23, 42, 0.15) 45%, rgba(15, 23, 42, 0.4) 100%)',
  pointerEvents: 'none' as const,
};
