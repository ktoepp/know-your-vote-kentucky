import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { KYBill } from '@/types/kentucky';
import { parseKyBillSlug } from '@/lib/ky-bill-slug';

/** Bill-detail enrichment shape consumed by BillDetailView. Now sourced entirely from the DB. */
export type KyBillDetailEnrichment = {
  subjects: unknown[];
  history: unknown[];
  texts: unknown[];
  sponsors: unknown[];
  votes: Array<{ roll_call_id?: number; [key: string]: unknown }>;
  committee: unknown | null;
};

export type KyBillDetailPageData = {
  bill: KYBill;
  detail: KyBillDetailEnrichment | null;
};

function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Minimal step timeline synthesized from columns on ky_bills, used for bills whose
 * full `legiscan_history` hasn't been persisted yet (rows synced before migration 036,
 * until their next detail sync). Surfaces the two anchors we always store — Introduced
 * and the latest action — so the page shows real steps instead of a blank timeline.
 */
function buildFallbackHistory(bill: KYBill): KyBillDetailEnrichment['history'] {
  const entries: { date: string; action: string; chamber: string; importance: number }[] = [];
  if (bill.introduced_date) {
    entries.push({ date: bill.introduced_date, action: 'Introduced', chamber: '', importance: 1 });
  }
  if (bill.last_action && bill.last_action_date) {
    const dup = entries.some((e) => e.date === bill.last_action_date && e.action === bill.last_action);
    if (!dup) {
      entries.push({ date: bill.last_action_date, action: bill.last_action, chamber: '', importance: 1 });
    }
  }
  return entries as KyBillDetailEnrichment['history'];
}

/**
 * Roll calls rendered on the bill page come from ky_votes (populated by syncKyVotes),
 * not a live getRollCall enrichment — so page traffic no longer scales LegiScan quota.
 * Mapped to the shape BillDetailView consumes (yea/nay/nv/absent/date/desc/roll_call_id).
 * nv_count is NULL on rows synced before migration 035; the UI hides the NV chip until
 * a re-sync fills it, so Yea/Nay stay accurate meanwhile.
 */
async function fetchDbVotes(
  supabase: NonNullable<ReturnType<typeof createServerClient>>,
  billId: string,
): Promise<KyBillDetailEnrichment['votes']> {
  const { data, error } = await supabase
    .from('ky_votes')
    .select('roll_call_id, date, description, yea_count, nay_count, nv_count, absent_count, passed')
    .eq('bill_id', billId)
    .order('date', { ascending: true, nullsFirst: true })
    .order('roll_call_id', { ascending: true });
  if (error || !data) return [];
  const mapped = data.map((v) => ({
    roll_call_id: v.roll_call_id ?? undefined,
    date: v.date ?? null,
    desc: v.description ?? null,
    yea: v.yea_count ?? 0,
    nay: v.nay_count ?? 0,
    nv: v.nv_count ?? 0,
    absent: v.absent_count ?? 0,
    passed: v.passed ?? null,
  }));
  // Dedupe rows describing the same physical roll call. LegiScan ships some roll
  // calls twice under one RCS#/RSN# (e.g. "Third Reading" + "Third Reading W/SCS 1",
  // or a mislabeled "Veto Override" copy), and older sync paths inserted rows without
  // roll_call_id that a later sync re-added with one. Identical (date, yea, nay,
  // absent) on one bill is treated as one roll call; keep the row with a
  // roll_call_id, then the one with NV populated, then the earliest (query is
  // ordered by roll_call_id ascending, so first-seen wins ties).
  const winners: typeof mapped = [];
  const winnerIndexByKey = new Map<string, number>();
  const score = (v: (typeof mapped)[number]) =>
    (v.roll_call_id != null ? 2 : 0) + (v.nv > 0 ? 1 : 0);
  for (const v of mapped) {
    const key = `${v.date}|${v.yea}|${v.nay}|${v.absent}`;
    const at = winnerIndexByKey.get(key);
    if (at == null) {
      winnerIndexByKey.set(key, winners.length);
      winners.push(v);
    } else if (score(v) > score(winners[at]!)) {
      winners[at] = v;
    }
  }
  return winners as KyBillDetailEnrichment['votes'];
}

/**
 * Build the bill-detail enrichment entirely from DB-resident data — no live LegiScan
 * call on the read path. Everything the page renders is persisted during sync:
 * subjects (ky_bills.legiscan_subjects), sponsors (ky_bills.sponsors), votes (ky_votes),
 * history + text versions (ky_bills.legiscan_history / legiscan_texts). Committee is not
 * rendered. History falls back to a synthesized timeline for rows not yet detail-synced.
 */
function buildDetailFromDb(
  billData: KYBill,
  fallbackSubjects: KyBillDetailEnrichment['subjects'],
  dbVotes: KyBillDetailEnrichment['votes'],
): KyBillDetailEnrichment | null {
  const dbSponsors = Array.isArray(billData.sponsors)
    ? (billData.sponsors as unknown as KyBillDetailEnrichment['sponsors'])
    : [];
  const history =
    Array.isArray(billData.legiscan_history) && billData.legiscan_history.length > 0
      ? (billData.legiscan_history as KyBillDetailEnrichment['history'])
      : buildFallbackHistory(billData);
  const texts = Array.isArray(billData.legiscan_texts)
    ? (billData.legiscan_texts as KyBillDetailEnrichment['texts'])
    : [];
  if (
    fallbackSubjects.length === 0 &&
    dbSponsors.length === 0 &&
    history.length === 0 &&
    dbVotes.length === 0 &&
    texts.length === 0
  ) {
    return null;
  }
  return {
    subjects: fallbackSubjects,
    history,
    texts,
    sponsors: dbSponsors,
    votes: dbVotes,
    committee: null,
  };
}

/** Resolve bill row + LegiScan enrichment for detail page and API (server-only). */
export async function fetchKyBillDetailPageData(routeId: string): Promise<KyBillDetailPageData | null> {
  const supabase = createServerClient();
  if (!supabase) return null;

  const normalised = routeId.toUpperCase().replace(/\s+/g, '');
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routeId);
  const slugParts = isUuid ? null : parseKyBillSlug(routeId);

  let billData: KYBill | null = null;
  if (isUuid) {
    const { data } = await supabase.from('ky_bills').select('*').eq('id', routeId).maybeSingle();
    billData = (data as KYBill | null) ?? null;
  } else if (slugParts) {
    const { data } = await supabase
      .from('ky_bills')
      .select('*')
      .ilike('bill_number', slugParts.billNumber)
      .eq('session', slugParts.session)
      .order('last_action_date', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    billData = (data as KYBill | null) ?? null;
  } else {
    const { data: byNumber } = await supabase
      .from('ky_bills')
      .select('*')
      .ilike('bill_number', normalised)
      .order('session', { ascending: false })
      .order('last_action_date', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (byNumber) {
      billData = byNumber as KYBill;
    } else {
      const { data: byId } = await supabase.from('ky_bills').select('*').eq('id', routeId).maybeSingle();
      billData = (byId as KYBill | null) ?? null;
    }
  }

  if (!billData) return null;

  const fallbackSubjects = Array.isArray(billData.legiscan_subjects)
    ? (billData.legiscan_subjects as KyBillDetailEnrichment['subjects'])
    : [];

  const dbVotes = await fetchDbVotes(supabase, billData.id);

  return {
    bill: billData,
    detail: buildDetailFromDb(billData, fallbackSubjects, dbVotes),
  };
}

/** Per-request dedupe when metadata + page both resolve the same bill. */
export const getKyBillDetailPageData = cache(fetchKyBillDetailPageData);
