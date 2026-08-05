/**
 * Classify LegiScan bill updates into digest event types and persist to ky_bill_status_history.
 * Dedupes via UNIQUE (bill_id, event_type, legiscan_change_hash).
 */
import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { KyDigestEventType } from '@/lib/ky-notification-preferences';

export type BillHistorySnapshot = {
  id: string;
  legiscan_id: number;
  status: string | null;
  last_action: string | null;
  last_action_date: string | null;
  committee_name: string | null;
  sponsors: unknown;
};

function cosponsorCount(s: unknown): number {
  return Array.isArray(s) ? s.length : 0;
}

function hashDedupe(legiscanId: number, eventType: string, legiscanChangeHash: string | null, fallbackKey: string): string | null {
  if (legiscanChangeHash && legiscanChangeHash.trim()) return legiscanChangeHash.trim();
  return createHash('sha256').update(`${legiscanId}|${eventType}|${fallbackKey}`).digest('hex').slice(0, 40);
}

function norm(s: string | null | undefined): string {
  return (s || '').toLowerCase();
}

/**
 * Derive one or more digest events from a bill row transition. Re-syncs with identical
 * text produce no events (empty array).
 */
export function classifyBillHistoryEvents(input: {
  prev: BillHistorySnapshot | null;
  next: {
    legiscan_id: number;
    bill_number?: string | null;
    status: string | null;
    last_action: string | null;
    last_action_date: string | null;
    committee_name: string | null;
    sponsors: unknown;
  };
  legiscanChangeHash: string | null;
}): Array<{ event_type: KyDigestEventType; payload: Record<string, unknown>; legiscan_change_hash: string | null }> {
  const { prev, next, legiscanChangeHash } = input;
  const action = norm(next.last_action);
  const prevAction = norm(prev?.last_action);
  const status = norm(next.status);
  const prevStatus = norm(prev?.status);
  const committee = norm(next.committee_name);
  const prevCommittee = norm(prev?.committee_name);

  const changed =
    !prev ||
    action !== prevAction ||
    status !== prevStatus ||
    committee !== prevCommittee ||
    cosponsorCount(next.sponsors) !== cosponsorCount(prev?.sponsors);

  if (!changed) return [];

  const events = new Map<KyDigestEventType, Record<string, unknown>>();

  const add = (t: KyDigestEventType, payload: Record<string, unknown>) => {
    if (!events.has(t)) events.set(t, payload);
  };

  if (!prev) {
    add('introduced', {
      bill_number: next.bill_number,
      status: next.status,
      last_action: next.last_action,
      last_action_date: next.last_action_date,
    });
  } else {
    if (cosponsorCount(next.sponsors) > cosponsorCount(prev.sponsors)) {
      add('new_cosponsor', {
        bill_number: next.bill_number,
        prior_count: cosponsorCount(prev.sponsors),
        next_count: cosponsorCount(next.sponsors),
      });
    }

    if (action !== prevAction || status !== prevStatus || committee !== prevCommittee) {
    if (/\bveto\s+override\b/.test(action) || status.includes('veto override')) {
      add('veto_override_attempt', { last_action: next.last_action, status: next.status });
    }
    if (
      /\bsigned\s+by\s+governor\b/.test(action) ||
      /\bdelivered\s+to\s+secretary\s+of\s+state\b/.test(action) ||
      status === 'signed' ||
      status.includes('chaptered')
    ) {
      add('signed_or_vetoed', { kind: 'signed', last_action: next.last_action, status: next.status });
    }
    if (
      /\bvetoed\s+by\s+governor\b/.test(action) ||
      (/\bveto\b/.test(action) && !/\boverride\b/.test(action) && status.includes('veto') && !status.includes('override'))
    ) {
      add('signed_or_vetoed', { kind: 'vetoed', last_action: next.last_action, status: next.status });
    }
    if (/\bdied\b/.test(action) || /\bfailed\b/.test(action) || status.includes('failed')) {
      add('dead', { last_action: next.last_action, status: next.status });
    }
    if (
      /\btransmitted\s+to\s+governor\b/.test(action) ||
      /\bsent\s+to\s+governor\b/.test(action) ||
      /\bdelivered\s+to\s+governor\b/.test(action)
    ) {
      add('sent_to_governor', { last_action: next.last_action, status: next.status });
    }
    if (
      status.includes('passed chamber') ||
      /\bthird\s+reading.*\bpassed\b/.test(action) ||
      /\bpassed\b.*\bthird\s+reading\b/.test(action)
    ) {
      add('passed_chamber', { last_action: next.last_action, status: next.status });
    }
    if (
      /\broll\s*call\b/.test(action) ||
      /\bvoice\s+vote\b/.test(action) ||
      /\breading\b/.test(action) ||
      /\bfloor\b/.test(action)
    ) {
      add('floor_vote', { last_action: next.last_action, status: next.status });
    }
    if (
      /\bhearing\b/.test(action) ||
      /\bmeeting\s+(scheduled|held)\b/.test(action) ||
      /\bnoticed?\b/.test(action)
    ) {
      add('hearing_scheduled', { last_action: next.last_action, status: next.status });
    }
    if (/\bamendment\b/.test(action)) {
      add('amendment_filed', { last_action: next.last_action, status: next.status });
    }
    if (
      /\breferred\b/.test(action) ||
      /\breported\b/.test(action) ||
      /\bcommittee\b/.test(action) ||
      /\bsubstitute\b/.test(action) ||
      (committee && committee !== prevCommittee)
    ) {
      add('committee_action', {
        last_action: next.last_action,
        status: next.status,
        committee_name: next.committee_name,
      });
    }
    }
  }

  const fallbackKey = `${next.status}|${next.last_action}|${next.committee_name}`;
  return [...events.entries()].map(([event_type, payload]) => ({
    event_type,
    payload,
    legiscan_change_hash: hashDedupe(next.legiscan_id, event_type, legiscanChangeHash, fallbackKey),
  }));
}

