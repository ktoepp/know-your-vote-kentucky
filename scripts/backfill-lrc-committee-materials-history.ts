#!/usr/bin/env npx tsx
/**
 * Historical backfill: walks each committee's `Other Meeting Years` chain on
 * LRC and upserts every prior-year material into `ky_committee_materials`.
 *
 * Run once per environment after migration 029 + initial sync. Re-runnable
 * (idempotent via the same `(committee_id, url)` unique constraint as the
 * daily sync).
 *
 *   npm run backfill:lrc:committee-materials                # all committees
 *   npm run backfill:lrc:committee-materials -- --dry-run
 *   npm run backfill:lrc:committee-materials -- --limit=5
 *   npm run backfill:lrc:committee-materials -- --committee-type="Statutory Committee"
 *   npm run backfill:lrc:committee-materials -- --delay-ms=500
 *   npm run backfill:lrc:committee-materials -- --max-years=4
 *
 * Behavior:
 *   1. Lists ky_committees with lrc_rsn IS NOT NULL.
 *   2. For each committee, fetches the current materials page (already covered
 *      by the daily cron, but the call is cheap and lets us read its
 *      priorYearUrls).
 *   3. Walks `priorYearUrls` breadth-first with a per-committee `seen` set
 *      (cycle guard — LRC pages cross-link forward as well as back).
 *   4. Stops a committee's walk when `--max-years` is hit (default unlimited)
 *      or when the queue is empty.
 *
 * Polite by default: 250ms between fetches. Bump via --delay-ms if you see
 * any rate limiting (unlikely; LRC pages are static HTML).
 */
import './load-env';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import {
  lrcCommitteeDocumentsUrl,
  parseCommitteeMaterialsHtml,
  type LrcCommitteeMaterialsParseResult,
} from '../src/lib/lrc-committee-materials-parser';

const FETCH_HEADERS = {
  'User-Agent':
    'KnowYourVoteKentucky/1.0 (+https://kyvky.com; committee-materials-historical-backfill)',
  Accept: 'text/html',
};

function argFlag(name: string): boolean {
  return process.argv.includes(name);
}

function argValue(prefix: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(`${prefix}=`));
  return a?.slice(prefix.length + 1);
}

function log(msg: string) {
  console.log(`[backfill:lrc-committee-materials] ${msg}`);
}

function logError(msg: string) {
  console.error(`[backfill:lrc-committee-materials] ERROR: ${msg}`);
}

