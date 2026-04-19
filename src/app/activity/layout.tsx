import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata;

export default function ActivityLayout({ children }: { children: ReactNode }) {
  return children;
}
