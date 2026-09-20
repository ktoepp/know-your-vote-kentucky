#!/usr/bin/env npx tsx
/**
 * Backfill committee meetings from Internet Archive snapshots of the LRC weekly calendar.
 *
 * The live calendar only shows the current week (~5 days). Wayback captured distinct
 * weekly HTML versions since session start — use those to populate historical meetings.
 *
 *   npm run backfill:lrc:calendar              # 2026 session start → today
 *   npm run backfill:lrc:calendar -- --dry-run
 *   npm run backfill:lrc:calendar -- --from=2026-01-06 --to=2026-04-15
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL (via scripts/load-env.ts)
 */
import './load-env';
import axios from 'axios';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { parseLegislativeCalendarHtml } from '../src/lib/lrc-legislative-calendar-parser';
import {
  LRC_LEGISLATIVE_CALENDAR_URL,
  scheduledMeetingsFromParsed,
  upsertLrcCalendarMeetings,
} from '../src/lib/ky-lrc-calendar-sync';
import { KY_SESSIONS } from '../src/lib/ky-sessions';

const CDX_URL = 'https://web.archive.org/cdx/search/cdx';
const LIVE_CALENDAR = LRC_LEGISLATIVE_CALENDAR_URL;

function argFlag(name: string): boolean {
  return process.argv.includes(name);
}

function argValue(prefix: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit?.slice(prefix.length + 1);
}

function isoToCdx(iso: string): string {
  return iso.replace(/-/g, '').slice(0, 8);
}

function waybackRawUrl(timestamp: string): string {
  return `https://web.archive.org/web/${timestamp}id_/${LIVE_CALENDAR}`;
}

type CdxRow = string[];

/**
 * Marker error thrown when every retry against web.archive.org fails with a
 * network-level error (ECONNREFUSED, DNS failure, socket hang up, timeout, or
 * an axios error carrying no HTTP response). Wayback has recurring hours-long
 * outages that we cannot page on, so `main()` catches this and exits 0.
 */
class WaybackOutageError extends Error {
  constructor(cause: unknown) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    super(`Wayback Machine unreachable: ${msg}`);
    this.name = 'WaybackOutageError';
  }
}

function isWaybackNetworkError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const anyErr = err as { code?: string; response?: unknown; message?: string; cause?: { code?: string } };
  if (anyErr.response) return false;
  const code = anyErr.code ?? anyErr.cause?.code ?? '';
  if (['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNABORTED'].includes(code)) {
    return true;
  }
  return /\b(?:timeout|timed?\s*out|socket hang up|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN)\b/i.test(
    anyErr.message ?? '',
  );
}

async function listWaybackSnapshots(fromIso: string, toIso: string): Promise<string[]> {
  const params = new URLSearchParams({
    url: 'apps.legislature.ky.gov/legislativecalendar',
    from: isoToCdx(fromIso),
    to: isoToCdx(toIso),
    output: 'json',
    filter: 'statuscode:200',
    collapse: 'digest',
    limit: '200',
  });

  const requestUrl = `${CDX_URL}?${params}`;
  const requestOpts = {
    timeout: 120_000,
    headers: { 'User-Agent': 'KnowYourVoteKentucky/1.0 (+https://kyvky.com; lrc-calendar-backfill)' },
  };

  // Exponential backoff over ~5 minutes: 10s, 30s, 90s. Wayback's typical blips
  // resolve inside that window; a persistent outage still throws and is caught
  // in main() as WaybackOutageError.
  const backoffs = [10_000, 30_000, 90_000];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= backoffs.length; attempt++) {
    try {
      const res = await axios.get<CdxRow[]>(requestUrl, requestOpts);
      return extractCdxTimestamps(res.data);
    } catch (err) {
      lastErr = err;
      if (attempt >= backoffs.length) break;
      const jitter = Math.floor(Math.random() * 5_000);
      const waitMs = backoffs[attempt]! + jitter;
      console.warn(
        `Wayback CDX list failed (${(err as Error).message}); retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt + 2}/${backoffs.length + 1})…`,
      );
      await sleep(waitMs);
    }
  }
  if (isWaybackNetworkError(lastErr)) throw new WaybackOutageError(lastErr);
  throw lastErr;
}

function extractCdxTimestamps(rows: CdxRow[] | undefined): string[] {
  if (!rows?.length || rows.length < 2) return [];

  const timestamps: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const ts = rows[i]![1];
    if (ts) timestamps.push(ts);
  }
  return timestamps.sort();
}

