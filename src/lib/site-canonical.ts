/**
 * Canonical public site origin. Production default: https://www.kyvky.com
 *
 * `www` is canonical, not the apex: the apex 301s to www, and the page canonical
 * link tag plus og:url both emit the www origin (confirmed live, see PR #247 and
 * `hostsToCanonical` in next.config.ts). Google has indexed ~1,000 URLs under www.
 * Defaulting to the apex meant that whenever `NEXT_PUBLIC_APP_URL` was unset, the
 * sitemap, robots.txt, metadataBase, JSON-LD, and email links would all emit a
 * non-canonical origin that only resolves after an extra redirect hop.
 *
 * Set `NEXT_PUBLIC_APP_URL` (and optional `APP_PUBLIC_URL` for server-only overrides)
 * in each environment so metadata, sitemap, and email links match the live host.
 */
export const DEFAULT_SITE_ORIGIN = 'https://www.kyvky.com';

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
 * Prefer `NEXT_PUBLIC_APP_URL` (e.g. https://www.kyvky.com) so links match a host that is
 * always on Vercel and avoid www vs apex + hash loss on redirects. Falls back to `window` on the client.
 *
 * The fallback must be the canonical www host for the same reason: an apex link would
 * 301 to www, and Supabase's auth tokens ride in the URL fragment, which browsers drop
 * across a redirect. Whatever this resolves to must also be in Supabase's redirect allowlist.
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
