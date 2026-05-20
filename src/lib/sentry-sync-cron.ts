import * as Sentry from "@sentry/nextjs";

/**
 * Schedules must stay in sync with `vercel.json` → `crons`.
 * Vercel Cron hits App Router handlers; Sentry's automaticVercelMonitors
 * does not cover that yet, so we register check-ins here.
 */
const VERCEL_SYNC_CRON_MONITORS: Record<
  string,
  {
    schedule: { type: "crontab"; value: string };
    maxRuntime: number;
    checkinMargin: number;
  }
> = {
  bills: {
    schedule: { type: "crontab", value: "0 5 * * *" },
    maxRuntime: 8,
    checkinMargin: 5,
  },
  legislators: {
    schedule: { type: "crontab", value: "0 6 * * *" },
    maxRuntime: 8,
    checkinMargin: 5,
  },
  votes: {
    schedule: { type: "crontab", value: "15 6 * * *" },
    maxRuntime: 8,
    checkinMargin: 5,
  },
  "lrc-calendar": {
    schedule: { type: "crontab", value: "0 12,18 * * *" },
    maxRuntime: 5,
    checkinMargin: 5,
  },
  // Local-government crons paused 2026-05-18 — see docs/specs/committee-calendar.md
};

function monitorSlugForSource(source: string): string {
  return `vercel-cron-sync-${source.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}`;
}

/** Wrap sync work when `source` matches a Vercel cron job (including manual runs with that source). */
export async function withVercelSyncCronMonitor<T>(
  source: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  if (!source) return fn();
  const spec = VERCEL_SYNC_CRON_MONITORS[source];
  if (!spec) return fn();

  return Sentry.withMonitor(monitorSlugForSource(source), fn, {
    schedule: spec.schedule,
    maxRuntime: spec.maxRuntime,
    checkinMargin: spec.checkinMargin,
    timezone: "UTC",
  });
}
