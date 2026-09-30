#!/usr/bin/env npx tsx
/**
 * Session preview — what would the bills sync fetch for a session LegiScan may
 * or may not have published yet?
 *
 * Dry run by default: asks LegiScan's live `getSessionList` whether the session
 * exists, and if it does, diffs its master list against `ky_bills` to count the
 * `getBill` calls the hash-gated sync would spend. Writes nothing except the
 * LegiScan quota counter (every billable call is counted, dry run or not).
 *
 * Usage:
 *   npm run sync:ky:session-preview                                  # next scheduled regular session
 *   npm run sync:ky:session-preview -- --session="2027 Regular Session"
 *   npm run sync:ky:session-preview -- --apply                       # run the hash-gated bills sync for it
 *
 * A session that is not listed yet, or listed with no bills, is an expected
 * state: the script says so and exits 0. It never posts to Slack.
 *
 * Cost: 1 `getSessionList`, plus 1 `getMasterListRaw` once the session is listed.
 * `--apply` then spends one `getBill` per new or changed bill — the number the
 * dry run prints. Check it against the month before applying.
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { getKyLegiScanClient } from '../src/lib/ky-data-sources';
import type { LegiScanMasterListRawBill } from '../src/lib/ky-legiscan-client';
import {
  describeKySessionAvailability,
  findLegiscanSessionByName,
  type KySessionAvailability,
} from '../src/lib/ky-legiscan-session-discovery';
import {
  KY_SESSIONS,
  getCivicDataSessionName,
  getNextScheduledRegularSession,
} from '../src/lib/ky-sessions';
import { withLegiscanCaller } from '../src/lib/legiscan-caller';
import { checkLegiscanQuotaForSync, legiscanPublicMonthlyLimit } from '../src/lib/legiscan-quota';
import { syncAll } from '../src/lib/ky-sync-pipeline';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const sessionFlag = args.find((a) => a.startsWith('--session='))?.slice('--session='.length);
const TARGET = (sessionFlag || getNextScheduledRegularSession()?.name || getCivicDataSessionName()).trim();

const say = (msg: string) => console.log(`[session-preview] ${msg}`);

async function storedHashes(legiscanIds: number[]): Promise<Map<number, string | null> | null> {
  if (!supabaseAdmin) return null;
  const map = new Map<number, string | null>();
  const CHUNK = 300;
  for (let i = 0; i < legiscanIds.length; i += CHUNK) {
    const { data, error } = await supabaseAdmin
      .from('ky_bills')
      .select('legiscan_id, change_hash')
      .in('legiscan_id', legiscanIds.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
    for (const row of data || []) {
      if (row.legiscan_id != null) map.set(Number(row.legiscan_id), (row.change_hash as string | null) ?? null);
    }
  }
  return map;
}

async function main() {
  const calendar = KY_SESSIONS.find((s) => s.name.toLowerCase() === TARGET.toLowerCase());
  say(`Target: ${TARGET}${APPLY ? '' : '  [DRY RUN — pass --apply to sync]'}`);
  say(
    calendar
      ? `LRC calendar: convenes ${calendar.start}, adjourns ${calendar.end}`
      : 'Not in KY_SESSIONS — phase-gated syncs (votes, legislator-bios) will not switch on for it',
  );

  const guard = await checkLegiscanQuotaForSync();
  if (guard.blocked) {
    say(`Skipped — ${guard.reason}`);
    return;
  }

  const client = getKyLegiScanClient();
  let calls = 0;

  const sessions = await client.fetchSessions({ live: true, persist: APPLY });
  calls += 1;
  say(`getSessionList (live): ${sessions.length} KY sessions`);

  const session = findLegiscanSessionByName(sessions, TARGET);
  let availability: KySessionAvailability = { state: 'not_listed' };
  let rawBills: LegiScanMasterListRawBill[] = [];
  if (session) {
    try {
      rawBills = await client.fetchMasterListRaw(session.session_id, { persist: APPLY });
    } catch (err) {
      say(`getMasterListRaw(${session.session_id}) failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    calls += 1;
    availability = rawBills.length
      ? { state: 'ready', session, billCount: rawBills.length }
      : { state: 'listed_empty', session };
  }

  say(describeKySessionAvailability(TARGET, availability));

  if (availability.state !== 'ready') {
    say('Expected skip. The scheduled syncs keep following the previous session and pick this one up on their own.');
    say(`LegiScan calls this run: ${calls}`);
    return;
  }

  if (session!.session_name !== TARGET) {
    say(
      `⚠️  LegiScan names it "${session!.session_name}"; bills are stored under that label, which KY_SESSIONS / KY_BILL_SESSION_OPTIONS do not list.`,
    );
  }

  const stored = await storedHashes(rawBills.map((b) => b.bill_id));
  let fresh = 0;
  let changed = 0;
  let unchanged = 0;
  for (const b of rawBills) {
    const hash = stored?.get(b.bill_id);
    if (!stored || hash === undefined) fresh += 1;
    else if (hash && b.change_hash && hash === b.change_hash) unchanged += 1;
    else changed += 1;
  }
  const getBillCalls = fresh + changed;
  const used = guard.summary?.used ?? (await client.getMonthlyQueryCount());
  const limit = legiscanPublicMonthlyLimit();

  say(`Master list: ${rawBills.length} bills — ${fresh} new, ${changed} changed, ${unchanged} unchanged`);
  say(`A sync would spend ${getBillCalls} getBill call(s) (one per new or changed bill)`);
  say(`Quota: ${used.toLocaleString()} / ${limit.toLocaleString()} used this month → ${(used + calls + getBillCalls).toLocaleString()} after a sync`);
  say('Roll calls and rosters arrive through the votes cron and the weekly dataset reconcile (hash-gated), not this sync.');

  if (!APPLY) {
    say(`LegiScan calls this run: ${calls}`);
    return;
  }

  say(`--apply: running hash-gated bills sync for session_id ${session!.session_id}`);
  const results = await syncAll({
    source: 'bills',
    useChangeHash: true,
    skipBillSponsorDetails: false,
    legiscanSessionId: session!.session_id,
  });
  for (const r of results) {
    say(`${r.source}: ${r.status}, ${r.itemsSynced} item(s)${r.error ? ` — ${r.error}` : ''}`);
  }
  if (results.some((r) => r.status === 'error')) process.exitCode = 1;
}

withLegiscanCaller('session-preview', main).catch((e) => {
  console.error(e);
  process.exit(1);
});
