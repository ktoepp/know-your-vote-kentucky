import { unstable_cache } from 'next/cache';
import { getKyLegiScanClient } from '@/lib/ky-legiscan-client';
import { isLegiscanQuotaHoldError } from '@/lib/legiscan-quota';

const LEGISCAN_DETAIL_REVALIDATE_SECONDS = 300;

export type LegiscanBillDetailPayload = {
  subjects: unknown[];
  history: unknown[];
  texts: unknown[];
  sponsors: unknown[];
  votes: Array<{ roll_call_id?: number; [key: string]: unknown }>;
  committee: unknown | null;
};

async function fetchLegiscanBillDetailUncached(legiscanId: number): Promise<LegiscanBillDetailPayload | null> {
  const client = getKyLegiScanClient();
  try {
    const raw = await client.fetchBillDetail(legiscanId);
    if (!raw) return null;
    // Roll calls are NOT enriched here anymore: the bill-detail page renders votes
    // from ky_votes (populated by syncKyVotes), so the read path no longer issues up
    // to 12 getRollCall calls per bill. `votes` is left empty; the server overrides it
    // with DB rows. See src/lib/ky-bill-detail-server.ts.
    return {
      subjects: raw.subjects ?? [],
      history: raw.history ?? [],
      texts: raw.texts ?? [],
      sponsors: raw.sponsors ?? [],
      votes: [],
      committee: raw.committee ?? null,
    };
  } catch (err) {
    if (isLegiscanQuotaHoldError(err)) {
      // Public traffic must not bleed quota past the sync hold — page falls back to
      // DB-only data (titles, sponsors, vote summaries already in ky_bills/ky_bill_votes).
      return null;
    }
    throw err;
  }
}

/** Server cache for LegiScan bill detail + roll-call enrichment (per `legiscan_id`). */
export function getCachedLegiscanBillDetail(legiscanId: number): Promise<LegiscanBillDetailPayload | null> {
  return unstable_cache(
    () => fetchLegiscanBillDetailUncached(legiscanId),
    ['ky-legiscan-bill-detail', String(legiscanId)],
    { revalidate: LEGISCAN_DETAIL_REVALIDATE_SECONDS },
  )();
}
