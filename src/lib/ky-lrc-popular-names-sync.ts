/**
 * Sync LRC "Short Titles and Popular Names" → ky_bills.official_short_titles.
 *
 * Scrapes apps.legislature.ky.gov/record/{session}/7765.html (zero LegiScan quota),
 * maps each official short title to its bill, and writes the per-bill list onto
 * `official_short_titles`. LRC is the source of truth for this column, so a bill's
 * list is replaced wholesale from the current page; only changed rows are written
 * (avoids needless updated_at churn). Editorial media names live in a separate
 * column (editorial_popular_names) and are never touched here.
 *
 * See docs/specs/bill-popular-names.md.
 */
import axios from 'axios';
import type { SupabaseClient } from '@supabase/supabase-js';
import { KY_SESSIONS } from '@/lib/ky-sessions';
import {
  kySessionToLrcRecordSlug,
  lrcPopularNamesUrl,
  parsePopularNamesHtml,
  popularNamesByBillNumber,
} from './lrc-popular-names-parser';
import { normalizeBillNumberForLookup, normalizeKySessionLabel } from './lrc-session-label';

const SOURCE = 'lrc-popular-names';

const FETCH_HEADERS = {
  'User-Agent': 'KnowYourVoteKentucky/1.0 (+https://kyvky.com; lrc-popular-names-sync)',
  Accept: 'text/html',
};

function log(msg: string) {
  console.log(`[Sync:${SOURCE}] ${msg}`);
}

function logError(msg: string) {
  console.error(`[Sync:${SOURCE}] ERROR: ${msg}`);
}

export interface KyLrcPopularNamesSyncOptions {
  /** Limit to these `ky_bills.session` names (defaults to all KY_SESSIONS). */
  sessions?: string[];
  dryRun?: boolean;
}

export interface KyLrcPopularNamesSyncStats {
  sessionsProcessed: number;
  namesParsed: number;
  billRefsParsed: number;
  billsMatched: number;
  billsUpdated: number;
  billsUnchanged: number;
  unresolvedBills: number;
  errors: number;
}

/** Compare two short-title lists as ordered arrays (order is display order). */
function sameTitles(a: string[] | null | undefined, b: string[]): boolean {
  const prev = a ?? [];
  if (prev.length !== b.length) return false;
  return prev.every((v, i) => v === b[i]);
}

async function fetchPopularNamesHtml(sessionSlug: string): Promise<string | null> {
  const url = lrcPopularNamesUrl(sessionSlug);
  try {
    const res = await axios.get<string>(url, {
      timeout: 45_000,
      responseType: 'text',
      headers: FETCH_HEADERS,
      validateStatus: (status) => status < 500,
    });
    if (res.status === 404 || !res.data) return null;
    return res.data;
  } catch (e) {
    logError(`fetch ${url}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

interface ResolvedBill {
  id: string;
  official_short_titles: string[] | null;
}

async function resolveBills(
  db: SupabaseClient,
  sessionName: string,
  billNumbers: string[],
): Promise<Map<string, ResolvedBill>> {
  const out = new Map<string, ResolvedBill>();
  if (!billNumbers.length) return out;

  const sessionLabel = normalizeKySessionLabel(sessionName);
  const { data, error } = await db
    .from('ky_bills')
    .select('id, bill_number, official_short_titles')
    .in('bill_number', billNumbers)
    .ilike('session', sessionLabel)
    .limit(1000);

  if (error) {
    logError(`Bill resolve failed (${sessionName}): ${error.message}`);
    return out;
  }

  for (const row of data ?? []) {
    out.set(normalizeBillNumberForLookup(row.bill_number), {
      id: row.id,
      official_short_titles: row.official_short_titles ?? null,
    });
  }
  return out;
}

async function syncSession(
  db: SupabaseClient,
  sessionName: string,
  options: KyLrcPopularNamesSyncOptions,
  stats: KyLrcPopularNamesSyncStats,
): Promise<void> {
  const slug = kySessionToLrcRecordSlug(sessionName);
  if (!slug) {
    logError(`No LRC record slug for session "${sessionName}" — skipping`);
    stats.errors += 1;
    return;
  }

  log(`Fetching ${lrcPopularNamesUrl(slug)} (${sessionName})…`);
  const html = await fetchPopularNamesHtml(slug);
  if (!html) {
    // Missing page (404) is normal for sessions with no published list yet — not an error.
    log(`${sessionName}: no popular-names page (skipped)`);
    return;
  }

  const parsed = parsePopularNamesHtml(html, slug);
  const byBill = popularNamesByBillNumber(parsed);
  stats.sessionsProcessed += 1;
  stats.namesParsed += parsed.stats.nameCount;
  stats.billRefsParsed += parsed.stats.billRefCount;

  const billNumbers = [...byBill.keys()];
  const resolved = await resolveBills(db, sessionName, billNumbers);

  let matched = 0;
  let updated = 0;
  let unchanged = 0;
  let unresolved = 0;

  for (const [billNumber, titles] of byBill) {
    const bill = resolved.get(billNumber);
    if (!bill) {
      unresolved += 1;
      continue;
    }
    matched += 1;

    if (sameTitles(bill.official_short_titles, titles)) {
      unchanged += 1;
      continue;
    }

    if (options.dryRun) {
      updated += 1;
      continue;
    }

    const { error } = await db
      .from('ky_bills')
      .update({ official_short_titles: titles })
      .eq('id', bill.id);
    if (error) {
      logError(`update ${billNumber}: ${error.message}`);
      stats.errors += 1;
      continue;
    }
    updated += 1;
  }

  stats.billsMatched += matched;
  stats.billsUpdated += updated;
  stats.billsUnchanged += unchanged;
  stats.unresolvedBills += unresolved;

  log(
    `${sessionName}: ${parsed.stats.nameCount} names, ${parsed.stats.uniqueBillCount} bills, ` +
      `${matched} matched, ${updated} ${options.dryRun ? 'would update' : 'updated'}, ` +
      `${unchanged} unchanged, ${unresolved} unresolved`,
  );
}

export async function syncKyLrcPopularNames(
  db: SupabaseClient,
  options: KyLrcPopularNamesSyncOptions = {},
): Promise<KyLrcPopularNamesSyncStats> {
  const stats: KyLrcPopularNamesSyncStats = {
    sessionsProcessed: 0,
    namesParsed: 0,
    billRefsParsed: 0,
    billsMatched: 0,
    billsUpdated: 0,
    billsUnchanged: 0,
    unresolvedBills: 0,
    errors: 0,
  };

  const sessionNames = options.sessions?.length
    ? options.sessions
    : KY_SESSIONS.map((s) => s.name);

  for (const sessionName of sessionNames) {
    await syncSession(db, sessionName, options, stats);
  }

  return stats;
}
