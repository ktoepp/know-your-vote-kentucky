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

  let res;
  try {
    res = await axios.get<CdxRow[]>(requestUrl, requestOpts);
  } catch (err) {
    const backoffMs = 5_000 + Math.floor(Math.random() * 5_000);
    console.warn(`Wayback CDX list failed (${(err as Error).message}); retrying once in ${backoffMs}ms…`);
    await sleep(backoffMs);
    res = await axios.get<CdxRow[]>(requestUrl, requestOpts);
  }

  const rows = res.data;
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

  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i]!;
    const label = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
    console.log(`\n[${i + 1}/${timestamps.length}] Snapshot ${label} (${ts})`);

    const html = await fetchWaybackHtml(ts);
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
      console.log(
        `  Upserted ${stats.meetingsSynced} meeting(s), ${stats.agendaSynced} agenda line(s)`,
      );
    }

    if (i < timestamps.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Snapshots processed: ${timestamps.length}`);
  console.log(`Meetings parsed (may include duplicates across weeks): ${totalMeetingsParsed}`);
  if (!dryRun) {
    console.log(`Meetings upserted: ${totalMeetingsUpserted}`);
    console.log(`Agenda lines inserted: ${totalAgenda}`);
    console.log('Re-run `npm run sync:ky:lrc-calendar` to refresh the current week from LRC live.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
