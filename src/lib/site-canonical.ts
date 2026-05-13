/**
 * Canonical public site origin. Production default: https://kyvky.com
 *
 * Set `NEXT_PUBLIC_APP_URL` (and optional `APP_PUBLIC_URL` for server-only overrides)
 * in each environment so metadata, sitemap, and email links match the live host.
 */
export const DEFAULT_SITE_ORIGIN = 'https://kyvky.com';

export function publicSiteOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') ||
    process.env.APP_PUBLIC_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const vercel = process.env.VERCEL_URL?.trim().replace(/\/$/, '');
  if (vercel) return vercel.startsWith('http') ? vercel : `https://${vercel}`;
  if (process.env.NODE_ENV === 'development') return 'http://localhost:3000';
  return DEFAULT_SITE_ORIGIN;
}

/**
 * Origin embedded in Supabase email links (`emailRedirectTo` / `redirectTo`).
 * Prefer `NEXT_PUBLIC_APP_URL` (e.g. https://kyvky.com) so links match a host that is
 * always on Vercel and avoid www vs apex + hash loss on redirects. Falls back to `window` on the client.
 */
export function authEmailRedirectOrigin(): string {
  const fromEnv =
    typeof process !== 'undefined'
      ? (
          process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') ||
          process.env.APP_PUBLIC_URL?.trim().replace(/\/$/, '')
        )
      : '';
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') return window.location.origin;
  return DEFAULT_SITE_ORIGIN;
}
