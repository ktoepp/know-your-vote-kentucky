import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Lint runs in CI (`npm run lint`, ESLint CLI) and gates merges. The build does not repeat it. The Next 16 upgrade (S1) deletes this key.
 */
const nextConfig: NextConfig = {
  /** Native WebSocket impl used by Supabase Realtime when Node is below 22 (see supabaseAdminCore.ts). */
  serverExternalPackages: ["ws"],
  /**
   * Turn `import { Foo } from '@mui/material'` into per-file deep imports at
   * build time, so unused MUI/icon/lottie modules are tree-shaken instead of
   * shipping in the shared client chunk. Cuts hundreds of KiB from the home
   * page's `unused JavaScript` PSI opportunity.
   */
  experimental: {
    optimizePackageImports: [
      '@mui/material',
      '@mui/icons-material',
      'lottie-react',
    ],
  },
  /**
   * Expose Vercel's deployment environment to the browser bundle. `VERCEL_ENV`
   * ("production" | "preview" | "development") is a build-time system var on
   * Vercel; baking it in as `NEXT_PUBLIC_VERCEL_ENV` lets client code (PostHog
   * init in instrumentation-client.ts) exclude preview deploys from analytics
   * without a dashboard change. Empty string off-Vercel (local dev).
   */
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "",
  },
  /**
   * Hosts whose legislator portraits may be resized through next/image. State
   * sites serve original-resolution photos (the governor's official portrait
   * is 18MB); the optimizer serves them right-sized instead. Must stay in sync
   * with OPTIMIZED_PORTRAIT_HOSTS in src/lib/ky-member-utils.ts — unlisted
   * hosts (one-off campaign/news sites) keep the plain <img> path.
   */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "legislature.ky.gov" },
      { protocol: "https", hostname: "governor.ky.gov" },
      { protocol: "https", hostname: "www.ag.ky.gov" },
      { protocol: "https", hostname: "s3.amazonaws.com", pathname: "/ballotpedia-api4/**" },
    ],
  },
  async redirects() {
    /**
     * Canonical host is https://www.kyvky.org (moved from www.kyvky.com; see
     * docs/specs/org-domain-migration.md). The kyvky.org apex 308s to it at the Vercel edge.
     *
     * www.kyvky.com stays attached to the Vercel project as a normal serving domain so the
     * host rule below can see it. Every path 308s to the same path on www.kyvky.org, with
     * the query string carried over, EXCEPT /api/unsubscribe/* and /api/webhooks/*. Those
     * keep answering on .com so that one-click unsubscribe POSTs from digests sent before
     * the move (List-Unsubscribe points at .com) and any webhook not yet repointed still
     * land. Drop the exclusion once those have aged out (plan: Phase 3).
     *
     * Every other alternate host (kyvky.com apex, knowyourvotekentucky.com,
     * knowyourvoteky.com and their www hosts) is redirected by the Vercel project's domain
     * settings and never reaches this table, and the knowyourvotekentucky.org pair is
     * forwarded by Hostinger. A `has: [{ type: 'host' }]` rule for any of those is dead
     * code, so changing a destination here would silently fix nothing.
     */
    return [
      {
        source: '/:path((?!api/unsubscribe/|api/webhooks/).*)',
        has: [{ type: 'host', value: 'www.kyvky.com' }],
        destination: 'https://www.kyvky.org/:path',
        permanent: true,
      },
      {
        source: '/ordinances',
        destination: '/',
        permanent: false,
      },
      {
        source: '/browse',
        destination: '/bills',
        permanent: true,
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  /** Map libs ship modern ESM; transpiling avoids occasional webpack chunk/module id mismatches in the App Router. */
  transpilePackages: ['mapbox-gl', 'react-map-gl'],
  webpack: (config) => {
    // Fix MUI imports for Next.js 15 compatibility
    config.resolve.alias = {
      ...config.resolve.alias,
      '@mui/material/esm': '@mui/material',
    };

    /**
     * Use webpack's default filesystem cache in dev. An in-memory cache was tried earlier to
     * reduce macOS ENOENT under `.next/cache/webpack/`; it can also desync chunk paths vs
     * `webpack-runtime.js` (`Cannot find module './NNNN.js'`). If cache renames fail locally,
     * run `npm run dev:clean` or delete `.next` and restart.
     */

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
         *   - Vercel Live / preview toolbar (vercel.live) — iframe + connections in preview only
         * `'unsafe-inline'` / `'unsafe-eval'` are present for Next.js runtime and
         * Mapbox GL's WebGL shader compilation; tightening them is a follow-up
         * task once we add nonces / hashes.
         */
        key: 'Content-Security-Policy-Report-Only',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com",
          "style-src 'self' 'unsafe-inline' https://api.mapbox.com https://fonts.googleapis.com https://use.typekit.net https://p.typekit.net",
          "font-src 'self' data: https://fonts.gstatic.com https://use.typekit.net",
          "img-src 'self' data: blob: https://*.supabase.co https://api.mapbox.com https://*.tiles.mapbox.com",
          "worker-src 'self' blob:",
          "frame-src 'self' https://vercel.live",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mapbox.com https://events.mapbox.com https://api.anthropic.com https://vercel.live",
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
      {
        /**
         * District boundaries (672KB across the two chambers) change only when
         * `npm run geo:ky-districts` is re-run, which decisions.md § 2026-07-03
         * gates on a point-in-polygon parity check. Vercel's static default
         * (`max-age=0, must-revalidate`) costs a 304 round trip per file per
         * visit; a day-long browser cache makes the return visit's lookup
         * instant. Bump the URL if the files are ever regenerated mid-day.
         */
        source: '/geo/:path*.geojson',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
 // For all available options, see:
 // https://www.npmjs.com/package/@sentry/webpack-plugin#options

 org: "the-eighth-dimension",

 project: "know-your-vote-kentucky",

 // Only print logs for uploading source maps in CI
 silent: !process.env.CI,

 // For all available options, see:
 // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

 // Upload a larger set of source maps for prettier stack traces (increases build time)
 widenClientFileUpload: true,

 // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
 // This can increase your server load as well as your hosting bill.
 // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
 // side errors will fail.
 tunnelRoute: "/monitoring",

 webpack: {
   // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
   // See the following for more information:
   // https://docs.sentry.io/product/crons/
   // https://vercel.com/docs/cron-jobs
   automaticVercelMonitors: true,

   // Tree-shaking options for reducing bundle size
   treeshake: {
     // Automatically tree-shake Sentry logger statements to reduce bundle size
     removeDebugLogging: true,
   },
 },
});
