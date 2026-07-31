/**
 * Sync LRC enrollment/executive actions → ky_bill_status_history.
 *
 * Parses apps.legislature.ky.gov/record/{session}/enrollment_actions.html and writes
 * date-stamped `signed_or_vetoed` / `veto_override_attempt` history rows with
 * `observed_at = action_date` (not now()).
 *
 * See docs/specs/session-record-spike-report.md § Phase 5b.
 */
import { createHash } from 'crypto';
import axios from 'axios';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { KyDigestEventType } from '@/lib/ky-notification-preferences';
import { KY_SESSIONS } from '@/lib/ky-sessions';
import {
  kySessionToLrcRecordSlug,
  lrcEnrollmentActionsUrl,
  parseEnrollmentActionsHtml,
  type LrcEnrollmentActionEntry,
} from './lrc-enrollment-actions-parser';
import { billSessionLookupKey, normalizeKySessionLabel } from './lrc-session-label';

const SOURCE = 'lrc-enrollment-actions';

const FETCH_HEADERS = {
  'User-Agent': 'KnowYourVoteKentucky/1.0 (+https://kyvky.com; lrc-enrollment-actions-sync)',
  Accept: 'text/html',
};

function log(msg: string) {
  console.log(`[Sync:${SOURCE}] ${msg}`);
}

function logError(msg: string) {
  console.error(`[Sync:${SOURCE}] ERROR: ${msg}`);
}

export interface KyLrcEnrollmentActionsSyncOptions {
  /** Limit to these `ky_bills.session` names (defaults to all KY_SESSIONS). */
  sessions?: string[];
  dryRun?: boolean;
}

export interface KyLrcEnrollmentActionsSyncStats {
  sessionsProcessed: number;
  /**
   * Sessions LRC publishes no enrollment-actions page for (404). Expected for
   * older sessions — tracked separately from `errors` so a routine absence does
   * not mark the whole run failed.
   */
  sessionsAbsent: number;
  entriesParsed: number;
  billRefsParsed: number;
  historyInserted: number;
  historySkipped: number;
  unresolvedBills: number;
  errors: number;
}

type HistoryItem = {
  billUuid: string;
  event_type: KyDigestEventType;
  payload: Record<string, unknown>;
  legiscan_change_hash: string;
  observed_at: string;
};

function lrcHistoryHash(actionLabel: string, billUuid: string, actionDate: string): string {
  return createHash('sha256')
    .update(`lrc-record|${actionLabel}|${billUuid}|${actionDate}`)
    .digest('hex')
    .slice(0, 40);
}

/** Map LRC action headings to digest event types + payload kinds. */
export function classifyEnrollmentAction(actionLabel: string): {
  event_type: KyDigestEventType;
  kind: string;
} | null {
  const label = actionLabel.trim().toLowerCase();

  if (label === 'signed by governor') {
    return { event_type: 'signed_or_vetoed', kind: 'signed' };
  }
  if (label === 'vetoed') {
    return { event_type: 'signed_or_vetoed', kind: 'vetoed' };
  }
  if (label === 'line items vetoed') {
    return { event_type: 'signed_or_vetoed', kind: 'line_item_vetoed' };
  }
  if (label === 'veto overridden in house' || label === 'veto overridden in senate') {
    return { event_type: 'veto_override_attempt', kind: 'override' };
  }
  if (
    label === "became law without governor's signature" ||
    label === "filed without governor's signature with the secretary of state"
  ) {
    return { event_type: 'signed_or_vetoed', kind: 'signed_without_signature' };
  }

  return null;
}

async function resolveBillIds(
  db: SupabaseClient,
  sessionName: string,
  billNumbers: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!billNumbers.length) return out;

  const sessionLabel = normalizeKySessionLabel(sessionName);
  const { data, error } = await db
    .from('ky_bills')
    .select('id, bill_number, session')
    .in('bill_number', billNumbers)
    .ilike('session', sessionLabel)
    .limit(500);

  if (error) {
    logError(`Bill resolve failed (${sessionName}): ${error.message}`);
    return out;
  }

  for (const row of data ?? []) {
    out.set(billSessionLookupKey(row.bill_number, row.session), row.id);
    out.set(billSessionLookupKey(row.bill_number, sessionLabel), row.id);
  }
  return out;
}

function buildHistoryItems(
  sessionName: string,
  entries: LrcEnrollmentActionEntry[],
  billIds: Map<string, string>,
  sourceUrl: string,
): { items: HistoryItem[]; unresolved: number } {
  const items: HistoryItem[] = [];
  let unresolved = 0;
  const sessionKey = normalizeKySessionLabel(sessionName).toLowerCase();

  for (const entry of entries) {
    const classified = classifyEnrollmentAction(entry.actionLabel);
    if (!classified) continue;

    for (const bill of entry.bills) {
      const billUuid = billIds.get(`${bill.billNumber}|${sessionKey}`);
      if (!billUuid) {
        unresolved += 1;
        continue;
      }

      const hash = lrcHistoryHash(entry.actionLabel, billUuid, entry.actionDate);
      items.push({
        billUuid,
        event_type: classified.event_type,
        payload: {
          kind: classified.kind,
          action_label: entry.actionLabel,
          action_date: entry.actionDate,
          action_date_label: entry.actionDateLabel,
          bill_number: bill.billNumber,
          source: SOURCE,
          lrc_url: sourceUrl,
        },
        legiscan_change_hash: hash,
        observed_at: `${entry.actionDate}T12:00:00.000Z`,
      });
    }
  }

  return { items, unresolved };
}

