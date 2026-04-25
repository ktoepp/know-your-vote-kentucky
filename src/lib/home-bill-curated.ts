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

/**
 * Most recent by last action; de-duplicates ids already shown as “recently passed,” unless that leaves too few rows.
 */
export function selectRecentActionBills(
  fromActionQuery: KYBill[] | null | undefined,
  recentlyPassed: KYBill[],
  limit: number,
): KYBill[] {
  const raw = (fromActionQuery ?? []).slice().sort(byLastActionDateDesc);
  const passedIds = new Set(recentlyPassed.map(b => b.id));
  const deduped = raw.filter(b => !passedIds.has(b.id));
  const take = (rows: KYBill[]) => rows.slice(0, limit);
  const primary = take(deduped);
  if (primary.length >= Math.min(3, limit) || !raw.length) return primary;
  return take(raw);
}
