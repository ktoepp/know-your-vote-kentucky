import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Design system',
  description: 'Civic UI tokens, theme extensions, and reusable Kentucky civic components.',
  robots: { index: false, follow: false },
};

export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  return children;
}
