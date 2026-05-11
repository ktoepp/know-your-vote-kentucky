import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

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
