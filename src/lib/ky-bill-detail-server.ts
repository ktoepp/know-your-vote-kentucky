import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { KYBill } from '@/types/kentucky';
import { getCachedLegiscanBillDetail, type LegiscanBillDetailPayload } from '@/lib/ky-bill-legiscan-cache';

export type KyBillDetailEnrichment = {
  subjects: LegiscanBillDetailPayload['subjects'];
  history: LegiscanBillDetailPayload['history'];
  texts: LegiscanBillDetailPayload['texts'];
  sponsors: LegiscanBillDetailPayload['sponsors'];
  votes: LegiscanBillDetailPayload['votes'];
  committee: LegiscanBillDetailPayload['committee'];
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
 * Minimal step timeline synthesized from columns already on ky_bills, used when the
 * live LegiScan call is unavailable. The full action history is not persisted (only
 * fetched live), so this surfaces the two anchors we do store — Introduced and the
 * latest action — so the page shows real steps instead of a blank timeline.
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
 * Mapped to the shape BillDetailView consumes (yea/nay/nv/date/desc/roll_call_id).
 * nv_count is NULL on rows synced before migration 035; the UI hides the NV chip until
 * a re-sync fills it, so Yea/Nay stay accurate meanwhile.
 */
async function fetchDbVotes(
  supabase: NonNullable<ReturnType<typeof createServerClient>>,
  billId: string,
): Promise<KyBillDetailEnrichment['votes']> {
  const { data, error } = await supabase
    .from('ky_votes')
    .select('roll_call_id, date, description, yea_count, nay_count, nv_count, passed')
    .eq('bill_id', billId)
    .order('date', { ascending: true, nullsFirst: true })
    .order('roll_call_id', { ascending: true });
  if (error || !data) return [];
  return data.map((v) => ({
    roll_call_id: v.roll_call_id ?? undefined,
    date: v.date ?? null,
    desc: v.description ?? null,
    yea: v.yea_count ?? 0,
    nay: v.nay_count ?? 0,
    nv: v.nv_count ?? 0,
    passed: v.passed ?? null,
  })) as KyBillDetailEnrichment['votes'];
}

function buildDetailPayload(
  billData: KYBill,
  legiscanDetail: LegiscanBillDetailPayload | null,
  fallbackSubjects: KyBillDetailEnrichment['subjects'],
  dbVotes: KyBillDetailEnrichment['votes'],
): KyBillDetailEnrichment | null {
  if (legiscanDetail) {
    return {
      subjects:
        Array.isArray(legiscanDetail.subjects) && legiscanDetail.subjects.length > 0
          ? legiscanDetail.subjects
          : fallbackSubjects,
      history: legiscanDetail.history ?? [],
      texts: legiscanDetail.texts ?? [],
      sponsors: legiscanDetail.sponsors ?? [],
      votes: dbVotes,
      committee: legiscanDetail.committee ?? null,
    };
  }
  // DB-only fallback (LegiScan unavailable — quota hold per the #102 guard, or a fetch
  // error). Sponsors are on ky_bills.sponsors, votes come from ky_votes, and a minimal
  // step timeline is rebuilt from stored fields, so the page degrades gracefully instead
  // of dropping sponsors/votes/steps. Texts + full action history remain LegiScan-only
  // until they are persisted (next phase).
  const dbSponsors = Array.isArray(billData.sponsors)
    ? (billData.sponsors as unknown as KyBillDetailEnrichment['sponsors'])
    : [];
  const fallbackHistory = buildFallbackHistory(billData);
  if (
    fallbackSubjects.length === 0 &&
    dbSponsors.length === 0 &&
    fallbackHistory.length === 0 &&
    dbVotes.length === 0
  ) {
    return null;
  }
  return {
    subjects: fallbackSubjects,
    history: fallbackHistory,
    texts: [],
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

  let billData: KYBill | null = null;
  if (isUuid) {
    const { data } = await supabase.from('ky_bills').select('*').eq('id', routeId).maybeSingle();
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

  let legiscanDetail: LegiscanBillDetailPayload | null = null;
  if (billData.legiscan_id) {
    try {
      legiscanDetail = await getCachedLegiscanBillDetail(Number(billData.legiscan_id));
    } catch (err: unknown) {
      console.error('[BillDetail] LegiScan fetch failed:', err instanceof Error ? err.message : err);
    }
  }

  return {
    bill: billData,
    detail: buildDetailPayload(billData, legiscanDetail, fallbackSubjects, dbVotes),
  };
}

/** Per-request dedupe when metadata + page both resolve the same bill. */
export const getKyBillDetailPageData = cache(fetchKyBillDetailPageData);
