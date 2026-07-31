/**
 * Sync-source health evaluation — turns the `ky_sources` snapshot into an
 * actionable verdict.
 *
 * `ky_sources` has always been written by every sync and read by nobody: the
 * health check ran `select('source_name').limit(1)` and threw the row away, so a
 * source sitting in `error`, or stuck in `running` for weeks, still answered
 * `{ ok: true }`. This module supplies the missing half — a per-source freshness
 * SLO plus status/liveness rules — so a pipeline that stops producing data is
 * detected rather than merely recorded.
 *
 * Deliberately pure: {@link evaluateSourceHealth} takes rows + a clock and
 * returns breaches. The DB read and the Slack escalation live in the callers.
 */
import { supabaseAdmin } from '../app/lib/supabaseAdminCore';

/** A source's expected cadence, derived from the job that actually runs it. */
export interface SourceExpectation {
  /** Where the job lives, for the breach message. */
  scheduler: string;
  /** Cron expression, mirrored from vercel.json / .github/workflows. */
  schedule: string;
  /**
   * How stale `last_sync_at` may get before it is a breach. Set to ~1.5× the
   * nominal interval so a single missed run is tolerated but a stopped
   * pipeline is not.
   */
  maxAgeHours: number;
  /**
   * How long the source may keep succeeding while yielding nothing before that
   * counts as stalled.
   *
   * Opt-in, and deliberately so. A zero yield is perfectly normal for
   * change-gated syncs (bills, votes) and during quiet interim weeks, so a
   * budget is declared only where a prolonged zero is genuinely suspicious.
   * Omit to skip the check for a source.
   */
  maxZeroYieldHours?: number;
}

/**
 * Sources with a live scheduled job. Anything absent from this map is not
 * monitored — see {@link UNMONITORED_SOURCES}.
 *
 * Keep in sync with `vercel.json` → `crons` and `.github/workflows/*.yml`.
 */
export const MONITORED_SOURCES: Record<string, SourceExpectation> = {
  // bills / votes are change-hash gated and legitimately sync 0 items for weeks
  // during interim, so they carry no zero-yield budget.
  bills: { scheduler: 'Vercel cron', schedule: '0 5 * * *', maxAgeHours: 36 },
  legislators: {
    scheduler: 'Vercel cron',
    schedule: '0 6 * * *',
    maxAgeHours: 36,
    // Upserts the full ~141-member roster every run; a zero means the Open
    // States fetch returned nothing.
    maxZeroYieldHours: 24 * 7,
  },
  votes: { scheduler: 'Vercel cron', schedule: '15 6 * * *', maxAgeHours: 36 },
  'lrc-committee-materials': {
    scheduler: 'Vercel cron',
    schedule: '30 13 * * *',
    maxAgeHours: 36,
    // Re-upserts every document it finds, so a healthy run is in the hundreds.
    maxZeroYieldHours: 24 * 14,
  },
  'lrc-enrollment-actions': { scheduler: 'Vercel cron', schedule: '45 14 * * *', maxAgeHours: 36 },
  'lrc-popular-names': { scheduler: 'Vercel cron', schedule: '30 15 * * 0', maxAgeHours: 240 },
  'lrc-calendar': {
    scheduler: 'GitHub Actions sync-lrc-calendar.yml',
    schedule: '0 12,18 * * *',
    maxAgeHours: 30,
    // Interim gaps between committee meeting clusters run ~2 weeks; three weeks
    // of nothing means the live calendar stopped yielding. The sync's own
    // day-heading assertion catches an outright parse break far sooner — this
    // is the backstop for a subtler stall.
    maxZeroYieldHours: 24 * 21,
  },
  dataset: {
    scheduler: 'GitHub Actions legiscan-dataset-weekly.yml',
    schedule: '0 8 * * 0',
    maxAgeHours: 240,
  },
};

/**
 * Sources that still carry `ky_sources` rows but have no scheduled job today.
 * Listed explicitly (rather than ignored by omission) so an unrecognized source
 * name is reported as unknown instead of silently passing.
 *
 * Local-government sources were paused from cron 2026-05-18
 * (`SYNC_SOURCES_PAUSED_FROM_CRON`); `executive-orders` was never wired into
 * `SYNC_SOURCES`; `legislator-bios` is manual-only.
 */