async function fetchWaybackHtml(timestamp: string): Promise<string> {
  const res = await axios.get<string>(waybackRawUrl(timestamp), {
    timeout: 90_000,
    responseType: 'text',
    headers: { 'User-Agent': 'KnowYourVoteKentucky/1.0 (+https://kyvky.com; lrc-calendar-backfill)' },
  });
  return res.data;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const dryRun = argFlag('--dry-run');
  const recordHearingEvents = argFlag('--record-hearing-events');
  const delayMs = parseInt(argValue('--delay-ms') ?? '2000', 10);

  const session2026 = KY_SESSIONS.find((s) => s.name === '2026 Regular Session');
  const fromIso = argValue('--from') ?? session2026?.start ?? '2026-01-06';
  const toIso = argValue('--to') ?? new Date().toISOString().slice(0, 10);

  console.log(`LRC calendar Wayback backfill: ${fromIso} → ${toIso}${dryRun ? ' (dry run)' : ''}`);
  console.log('Listing Internet Archive snapshots (collapsed by content digest)…');

  const timestamps = await listWaybackSnapshots(fromIso, toIso);
  if (!timestamps.length) {
    console.error('No Wayback snapshots found for this range.');
    process.exit(1);
  }

  console.log(`Found ${timestamps.length} unique calendar captures.`);

  if (!supabaseAdmin && !dryRun) {
    console.error('supabaseAdmin not configured (SUPABASE_SERVICE_ROLE_KEY).');
    process.exit(1);
  }

  let totalMeetingsParsed = 0;
  let totalMeetingsUpserted = 0;
  let totalAgenda = 0;
  let totalErrors = 0;
  let networkSkipped = 0;

  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i]!;
    const label = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
    console.log(`\n[${i + 1}/${timestamps.length}] Snapshot ${label} (${ts})`);

    let html: string;
    try {
      html = await fetchWaybackHtml(ts);
    } catch (err) {
      // Per-snapshot resilience: a network blip on one capture must not kill
      // the whole run mid-way. Count it, warn, continue. If EVERY capture
      // fails this way, it's a Wayback outage — surface it as such below.
      if (isWaybackNetworkError(err)) {
        networkSkipped++;
        console.warn(`  Skipping capture ${label}: ${(err as Error).message}`);
        if (i < timestamps.length - 1 && delayMs > 0) await sleep(delayMs);
        continue;
      }
      throw err;
    }
    const parsed = parseLegislativeCalendarHtml(html);
    const scheduled = scheduledMeetingsFromParsed(parsed);

    totalMeetingsParsed += scheduled.length;
    console.log(
      `  Parsed ${parsed.stats.dayCount} day(s), ${scheduled.length} meeting(s), ${parsed.stats.agendaItemCount} agenda line(s)`,
    );

    if (dryRun) {
      for (const m of scheduled.slice(0, 8)) {
        console.log(`    · ${m.meetingDate} ${m.committee.name.slice(0, 56)}`);
      }
      if (scheduled.length > 8) console.log(`    … and ${scheduled.length - 8} more`);
    } else {
      const stats = await upsertLrcCalendarMeetings(supabaseAdmin!, scheduled, {
        skipHearingEvents: !recordHearingEvents,
        sourceUrl: waybackRawUrl(ts),
      });
      totalMeetingsUpserted += stats.meetingsSynced;
      totalAgenda += stats.agendaSynced;
      totalErrors += stats.errors;
      console.log(
        `  Upserted ${stats.meetingsSynced} meeting(s), ${stats.agendaSynced} agenda line(s)${stats.errors > 0 ? ` — ${stats.errors} write error(s)` : ''}`,
      );
    }

    if (i < timestamps.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  // Every capture failed with a network error → Wayback is out. Surface as
  // outage so main().catch treats it uniformly with the CDX-listing failure.
  if (networkSkipped > 0 && networkSkipped === timestamps.length) {
    throw new WaybackOutageError(
      new Error(`all ${timestamps.length} snapshot fetches failed with network errors`),
    );
  }

  console.log('\n--- Summary ---');
  console.log(`Snapshots processed: ${timestamps.length - networkSkipped}/${timestamps.length}`);
  if (networkSkipped > 0) {
    console.log(`Snapshots skipped (Wayback network error): ${networkSkipped}`);
  }
  console.log(`Meetings parsed (may include duplicates across weeks): ${totalMeetingsParsed}`);
  if (!dryRun) {
    console.log(`Meetings upserted: ${totalMeetingsUpserted}`);
    console.log(`Agenda lines inserted: ${totalAgenda}`);
    if (totalErrors > 0) console.log(`Row-level write errors: ${totalErrors}`);
    console.log('Re-run `npm run sync:ky:lrc-calendar` to refresh the current week from LRC live.');
  }
}

main().catch((err) => {
  // A persistent Wayback Machine outage is not our bug to page on. Log the
  // condition clearly and exit 0 so the weekly workflow does not fire the
  // Slack error path. The next scheduled run picks up whatever the previous
  // run would have covered (the range is derived from the session start).
  if (err instanceof WaybackOutageError) {
    console.warn(`[wayback-backfill] Skipped: ${err.message}`);
    console.warn('[wayback-backfill] Upstream outage on web.archive.org. Next scheduled run will retry.');
    process.exit(0);
  }
  console.error(err);
  process.exit(1);
});
