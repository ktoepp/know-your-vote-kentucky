import type { KYBill } from '@/types/kentucky';
import { isRecentlyPassedBillStatus } from '@/lib/bill-display';

function byLastActionDateDesc(a: KYBill, b: KYBill): number {
  const ta = a.last_action_date ? new Date(a.last_action_date).getTime() : 0;
  const tb = b.last_action_date ? new Date(b.last_action_date).getTime() : 0;
  return tb - ta;
}

/**
 * Prefer a dedicated query result; if empty, derive from a broader recency-ordered list (e.g. home “latest” fetch).
 */
export function selectRecentlyPassedBills(
  fromPassedQuery: KYBill[] | null | undefined,
  fallbackBills: KYBill[] | null | undefined,
  limit: number,
): KYBill[] {
  const fromQ = (fromPassedQuery ?? []).filter(b => isRecentlyPassedBillStatus(b.status)).sort(byLastActionDateDesc);
  if (fromQ.length > 0) return fromQ.slice(0, limit);
  return (fallbackBills ?? [])
    .filter(b => isRecentlyPassedBillStatus(b.status))
    .sort(byLastActionDateDesc)
    .slice(0, limit);
}

function byViewCountThenAction(a: KYBill, b: KYBill): number {
  const va = a.view_count ?? 0;
  const vb = b.view_count ?? 0;
  if (vb !== va) return vb - va;
  return byLastActionDateDesc(a, b);
}

/**
 * Top by view_count (null/undefined treated as 0), then last action date. Optionally avoids IDs already in “recently passed.”
 */
export function selectMostViewedBills(
  fromViewQuery: KYBill[] | null | undefined,
  fallbackBills: KYBill[] | null | undefined,
  recentlyPassed: KYBill[],
  limit: number,
): KYBill[] {
  const source =
    fromViewQuery && fromViewQuery.length > 0
      ? fromViewQuery
      : (fallbackBills ?? []);
  if (source.length === 0) return [];
  const passedIds = new Set(recentlyPassed.map(b => b.id));
  const sorted = source.slice().sort(byViewCountThenAction);
  const deduped = sorted.filter(b => !passedIds.has(b.id));
  if (deduped.length >= limit) return deduped.slice(0, limit);
  if (deduped.length >= Math.min(3, limit)) return deduped.slice(0, limit);
  return sorted.slice(0, limit);
}
