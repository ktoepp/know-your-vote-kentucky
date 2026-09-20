#!/usr/bin/env npx tsx
/**
 * Repair committee meetings whose `agenda_content_hash` was written but whose
 * `ky_committee_agenda_items` rows are missing — historical damage from before
 * migration 050 made the delete+insert transactional.
 *
 * Strategy:
 *   1. Query every meeting where agenda_content_hash is set, the hash is not
 *      the empty-string sentinel, no agenda_items rows exist, and
 *      agenda_recovery_status is NULL (untriaged).
 *   2. Group by the ISO week containing meeting_date. The LRC weekly calendar
 *      HTML shows the whole week, so one Wayback snapshot repairs every
 *      affected meeting in that week.
 *   3. For each week: list Wayback snapshots via CDX, fetch each in turn, and
 *      pass the scheduled meetings to `upsertLrcCalendarMeetings`. The
 *      post-050 sync path uses the transactional RPC, so a failed insert
 *      cannot re-create the silent-loss state.
 *   4. Any affected meeting still without agenda items after every week has
 *      been tried gets `agenda_recovery_status = 'wayback_unavailable'`, so
 *      the audit stops flagging it.
 *
 * Usage:
 *   npx tsx scripts/repair-missing-agenda-items.ts              # full run
 *   npx tsx scripts/repair-missing-agenda-items.ts --dry-run    # no writes
 *   npx tsx scripts/repair-missing-agenda-items.ts --limit=10   # first 10 affected meetings
 *   npx tsx scripts/repair-missing-agenda-items.ts --mark-unavailable-only
 *                                                               # skip Wayback, mark every
 *                                                               # affected meeting as
 *                                                               # 'wayback_unavailable'
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL (via load-env).
 */
import './load-env';
import axios from 'axios';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { parseLegislativeCalendarHtml } from '../src/lib/lrc-legislative-calendar-parser';
import {
  EMPTY_AGENDA_HASH,
  LRC_LEGISLATIVE_CALENDAR_URL,
  scheduledMeetingsFromParsed,
  upsertLrcCalendarMeetings,
} from '../src/lib/ky-lrc-calendar-sync';

const CDX_URL = 'https://web.archive.org/cdx/search/cdx';
const WAYBACK_HTTP_HEADERS = {
  'User-Agent': 'KnowYourVoteKentucky/1.0 (+https://kyvky.com; agenda-items-repair)',
};

function argFlag(name: string): boolean {
  return process.argv.includes(name);
}
function argValue(prefix: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`${prefix}=`))?.slice(prefix.length + 1);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** ISO-8601 week key (Monday-based) for grouping. Two dates in the same
 *  Monday-Sunday window share the same key, matching how LRC publishes the
 *  weekly calendar HTML. */
