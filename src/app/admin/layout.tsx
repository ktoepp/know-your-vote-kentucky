import type { Metadata } from 'next';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
