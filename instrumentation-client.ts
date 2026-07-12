import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const reportInDev =
  process.env.NEXT_PUBLIC_SENTRY_REPORT_DEV === "1" ||
  process.env.NEXT_PUBLIC_SENTRY_REPORT_DEV === "true";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
const posthogInDev =
  process.env.NEXT_PUBLIC_POSTHOG_REPORT_DEV === "1" ||
  process.env.NEXT_PUBLIC_POSTHOG_REPORT_DEV === "true";

// Exclude Vercel preview/branch deploys from analytics. vercel.json forces
// NODE_ENV=production for ALL deployments (incl. previews), so the NODE_ENV
// gate alone would send preview/test traffic into the production PostHog
// project. NEXT_PUBLIC_VERCEL_ENV is baked in via next.config.ts.
const isPreviewDeploy = process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";

if (posthogKey && !isPreviewDeploy && (process.env.NODE_ENV === "production" || posthogInDev)) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    // App Router pageviews are tracked manually via PostHogPageviewTracker;
    // PostHog's auto pageview only fires on full-page loads, not client-side navigations.
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    // Create profiles for anonymous visitors too; identify() upgrades them when users sign in.
    person_profiles: "always",
    // Feed uncaught exceptions to PostHog Error Tracking (self-driving crash signal).
    // Duplicates Sentry on purpose: Sentry stays authoritative; PostHog just needs the signal
    // to tie crashes to sessions/users. Must also be enabled in PostHog UI → Error Tracking.
    capture_exceptions: true,
  });
}

Sentry.init({
  dsn,

  enabled:
    !!dsn && (process.env.NODE_ENV === "production" || reportInDev),

  sendDefaultPii: true,

  // 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  enableLogs: true,

  /**
   * Session Replay is intentionally disabled: it ships a large client bundle and records DOM
   * continuously on sampled sessions, which noticeably hurts main-thread time and LCP/INP.
   * Errors and traces still report via this SDK; re-enable replayIntegration only if you need replays.
   */
});

// Hook into App Router navigation transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
