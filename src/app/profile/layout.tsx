import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { noIndexMetadata } from '@/lib/seo';

// Account surface: reachable by URL, never for search. The page is a client
// component, so the layout supplies the title (WCAG 2.4.2) and the noindex.
export const metadata: Metadata = { ...noIndexMetadata, title: 'Profile' };

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return children;
}
