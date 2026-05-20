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

function buildDetailPayload(
  legiscanDetail: LegiscanBillDetailPayload | null,
  fallbackSubjects: KyBillDetailEnrichment['subjects'],
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
      votes: legiscanDetail.votes ?? [],
      committee: legiscanDetail.committee ?? null,
    };
  }
  if (fallbackSubjects.length > 0) {
    return {
      subjects: fallbackSubjects,
      history: [],
      texts: [],
      sponsors: [],
      votes: [],
      committee: null,
    };
  }
  return null;
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
    detail: buildDetailPayload(legiscanDetail, fallbackSubjects),
  };
}

/** Per-request dedupe when metadata + page both resolve the same bill. */
export const getKyBillDetailPageData = cache(fetchKyBillDetailPageData);