function isoWeekKey(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sun
  const monday = new Date(d);
  const offset = day === 0 ? -6 : 1 - day;
  monday.setUTCDate(d.getUTCDate() + offset);
  return monday.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isoToCdx(iso: string): string {
  return iso.replace(/-/g, '').slice(0, 8);
}

function waybackRawUrl(timestamp: string): string {
  return `https://web.archive.org/web/${timestamp}id_/${LRC_LEGISLATIVE_CALENDAR_URL}`;
}

interface AffectedMeeting {
  id: string;
  meeting_date: string;
  committee_id: string;
  committee_lrc_rsn: number | null;
  committee_type: string | null;
  committee_name: string;
}

async function loadAffectedMeetings(limit: number | null): Promise<AffectedMeeting[]> {
  if (!supabaseAdmin) throw new Error('supabaseAdmin not configured');
  // Two-phase: (1) meetings with non-empty hash and no recovery status,
  // (2) drop those that already have agenda_items rows. Doing this in one
  // query with a NOT EXISTS via PostgREST is awkward, so we filter in JS.
  const pageSize = 1000;
  const affected: AffectedMeeting[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from('ky_committee_meetings')
      .select(
        'id, meeting_date, committee_id, agenda_content_hash, agenda_recovery_status, ky_committees ( lrc_rsn, committee_type, name )',
      )
      .not('agenda_content_hash', 'is', null)
      .neq('agenda_content_hash', EMPTY_AGENDA_HASH)
      .is('agenda_recovery_status', null)
      .order('meeting_date', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`meetings query failed: ${error.message}`);
    const rows = data ?? [];
    if (rows.length === 0) break;

    const ids = rows.map((r) => r.id as string);
    const { data: agendaCounts, error: aErr } = await supabaseAdmin
      .from('ky_committee_agenda_items')
      .select('meeting_id')
      .in('meeting_id', ids);
    if (aErr) throw new Error(`agenda rows query failed: ${aErr.message}`);
    const withItems = new Set((agendaCounts ?? []).map((r) => r.meeting_id as string));

    for (const r of rows) {
      if (withItems.has(r.id as string)) continue;
      const c = r.ky_committees as
        | { lrc_rsn?: number; committee_type?: string; name?: string }
        | { lrc_rsn?: number; committee_type?: string; name?: string }[]
        | null;
      const cc = Array.isArray(c) ? c[0] : c;
      affected.push({
        id: r.id as string,
        meeting_date: r.meeting_date as string,
        committee_id: r.committee_id as string,
        committee_lrc_rsn: cc?.lrc_rsn ?? null,
        committee_type: cc?.committee_type ?? null,
        committee_name: cc?.name ?? '(unknown committee)',
      });
      if (limit != null && affected.length >= limit) return affected;
    }
    if (rows.length < pageSize) break;
  }
  return affected;
}

async function listWaybackSnapshots(fromIso: string, toIso: string): Promise<string[]> {
  const params = new URLSearchParams({
    url: 'apps.legislature.ky.gov/legislativecalendar',
    from: isoToCdx(fromIso),
    to: isoToCdx(toIso),
    output: 'json',
    filter: 'statuscode:200',
    collapse: 'digest',
    limit: '50',
  });
  const url = `${CDX_URL}?${params}`;
  const res = await axios.get<string[][]>(url, { timeout: 120_000, headers: WAYBACK_HTTP_HEADERS });
  const rows = res.data;
  if (!rows?.length || rows.length < 2) return [];
  const timestamps: string[] = [];
  for (let i = 1; i < rows.length; i++) if (rows[i]?.[1]) timestamps.push(rows[i]![1]!);
  return timestamps.sort();
}

async function fetchWaybackHtml(timestamp: string): Promise<string> {
  const res = await axios.get<string>(waybackRawUrl(timestamp), {
    timeout: 90_000,
    responseType: 'text',
    headers: WAYBACK_HTTP_HEADERS,
  });
  return res.data;
}

async function markAgendaRecoveryStatus(
  meetingIds: string[],
  status: string,
  dryRun: boolean,
): Promise<void> {
  if (!supabaseAdmin) throw new Error('supabaseAdmin not configured');
  if (meetingIds.length === 0) return;
  if (dryRun) {
    console.log(`  [dry-run] would set agenda_recovery_status='${status}' on ${meetingIds.length} meeting(s)`);
    return;
  }
  const { error } = await supabaseAdmin
    .from('ky_committee_meetings')
    .update({ agenda_recovery_status: status })
    .in('id', meetingIds);
  if (error) throw new Error(`update agenda_recovery_status failed: ${error.message}`);
}

async function stillMissing(meetingIds: string[]): Promise<Set<string>> {
  if (!supabaseAdmin) throw new Error('supabaseAdmin not configured');
  if (meetingIds.length === 0) return new Set();
  const { data, error } = await supabaseAdmin
    .from('ky_committee_agenda_items')
    .select('meeting_id')
    .in('meeting_id', meetingIds);
  if (error) throw new Error(`agenda re-check failed: ${error.message}`);
  const filled = new Set((data ?? []).map((r) => r.meeting_id as string));
  return new Set(meetingIds.filter((id) => !filled.has(id)));
}

async function main() {
  const dryRun = argFlag('--dry-run');
  const markOnly = argFlag('--mark-unavailable-only');
  const limit = argValue('--limit') ? parseInt(argValue('--limit')!, 10) : null;
  const delayMs = parseInt(argValue('--delay-ms') ?? '2000', 10);

  console.log(`agenda-items repair${dryRun ? ' (dry run)' : ''}${markOnly ? ' — mark-unavailable-only' : ''}`);

  if (!supabaseAdmin) {
    console.error('supabaseAdmin not configured (SUPABASE_SERVICE_ROLE_KEY).');
    process.exit(1);
  }

  const affected = await loadAffectedMeetings(limit);
  if (affected.length === 0) {
    console.log('No affected meetings found — nothing to repair.');
    return;
  }
  console.log(`Found ${affected.length} meeting(s) with agenda_content_hash but no agenda_items rows.`);

  // Escape hatch: skip Wayback entirely.
  if (markOnly) {
    await markAgendaRecoveryStatus(affected.map((m) => m.id), 'wayback_unavailable', dryRun);
    console.log('Done.');
    return;
  }

  // Group affected meetings by ISO week (Monday-based) so one Wayback pass
  // per week covers every affected meeting in it.
  const byWeek = new Map<string, AffectedMeeting[]>();
  for (const m of affected) {
    const key = isoWeekKey(m.meeting_date);
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)!.push(m);
  }
  const weekKeys = [...byWeek.keys()].sort();
  console.log(`Grouped into ${weekKeys.length} distinct week(s).`);

  let totalRecovered = 0;
  let totalMarked = 0;

  for (let wi = 0; wi < weekKeys.length; wi++) {
    const weekStart = weekKeys[wi]!;
    const bucket = byWeek.get(weekStart)!;
    const weekEnd = addDays(weekStart, 13); // captures pushed to Wayback a few days after the week ends
    const bucketIds = bucket.map((m) => m.id);
    console.log(
      `\n[${wi + 1}/${weekKeys.length}] Week of ${weekStart} — ${bucket.length} affected meeting(s), searching Wayback ${weekStart}..${weekEnd}`,
    );

    let snapshots: string[] = [];
    try {
      snapshots = await listWaybackSnapshots(weekStart, weekEnd);
    } catch (err) {
      console.warn(`  Wayback CDX list failed: ${(err as Error).message}. Marking week as unavailable.`);
      await markAgendaRecoveryStatus(bucketIds, 'wayback_unavailable', dryRun);
      totalMarked += bucketIds.length;
      continue;
    }
    if (snapshots.length === 0) {
      console.log('  No Wayback snapshots for this week — marking as wayback_unavailable.');
      await markAgendaRecoveryStatus(bucketIds, 'wayback_unavailable', dryRun);
      totalMarked += bucketIds.length;
      continue;
    }
    console.log(`  ${snapshots.length} snapshot(s) available.`);

    let stillNeed = new Set(bucketIds);
    for (const ts of snapshots) {
      if (stillNeed.size === 0) break;
      const label = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
      let html: string;
      try {
        html = await fetchWaybackHtml(ts);
      } catch (err) {
        console.warn(`  Snapshot ${label} fetch failed (${(err as Error).message}), trying next.`);
        continue;
      }
      const parsed = parseLegislativeCalendarHtml(html);
      const scheduled = scheduledMeetingsFromParsed(parsed);

      // Restrict the upsert to just the meetings we still need for this week,
      // matched by (committee lrc_rsn, meeting_date). Avoids side effects on
      // meetings not part of this repair.
      const needByKey = new Map<string, AffectedMeeting>();
      for (const m of bucket) {
        if (!stillNeed.has(m.id)) continue;
        if (m.committee_lrc_rsn == null) continue;
        needByKey.set(`${m.committee_lrc_rsn}|${m.meeting_date}`, m);
      }
      const targetedScheduled = scheduled.filter((s) =>
        needByKey.has(`${s.committee.lrcRsn}|${s.meetingDate}`),
      );
      if (targetedScheduled.length === 0) {
        continue;
      }
      console.log(
        `  Snapshot ${label}: ${targetedScheduled.length}/${stillNeed.size} affected meeting(s) matched.`,
      );

      if (dryRun) {
        for (const t of targetedScheduled) {
          const m = needByKey.get(`${t.committee.lrcRsn}|${t.meetingDate}`);
          if (m) stillNeed.delete(m.id);
        }
        continue;
      }

      try {
        await upsertLrcCalendarMeetings(supabaseAdmin!, targetedScheduled, {
          skipHearingEvents: true,
          sourceUrl: waybackRawUrl(ts),
        });
      } catch (err) {
        console.warn(`  Snapshot ${label} upsert failed (${(err as Error).message}), trying next.`);
        continue;
      }

      // Re-check which of the targeted meetings now have rows. Persist the
      // narrow view — the upsert is idempotent, so a partial success on this
      // snapshot narrows the set for the next snapshot's pass.
      const targetedIds = [...needByKey.values()].map((m) => m.id);
      const stillMiss = await stillMissing(targetedIds);
      for (const id of targetedIds) if (!stillMiss.has(id)) stillNeed.delete(id);

      if (delayMs > 0) await sleep(delayMs);
    }

    const recovered = bucketIds.length - stillNeed.size;
    totalRecovered += recovered;
    if (stillNeed.size > 0) {
      console.log(
        `  Marking ${stillNeed.size} unrecoverable meeting(s) as wayback_unavailable.`,
      );
      await markAgendaRecoveryStatus([...stillNeed], 'wayback_unavailable', dryRun);
      totalMarked += stillNeed.size;
    }
    if (recovered > 0 && !dryRun) {
      // Successful reingests get a marker too, so the audit history shows the
      // meeting was triaged and the row count is not just coincidental.
      const recoveredIds = bucketIds.filter((id) => !stillNeed.has(id));
      await markAgendaRecoveryStatus(recoveredIds, 'reingested', false);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Affected meetings: ${affected.length}`);
  console.log(`Reingested from Wayback: ${totalRecovered}`);
  console.log(`Marked wayback_unavailable: ${totalMarked}`);
  if (dryRun) console.log('(dry run — no writes performed)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
