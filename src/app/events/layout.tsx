import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { noIndexMetadata } from '@/lib/seo';

// Legacy meetings UI (reads deprecated `ky_meetings`); superseded by /meetings + /committees.
// Kept reachable by direct URL only — noindex so it stays out of search and the sitemap.
export const metadata: Metadata = noIndexMetadata;

export default function EventsLayout({ children }: { children: ReactNode }) {
  return children;
}
