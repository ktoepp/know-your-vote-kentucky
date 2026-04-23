import type { NextConfig } from "next";

/**
 * Disables ESLint during Vercel builds to prevent non-critical lint errors from blocking deployment.
 *
 * Recommended for production deployment if you already run linting locally or in CI.
 *
 * To re-enable ESLint in production builds for stricter code quality, remove or set `ignoreDuringBuilds: false`.
 */
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  /** Map libs ship modern ESM; transpiling avoids occasional webpack chunk/module id mismatches in the App Router. */
  transpilePackages: ['mapbox-gl', 'react-map-gl'],
  webpack: (config, { isServer }) => {
    // Fix MUI imports for Next.js 15 compatibility
    config.resolve.alias = {
      ...config.resolve.alias,
      '@mui/material/esm': '@mui/material',
    };

    return config;
  },
  /**
   * Baseline security response headers (Security audit §6).
   *
   * Applied to all routes except `/api/sync/*`, which is scoped out per task 2a.3
   * (sync endpoints are operator-only and don't render HTML).
   *
   * CSP is intentionally Report-Only: we want to surface violations without
   * breaking Mapbox / Anthropic / Supabase integrations before we've had time
   * to test an enforced policy end-to-end.
   */
  async headers() {
    const securityHeaders = [
      {
        // Send full origin on same-origin, only the origin cross-origin, and nothing on HTTPS→HTTP downgrade.
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        // Disallow embedding the site in iframes to mitigate clickjacking.
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        // Prevent MIME-type sniffing; browsers must honor declared Content-Type.
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        // Deny powerful features we don't use; allow geolocation on same-origin only (ZIP lookup).
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(self)',
      },
      {
        /**
         * Report-Only CSP covering current third-party origins:
         *   - Supabase (*.supabase.co)         — data API, auth, storage
         *   - Mapbox (api.mapbox.com, events.mapbox.com) — map tiles & telemetry
         *   - Anthropic (api.anthropic.com)    — LLM summarization (server-side only, listed defensively)
         *   - Google Fonts (fonts.googleapis.com, fonts.gstatic.com)
         * `'unsafe-inline'` / `'unsafe-eval'` are present for Next.js runtime and
         * Mapbox GL's WebGL shader compilation; tightening them is a follow-up
         * task once we add nonces / hashes.
         */
        key: 'Content-Security-Policy-Report-Only',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com",
          "style-src 'self' 'unsafe-inline' https://api.mapbox.com https://fonts.googleapis.com",
          "font-src 'self' data: https://fonts.gstatic.com",
          "img-src 'self' data: blob: https://*.supabase.co https://api.mapbox.com https://*.tiles.mapbox.com",
          "worker-src 'self' blob:",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mapbox.com https://events.mapbox.com https://api.anthropic.com",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
    ];
    return [
      {
        // Exclude `/api/sync/*` (operator-only sync endpoints, per task 2a.3 scoping).
        source: '/((?!api/sync).*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
