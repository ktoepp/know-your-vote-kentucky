import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'District map',
  description:
    'Explore Kentucky state House and Senate districts, search by ZIP code, and see your legislators on the roster.',
};

export default function MembersMapLayout({ children }: { children: ReactNode }) {
  return children;
}
