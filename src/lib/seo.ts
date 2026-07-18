import type { Metadata } from 'next';

/**
 * Use in a route `layout.tsx` for pages outside the public MVP story (still reachable by URL, not for SEO).
 */
export const noIndexMetadata: Metadata = {
  robots: { index: false, follow: false },
};

export interface PageMetadataOptions {
  /** Pre-template title (root layout appends " | Know Your Vote Kentucky"). */
  title: string;
  description: string;
  /** Route path ('/bills', '/members/jane-smith'); `metadataBase` absolutizes it. */
  path: string;
  ogType?: 'website' | 'article' | 'profile';
  /** Optional OG image path (e.g. a district thumbnail); omitted → the site-wide card. */
  ogImage?: string;
  /** Bypass the root title template (home page only). */
  absoluteTitle?: boolean;
}

/**
 * Per-page metadata with a self-referencing canonical. Every indexable route sets its
 * own canonical through this helper — the root layout deliberately sets none, because
 * a layout-level `alternates` is inherited by child pages and had every browse/static
 * page declaring the homepage as its canonical.
 */
export function buildPageMetadata(opts: PageMetadataOptions): Metadata {
  const { title, description, path, ogType = 'website', ogImage, absoluteTitle } = opts;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: ogType,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}
