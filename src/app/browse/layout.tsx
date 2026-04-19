import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata;

export default function BrowseLayout({ children }: { children: ReactNode }) {
  return children;
}
