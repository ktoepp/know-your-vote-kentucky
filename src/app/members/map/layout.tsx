import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Find my legislators: look up your Kentucky House and Senate districts',
  description:
    'Enter your address or ZIP code to find your Kentucky House and Senate districts and see your state representatives for the current session.',
  path: '/members/map',
});

export default function MembersMapLayout({ children }: { children: ReactNode }) {
  return children;
}