export async function fetchBillHistorySnapshots(
  db: SupabaseClient,
  legiscanIds: number[],
): Promise<Map<number, BillHistorySnapshot>> {
  const map = new Map<number, BillHistorySnapshot>();
  if (!legiscanIds.length) return map;
  const CHUNK = 200;
  for (let i = 0; i < legiscanIds.length; i += CHUNK) {
    const chunk = legiscanIds.slice(i, i + CHUNK);
    const { data, error } = await db
      .from('ky_bills')
      .select('id, legiscan_id, status, last_action, last_action_date, committee_name, sponsors')
      .in('legiscan_id', chunk);
    if (error) {
      console.error('[ky-bill-status-history] fetch snapshots:', error.message);
      continue;
    }
    for (const row of data || []) {
      if (row.legiscan_id == null) continue;
      map.set(Number(row.legiscan_id), row as BillHistorySnapshot);
    }
  }
  return map;
}

export async function fetchBillUuidsByLegiscanIds(
  db: SupabaseClient,
  legiscanIds: number[],
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (!legiscanIds.length) return map;
  const CHUNK = 300;
  for (let i = 0; i < legiscanIds.length; i += CHUNK) {
    const chunk = legiscanIds.slice(i, i + CHUNK);
    const { data, error } = await db.from('ky_bills').select('id, legiscan_id').in('legiscan_id', chunk);
    if (error) {
      console.error('[ky-bill-status-history] fetch ids:', error.message);
      continue;
    }
    for (const row of data || []) {
      if (row.legiscan_id != null && row.id) map.set(Number(row.legiscan_id), String(row.id));
    }
  }
  return map;
}

export async function insertBillStatusHistoryRows(
  db: SupabaseClient,
  billUuid: string,
  items: Array<{ event_type: KyDigestEventType; payload: Record<string, unknown>; legiscan_change_hash: string | null }>,
): Promise<void> {
  const rows = items.map((item) => ({
    bill_id: billUuid,
    event_type: item.event_type,
    event_payload: item.payload,
    legiscan_change_hash: item.legiscan_change_hash,
  }));
  const { error } = await db
    .from('ky_bill_status_history')
    .upsert(rows, {
      onConflict: 'bill_id,event_type,legiscan_change_hash',
      ignoreDuplicates: true,
    });
  if (error) {
    console.error('[ky-bill-status-history] upsert:', error.message, billUuid);
  }
}

/**
 * After bill upserts: write digest history rows. Callers must pass **pre-upsert** snapshots
 * (fetch via `fetchBillHistorySnapshots` before `upsertKyBillRows`); missing map entries mean new bills.
 */
export async function recordBillStatusHistoryForBuiltBatch(args: {
  db: SupabaseClient;
  prevByLegiscan: Map<number, BillHistorySnapshot>;
  rawBills: { bill_id: number; change_hash?: string | null }[];
  builtRows: Record<string, unknown>[];
}): Promise<void> {
  const { db, prevByLegiscan, rawBills, builtRows } = args;
  if (rawBills.length !== builtRows.length) {
    console.warn('[ky-bill-status-history] raw/row length mismatch; skipping history');
    return;
  }
  const legiscanIds = rawBills.map((b) => b.bill_id);
  const idByLegiscan = await fetchBillUuidsByLegiscanIds(db, legiscanIds);

  for (let i = 0; i < rawBills.length; i++) {
    const raw = rawBills[i]!;
    const row = builtRows[i]!;
    const uuid = idByLegiscan.get(raw.bill_id);
    if (!uuid) continue;
    const prevOrNull = prevByLegiscan.get(raw.bill_id) ?? null;
    const events = classifyBillHistoryEvents({
      prev: prevOrNull,
      next: {
        legiscan_id: raw.bill_id,
        bill_number: (row.bill_number as string) || null,
        status: (row.status as string) || null,
        last_action: (row.last_action as string) || null,
        last_action_date: (row.last_action_date as string) || null,
        committee_name: (row.committee_name as string) || null,
        sponsors: row.sponsors,
      },
      legiscanChangeHash: raw.change_hash ?? null,
    });
    if (!events.length) continue;
    await insertBillStatusHistoryRows(db, uuid, events);
  }
}