export const UNMONITORED_SOURCES: Record<string, string> = {
  ordinances: 'paused from cron 2026-05-18; manual sync only',
  'ordinances-louisville': 'paused from cron 2026-05-18; manual sync only',
  'ordinances-lexington': 'paused from cron 2026-05-18; manual sync only',
  'school-boards': 'paused from cron 2026-05-18; manual sync only',
  'county-actions': 'paused from cron 2026-05-18; manual sync only',
  'executive-orders': 'not wired into SYNC_SOURCES (unreliable listing URL)',
  'legislator-bios': 'manual only (npm run sync:ky:legislator-bios)',
};

/**
 * A `running` row older than this is a crashed sync, not an in-flight one.
 * `updateSourceStatus` writes `running` before the work and overwrites it after;
 * a row that never advanced means the process died mid-run.
 */
const STUCK_RUNNING_HOURS = 6;

export type BreachKind = 'missing' | 'error' | 'stuck_running' | 'stale' | 'stalled';

export interface SourceBreach {
  source: string;
  kind: BreachKind;
  message: string;
  ageHours: number | null;
}

export interface SourceRow {
  source_name: string;
  status: string | null;
  last_sync_at: string | null;
  items_synced: number | null;
  error_message: string | null;
  /** Migration 047; null on rows written before it was applied. */
  last_nonzero_sync_at?: string | null;
  consecutive_zero_syncs?: number | null;
}

export interface SourceHealth {
  breaches: SourceBreach[];
  /** Source names present in `ky_sources` but in neither registry. */
  unknownSources: string[];
  checked: number;
  /** Stable fingerprint of the breach set, for edge-triggered alerting. */
  fingerprint: string;
}

