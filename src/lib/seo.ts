import type { Metadata } from 'next';

/**
 * Use in a route `layout.tsx` for pages outside the public MVP story (still reachable by URL, not for SEO).
 */
export const noIndexMetadata: Metadata = {
  robots: { index: false, follow: false },
};