type CommitteeRow = {
  id: string;
  name: string;
  lrc_rsn: number;
  committee_type: string;
};

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await axios.get<string>(url, {
      timeout: 30_000,
      responseType: 'text',
      headers: FETCH_HEADERS,
      validateStatus: (status) => status < 500,
    });
    if (res.status >= 400 || !res.data) return null;
    return res.data;
  } catch (e) {
    logError(`fetch failed: ${url} — ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

async function resolveMeetingIdByDate(
  supabase: SupabaseClient,
  committeeId: string,
  meetingDate: string | null,
): Promise<string | null> {
  if (!meetingDate) return null;
  const { data } = await supabase
    .from('ky_committee_meetings')
    .select('id')
    .eq('committee_id', committeeId)
    .eq('meeting_date', meetingDate)
    .limit(1)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

async function upsertParsedPage(
  supabase: SupabaseClient,
  committee: CommitteeRow,
  parsed: LrcCommitteeMaterialsParseResult,
  sourceUrl: string,
  dryRun: boolean,
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for (const meeting of parsed.meetings) {
    const meetingId = await resolveMeetingIdByDate(supabase, committee.id, meeting.meetingDate);

    for (let i = 0; i < meeting.materials.length; i++) {
      const mat = meeting.materials[i]!;

      if (dryRun) {
        inserted++;
        continue;
      }

      const { data: existing } = await supabase
        .from('ky_committee_materials')
        .select('id')
        .eq('committee_id', committee.id)
        .eq('url', mat.url)
        .maybeSingle<{ id: string }>();

      const row = {
        committee_id: committee.id,
        meeting_id: meetingId,
        meeting_date: meeting.meetingDate,
        date_label: meeting.dateLabel,
        title: mat.title,
        url: mat.url,
        file_type: mat.fileType,
        source_url: sourceUrl,
        sort_order: i,
        scraped_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase
          .from('ky_committee_materials')
          .update(row)
          .eq('id', existing.id);
        if (error) {
          logError(
            `update failed for committee=${committee.id} url=${mat.url}: ${error.message}`,
          );
          continue;
        }
        updated++;
      } else {
        const { error } = await supabase
          .from('ky_committee_materials')
          .insert(row);
        if (error) {
          logError(
            `insert failed for committee=${committee.id} url=${mat.url}: ${error.message}`,
          );
          continue;
        }
        inserted++;
      }
    }
  }

  return { inserted, updated };
}

async function backfillCommittee(
  supabase: SupabaseClient,
  committee: CommitteeRow,
  opts: {
    dryRun: boolean;
    delayMs: number;
    maxYears?: number;
  },
): Promise<{ pages: number; inserted: number; updated: number }> {
  let pages = 0;
  let inserted = 0;
  let updated = 0;

  const startUrl = lrcCommitteeDocumentsUrl(committee.lrc_rsn);
  const seen = new Set<string>();
  const queue: string[] = [startUrl];

  while (queue.length > 0) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);

    const html = await fetchHtml(url);
    if (!html) {
      log(`[${committee.name}] skip (fetch failed): ${url}`);
      continue;
    }

    const parsed = parseCommitteeMaterialsHtml(html, url);
    pages++;
    const result = await upsertParsedPage(supabase, committee, parsed, url, opts.dryRun);
    inserted += result.inserted;
    updated += result.updated;

    if (opts.maxYears !== undefined && pages >= opts.maxYears) {
      log(
        `[${committee.name}] hit --max-years=${opts.maxYears}; stopping. queue remaining=${queue.length}`,
      );
      break;
    }

    for (const next of parsed.priorYearUrls) {
      if (!seen.has(next)) queue.push(next);
    }

    if (opts.delayMs > 0) {
      await new Promise((r) => setTimeout(r, opts.delayMs));
    }
  }

  return { pages, inserted, updated };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const dryRun = argFlag('--dry-run');
  const limitStr = argValue('--limit');
  const committeeType = argValue('--committee-type');
  const delayStr = argValue('--delay-ms');
  const maxYearsStr = argValue('--max-years');

  let q = supabase
    .from('ky_committees')
    .select('id, name, lrc_rsn, committee_type')
    .not('lrc_rsn', 'is', null)
    .order('name', { ascending: true });

  if (committeeType) q = q.eq('committee_type', committeeType);
  if (limitStr) q = q.limit(Number(limitStr));

  const { data, error } = await q;
  if (error) {
    logError(`failed to list committees: ${error.message}`);
    process.exit(1);
  }

  const committees = (data ?? []) as CommitteeRow[];
  log(`backfilling ${committees.length} committee(s)…${dryRun ? ' [dry-run]' : ''}`);

  const totals = { pages: 0, inserted: 0, updated: 0, committees: 0 };
  for (const committee of committees) {
    const r = await backfillCommittee(supabase, committee, {
      dryRun,
      delayMs: delayStr ? Number(delayStr) : 250,
      maxYears: maxYearsStr ? Number(maxYearsStr) : undefined,
    });
    totals.committees++;
    totals.pages += r.pages;
    totals.inserted += r.inserted;
    totals.updated += r.updated;
    log(
      `[${committee.name}] ${r.pages} page(s), ${r.inserted} inserted, ${r.updated} updated` +
        (dryRun ? ' [dry-run]' : ''),
    );
  }

  log(
    `done — committees=${totals.committees} pages=${totals.pages} ` +
      `inserted=${totals.inserted} updated=${totals.updated}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