function hoursBetween(fromIso: string | null, now: Date): number | null {
  if (!fromIso) return null;
  const then = Date.parse(fromIso);
  if (!Number.isFinite(then)) return null;
  return (now.getTime() - then) / 3_600_000;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Evaluate every monitored source against its expectation.
 *
 * Order matters: a source in `error` is reported as an error even when it is
 * also stale, so the breach names the cause rather than the symptom.
 */
export function evaluateSourceHealth(rows: SourceRow[], now: Date = new Date()): SourceHealth {
  const byName = new Map<string, SourceRow>();
  for (const r of rows) byName.set(r.source_name, r);

  const breaches: SourceBreach[] = [];

  for (const [source, expect] of Object.entries(MONITORED_SOURCES)) {
    const row = byName.get(source);
    if (!row) {
      breaches.push({
        source,
        kind: 'missing',
        ageHours: null,
        message: `no ky_sources row — ${expect.scheduler} (${expect.schedule}) has never recorded a run`,
      });
      continue;
    }

    const ageHours = hoursBetween(row.last_sync_at, now);

    if (row.status === 'error') {
      breaches.push({
        source,
        kind: 'error',
        ageHours,
        message: `last run failed: ${row.error_message ?? 'no error message recorded'}`,
      });
      continue;
    }

    if (row.status === 'running' && ageHours != null && ageHours > STUCK_RUNNING_HOURS) {
      breaches.push({
        source,
        kind: 'stuck_running',
        ageHours,
        message: `stuck in "running" for ${round1(ageHours)}h — the sync process died mid-run`,
      });
      continue;
    }

    if (ageHours == null) {
      breaches.push({
        source,
        kind: 'stale',
        ageHours: null,
        message: `last_sync_at is null — ${expect.scheduler} (${expect.schedule}) has never completed a run`,
      });
      continue;
    }

    if (ageHours > expect.maxAgeHours) {
      breaches.push({
        source,
        kind: 'stale',
        ageHours,
        message: `last synced ${round1(ageHours)}h ago, over the ${expect.maxAgeHours}h budget for ${expect.scheduler} (${expect.schedule})`,
      });
      continue;
    }

    // Running on schedule but producing nothing. `status` cannot express this:
    // the runs succeed, `last_sync_at` advances, and only the yield is missing.
    if (expect.maxZeroYieldHours != null) {
      // Fall back to last_sync_at when the column is null — either migration 047
      // has not been applied, or the source has never yielded. Both mean "no
      // observed yield", and dating it from the last run avoids alerting on
      // history we never recorded.
      const yieldAgeHours =
        hoursBetween(row.last_nonzero_sync_at ?? null, now) ??
        (row.items_synced && row.items_synced > 0 ? 0 : ageHours);

      if (yieldAgeHours > expect.maxZeroYieldHours) {
        const streak = row.consecutive_zero_syncs ?? 0;
        breaches.push({
          source,
          kind: 'stalled',
          ageHours: yieldAgeHours,
          message:
            `running on schedule but has synced 0 items for ${round1(yieldAgeHours)}h ` +
            `(budget ${expect.maxZeroYieldHours}h${streak > 0 ? `, ${streak} consecutive empty runs` : ''}) — ` +
            'the job succeeds but the pipeline is not producing data',
        });
      }
    }
  }

  const unknownSources = rows
    .map((r) => r.source_name)
    .filter((n) => !(n in MONITORED_SOURCES) && !(n in UNMONITORED_SOURCES))
    .sort();

  // Fingerprint on (source, kind) only — not on the age, which changes every
  // run and would defeat the edge trigger.
  const fingerprint = breaches
    .map((b) => `${b.source}:${b.kind}`)
    .sort()
    .join(',');

  return {
    breaches,
    unknownSources,
    checked: Object.keys(MONITORED_SOURCES).length,
    fingerprint,
  };
}

/** Columns that exist regardless of whether migration 047 has been applied. */
const BASE_SOURCE_COLUMNS = 'source_name, status, last_sync_at, items_synced, error_message';
/** Yield-tracking columns added by migration 047. */
const YIELD_SOURCE_COLUMNS = 'last_nonzero_sync_at, consecutive_zero_syncs';

/**
 * Read the `ky_sources` snapshot. Throws on query failure so callers can 503.
 *
 * Falls back to the pre-047 column set when the yield columns are absent, so the
 * health check keeps working if this deploys ahead of the migration. Without the
 * fallback a missing column would surface as "Supabase query failed" — a false
 * infrastructure alarm, and the same class of bug that left /admin/sync-status
 * silently empty.
 */
export async function fetchSourceRows(): Promise<SourceRow[]> {
  if (!supabaseAdmin) throw new Error('Supabase admin client not initialized');

  const full = await supabaseAdmin
    .from('ky_sources')
    .select(`${BASE_SOURCE_COLUMNS}, ${YIELD_SOURCE_COLUMNS}`);
  if (!full.error) return (full.data ?? []) as SourceRow[];

  const base = await supabaseAdmin.from('ky_sources').select(BASE_SOURCE_COLUMNS);
  if (base.error) throw new Error(base.error.message);
  console.warn(
    '[source-health] yield-tracking columns unavailable (migration 047 not applied?); ' +
      'stalled-pipeline checks are inactive',
  );
  return (base.data ?? []) as SourceRow[];
}

/** Multi-line Slack/console body describing the breaches. */
export function formatSourceHealth(health: SourceHealth): string {
  if (health.breaches.length === 0) {
    return `All ${health.checked} monitored sync sources are fresh.`;
  }
  const lines = health.breaches.map((b) => `• \`${b.source}\` — ${b.kind}: ${b.message}`);
  if (health.unknownSources.length > 0) {
    lines.push(`_unregistered sources present: ${health.unknownSources.join(', ')}_`);
  }
  return [
    `${health.breaches.length} of ${health.checked} monitored sync sources are unhealthy:`,
    ...lines,
  ].join('\n');
}

const HEALTH_ALERT_STATE_KEY = 'source_health_alert_state';

async function readHealthAlertFingerprint(): Promise<string | null> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from('ky_sync_state')
    .select('payload')
    .eq('key', HEALTH_ALERT_STATE_KEY)
    .maybeSingle();
  const payload = data?.payload as { fingerprint?: unknown } | null;
  return typeof payload?.fingerprint === 'string' ? payload.fingerprint : null;
}

async function writeHealthAlertFingerprint(fingerprint: string): Promise<void> {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from('ky_sync_state').upsert(
    {
      key: HEALTH_ALERT_STATE_KEY,
      payload: { fingerprint, updated_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );
}

/**
 * True when this breach set differs from the one we last alerted on.
 *
 * The health check runs daily; a source that stays broken for a week should page
 * once, not seven times. Edge-triggering mirrors the LegiScan quota bands
 * (`slack-webhook.ts` § `maybeAlertLegiscanQuotaHigh`). Recovery flips the
 * fingerprint to empty, so the next breach re-alerts.
 */
export async function shouldAlertOnHealth(health: SourceHealth): Promise<boolean> {
  try {
    const last = await readHealthAlertFingerprint();
    if (last === health.fingerprint) return false;
    await writeHealthAlertFingerprint(health.fingerprint);
    return health.breaches.length > 0;
  } catch {
    // Alert hygiene is best-effort; a state-store failure must not suppress a
    // real breach.
    return health.breaches.length > 0;
  }
}