async function insertHistoryItems(db: SupabaseClient, items: HistoryItem[]): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const item of items) {
    const { error } = await db.from('ky_bill_status_history').insert({
      bill_id: item.billUuid,
      event_type: item.event_type,
      event_payload: item.payload,
      legiscan_change_hash: item.legiscan_change_hash,
      observed_at: item.observed_at,
    });
    if (error) {
      if (error.code === '23505') {
        skipped += 1;
      } else {
        logError(`insert ${item.payload.bill_number}: ${error.message}`);
      }
      continue;
    }
    inserted += 1;
  }

  return { inserted, skipped };
}

/**
 * Outcome of fetching one session's enrollment-actions page.
 *
 * `absent` and `failed` were previously collapsed into a single `null`, and the
 * caller counted both as errors. Since this sync walks *every* session in
 * `KY_SESSIONS` (22 of them) and LRC only publishes an enrollment-actions page
 * for recent sessions, the older ones 404 on every run — so the job reported
 * `error` to ky_sources daily, permanently, for a condition that is entirely
 * expected. A source that is always red is a source nobody reads.
 */
type EnrollmentActionsFetch =
  | { kind: 'ok'; html: string }
  | { kind: 'absent' }
  | { kind: 'failed'; message: string };

async function fetchEnrollmentActionsHtml(sessionSlug: string): Promise<EnrollmentActionsFetch> {
  const url = lrcEnrollmentActionsUrl(sessionSlug);
  try {
    const res = await axios.get<string>(url, {
      timeout: 45_000,
      responseType: 'text',
      headers: FETCH_HEADERS,
      validateStatus: (status) => status < 500,
    });
    // 404: LRC has no enrollment-actions page for this session. Expected for
    // older sessions and not a problem with the sync.
    if (res.status === 404) return { kind: 'absent' };
    // Any other non-2xx, or a 200 with an empty body, is a real anomaly — the
    // page should exist and be readable.
    if (res.status >= 400) return { kind: 'failed', message: `HTTP ${res.status}` };
    if (!res.data) return { kind: 'failed', message: `HTTP ${res.status} with empty body` };
    return { kind: 'ok', html: res.data };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logError(`fetch ${url}: ${message}`);
    return { kind: 'failed', message };
  }
}

export async function syncKyLrcEnrollmentActions(
  db: SupabaseClient,
  options: KyLrcEnrollmentActionsSyncOptions = {},
): Promise<KyLrcEnrollmentActionsSyncStats> {
  const stats: KyLrcEnrollmentActionsSyncStats = {
    sessionsProcessed: 0,
    sessionsAbsent: 0,
    entriesParsed: 0,
    billRefsParsed: 0,
    historyInserted: 0,
    historySkipped: 0,
    unresolvedBills: 0,
    errors: 0,
  };

  const sessionNames =
    options.sessions?.length
      ? options.sessions
      : KY_SESSIONS.map((s) => s.name);

  for (const sessionName of sessionNames) {
    const slug = kySessionToLrcRecordSlug(sessionName);
    if (!slug) {
      logError(`No LRC record slug for session "${sessionName}" — skipping`);
      stats.errors += 1;
      continue;
    }

    log(`Fetching ${lrcEnrollmentActionsUrl(slug)} (${sessionName})…`);
    const fetched = await fetchEnrollmentActionsHtml(slug);
    if (fetched.kind === 'absent') {
      // Not an error: LRC simply does not publish this page for the session.
      stats.sessionsAbsent += 1;
      log(`${sessionName}: no enrollment-actions page published (404) — skipping`);
      continue;
    }
    if (fetched.kind === 'failed') {
      stats.errors += 1;
      continue;
    }

    const parsed = parseEnrollmentActionsHtml(fetched.html, slug);
    stats.sessionsProcessed += 1;
    stats.entriesParsed += parsed.stats.actionGroupCount;
    stats.billRefsParsed += parsed.stats.billRefCount;

    const billNumbers = [...new Set(parsed.entries.flatMap((e) => e.bills.map((b) => b.billNumber)))];
    const billIds = await resolveBillIds(db, sessionName, billNumbers);
    const { items, unresolved } = buildHistoryItems(sessionName, parsed.entries, billIds, parsed.sourceUrl);
    stats.unresolvedBills += unresolved;

    log(
      `${sessionName}: ${parsed.stats.dateCount} dates, ${parsed.stats.billRefCount} bill refs, ` +
        `${items.length} history rows planned (${unresolved} unresolved bills)`,
    );

    if (options.dryRun) continue;

    const { inserted, skipped } = await insertHistoryItems(db, items);
    stats.historyInserted += inserted;
    stats.historySkipped += skipped;
  }

  return stats;
}
