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
  // `lrc-calendar` intentionally has NO monitor: that job moved off Vercel Cron to
  // GitHub Actions (.github/workflows/sync-lrc-calendar.yml), so a monitor here
  // would never receive a check-in and would fire missed-check-in alerts forever.
  // If a `vercel-cron-sync-lrc-calendar` monitor still exists in Sentry, delete it there.
  "lrc-committee-materials": {
    schedule: { type: "crontab", value: "30 13 * * *" },
    maxRuntime: 8,
    checkinMargin: 5,
  },
  "lrc-enrollment-actions": {
    schedule: { type: "crontab", value: "45 14 * * *" },
    maxRuntime: 8,
    checkinMargin: 5,
  },
  "lrc-popular-names": {
    // Weekly (Sundays) — a wider margin because a single missed Sunday is the
    // whole week's signal and we'd rather not page on a few minutes of drift.
    schedule: { type: "crontab", value: "30 15 * * 0" },
    maxRuntime: 8,
    checkinMargin: 15,
  },
  // Local-government crons paused 2026-05-18 — see docs/specs/committee-calendar.md
  //
  // NOT covered here: /api/cron/health-check, /api/cron/notify and
  // /api/cron/notify-signups. This map is keyed by `?source=` and is only consulted
  // by withVercelSyncCronMonitor on the sync routes — those three are standalone
  // handlers with no source, so they need their own Sentry check-ins, not an entry here.
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
