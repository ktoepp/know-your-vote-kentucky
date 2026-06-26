import { unstable_cache } from 'next/cache';
import { getKyLegiScanClient } from '@/lib/ky-legiscan-client';
import { isLegiscanQuotaHoldError } from '@/lib/legiscan-quota';

const LEGISCAN_DETAIL_REVALIDATE_SECONDS = 300;

/** Max roll calls enriched per bill (LegiScan `getRollCall` is slow). */
export const MAX_BILL_ROLL_CALL_ENRICH = 12;

export type LegiscanBillDetailPayload = {
  subjects: unknown[];
  history: unknown[];
  texts: unknown[];
  sponsors: unknown[];
  votes: Array<{ roll_call_id?: number; [key: string]: unknown }>;
  committee: unknown | null;
};

async function enrichVotes(
  votes: Array<{ roll_call_id?: number; [key: string]: unknown }>,
): Promise<Array<{ roll_call_id?: number; [key: string]: unknown }>> {
  if (votes.length === 0) return votes;
  const client = getKyLegiScanClient();
  const enrichCount = Math.min(votes.length, MAX_BILL_ROLL_CALL_ENRICH);
  const enrichedHead = await Promise.all(
    votes.slice(0, enrichCount).map(async (v) => {
      const rid = v?.roll_call_id;
      if (rid == null) return v;
      const full = await client.fetchRollCall(Number(rid));
      if (!full) return v;
      return {
        ...v,
        yea: full.yea,
        nay: full.nay,
        nv: full.nv,
        absent: full.absent,
        passed: full.passed,
      };
    }),
  );
  return [...enrichedHead, ...votes.slice(enrichCount)];
}

async function fetchLegiscanBillDetailUncached(legiscanId: number): Promise<LegiscanBillDetailPayload | null> {
  const client = getKyLegiScanClient();
  try {
    const raw = await client.fetchBillDetail(legiscanId);
    if (!raw) return null;
    const votes = await enrichVotes((raw.votes ?? []) as unknown as LegiscanBillDetailPayload['votes']);
    return {
      subjects: raw.subjects ?? [],
      history: raw.history ?? [],
      texts: raw.texts ?? [],
      sponsors: raw.sponsors ?? [],
      votes,
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
