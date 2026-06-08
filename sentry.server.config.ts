// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

/** Dev sends noisy events (e.g. ENOENT under the local repo from Next / HMR). Opt in with SENTRY_REPORT_DEV. */
const reportInDev =
  process.env.SENTRY_REPORT_DEV === "1" ||
  process.env.SENTRY_REPORT_DEV === "true";

Sentry.init({
  dsn,
  enabled: !!dsn && (process.env.NODE_ENV === "production" || reportInDev),

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
