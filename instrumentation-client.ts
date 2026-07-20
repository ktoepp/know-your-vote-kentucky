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

/**
 * Benign "view transition skipped" browser noise.
 *
 * When react-dom / the browser starts a View Transition during a navigation and
 * the tab is hidden (backgrounded) or being unloaded before the transition can
 * run, the browser aborts it with a DOMException (InvalidStateError). This is
 * expected behavior — the user isn't looking at the page and nothing is actually
 * broken — but the resulting unhandled rejection is picked up by PostHog Error
 * Tracking (capture_exceptions) and by Sentry, creating a non-actionable "new
 * issue" that pages us in Slack.
 *
 * Chromium surfaces two different messages for the same condition:
 *   - spec-compliant: "Skipping view transition because document visibility state has become hidden."
 *   - generic:        "Transition was aborted because of invalid state."
 * (see https://github.com/facebook/react/issues/34098)
 *
 * We drop both from our telemetry. This message only ever fires while the tab is
 * hidden, so suppressing it cannot mask a bug a user could actually observe.
 */
const BENIGN_VIEW_TRANSITION_ERROR =
  /Skipping view transition because document visibility|view transition was skipped because document visibility|Transition was aborted because of invalid state/i;

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
    // Drop benign view-transition-skipped noise (see BENIGN_VIEW_TRANSITION_ERROR).
    before_send: (event) => {
      if (event?.event === "$exception") {
        const exceptions = (event.properties?.["$exception_list"] as
          | Array<{ type?: string; value?: string }>
          | undefined) ?? [];
        const topLevelMessage = String(event.properties?.["$exception_message"] ?? "");
        const isBenign =
          BENIGN_VIEW_TRANSITION_ERROR.test(topLevelMessage) ||
          exceptions.some(
            (ex) =>
              BENIGN_VIEW_TRANSITION_ERROR.test(ex?.value ?? "") ||
              BENIGN_VIEW_TRANSITION_ERROR.test(ex?.type ?? ""),
          );
        if (isBenign) return null;
      }
      return event;
    },
  });
}

/**
 * Sentry is dynamically imported so the SDK (~130 kB gz) moves off the shared
 * chunk and loads after LCP. The prior `import * as Sentry from "@sentry/nextjs"`
 * put the whole SDK on every route's First Load JS even though `Sentry.init` was
 * already deferred to `requestIdleCallback`.
 */

type CaptureRouterTransitionStart = (href: string, navigationType: string) => void;

let realCaptureRouterTransitionStart: CaptureRouterTransitionStart | null = null;
const pendingRouterTransitions: Array<[string, string]> = [];
const MAX_BUFFERED_TRANSITIONS = 32;

async function loadAndInitSentry() {
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn,

      enabled:
        !!dsn && (process.env.NODE_ENV === "production" || reportInDev),

      // Benign view-transition-skipped noise (see BENIGN_VIEW_TRANSITION_ERROR).
      // Same rationale as PostHog's before_send above: it only fires on hidden
      // tabs, so it's non-actionable and shouldn't open a Sentry issue.
      ignoreErrors: [BENIGN_VIEW_TRANSITION_ERROR],

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
    realCaptureRouterTransitionStart = Sentry.captureRouterTransitionStart;
    for (const [href, navType] of pendingRouterTransitions) {
      try {
        realCaptureRouterTransitionStart(href, navType);
      } catch {
        // Swallow — flushing a buffered nav event should never break the page.
      }
    }
    pendingRouterTransitions.length = 0;
  } catch {
    // SDK failed to load (network hiccup, ad-blocker). Browser default error
    // handling still runs; we just lose Sentry telemetry for this session.
  }
}

/**
 * Defer Sentry off the critical path. The mobile PSI trace previously showed a
 * ~1.17s `sentry-tracing-init` user-timing mark — biggest single contributor to
 * the 3.2s main-thread total. Deferring loses errors thrown in the first
 * ~1–2s of load; the browser still logs them, and users almost never trip
 * first-second bugs.
 *
 * In dev we init immediately so devs see errors right away.
 */
if (typeof window !== "undefined") {
  if (process.env.NODE_ENV !== "production") {
    void loadAndInitSentry();
  } else {
    const w: Window & { requestIdleCallback?: typeof requestIdleCallback } = window;
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(() => void loadAndInitSentry(), { timeout: 5000 });
    } else if (document.readyState === "complete") {
      // Safari <= 17-ish has no requestIdleCallback; run after `load` so we're
      // definitely past LCP.
      setTimeout(() => void loadAndInitSentry(), 2000);
    } else {
      w.addEventListener(
        "load",
        () => setTimeout(() => void loadAndInitSentry(), 2000),
        { once: true },
      );
    }
  }
}

/**
 * Next's App Router calls this on every client-side navigation. Exported
 * synchronously — required by the router hook contract — so it acts as a proxy
 * that buffers events until the real Sentry handler resolves. Buffer is capped
 * so a stuck idle callback can't leak memory.
 */
export const onRouterTransitionStart: CaptureRouterTransitionStart = (href, navigationType) => {
  if (realCaptureRouterTransitionStart) {
    realCaptureRouterTransitionStart(href, navigationType);
    return;
  }
  if (pendingRouterTransitions.length < MAX_BUFFERED_TRANSITIONS) {
    pendingRouterTransitions.push([href, navigationType]);
  }
};
