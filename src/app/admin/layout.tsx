import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { checkAdminAccess } from '@/lib/auth/shared-secret';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata;

/**
 * Second access check for every `/admin` page, alongside the one in
 * `src/middleware.ts`. Anything other than an exact 'ok' renders the 404 page.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const access = await checkAdminAccess(await headers());
  if (access !== 'ok') notFound();
  return <>{children}</>;
}
