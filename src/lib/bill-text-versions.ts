/**
 * Pure helpers for LegiScan bill-text version metadata (`ky_bills.legiscan_texts`,
 * migration 036). The column stores version metadata only (doc_id, type, mime, date,
 * url, state_link), never the bill text itself.
 *
 * One selector decides which version is "current", so the bill page's official-text
 * link and the "Most current" chip in the versions list cannot disagree (WS3-04).
 */

/** Minimal shape of a `legiscan_texts` entry these helpers read. */
export interface BillTextVersionLike {
  type: string;
  /** KY rows often carry "0000-00-00"; older synced rows may lack it. */
  date?: string | null;
}

/** Minimal shape of a `legiscan_history` entry these helpers read. */
export interface BillHistoryActionLike {
  action: string;
}

/** Friendly labels for LegiScan texts[] type values; unknown types render as-is. */
export const TEXT_TYPE_LABELS: Record<string, string> = {
  Introduced: 'Introduced (original)',
  'Comm Sub': 'Committee Substitute',
  Amended: 'Amended',
  Engrossed: 'Engrossed (passed one chamber)',
  Enrolled: 'Enrolled (passed both chambers)',
  Chaptered: 'Enacted: Acts chapter (final law)',
  Draft: 'Draft',
};

/** KY texts[] ship date "0000-00-00"; treat anything non-real as missing. */
export function textDateOrNull(date: string | null | undefined): string | null {
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !date.startsWith('0000') ? date : null;
}

/**
 * Finality order, most final first. Any type not listed ranks below all of these.
 */
const TEXT_TYPE_FINALITY: readonly string[] = [
  'Chaptered',
  'Enrolled',
  'Engrossed',
  'Amended',
  'Comm Sub',
  'Introduced',
  'Draft',
];

function finalityRank(type: string): number {
  const i = TEXT_TYPE_FINALITY.indexOf(type);
  return i === -1 ? TEXT_TYPE_FINALITY.length : i;
}

/**
 * The most current text version: the most final type wins
 * (Chaptered > Enrolled > Engrossed > Amended > Comm Sub > Introduced > Draft > unknown).
 * A real date breaks ties only within the same type (a dated entry beats an undated
 * one, then the newer date wins), then the later array index. Returns `null` for an
 * empty list.
 */
export function selectCurrentBillText<T extends BillTextVersionLike>(
  texts: readonly T[] | null | undefined,
): T | null {
  if (!texts || texts.length === 0) return null;
  let best = 0;
  for (let i = 1; i < texts.length; i++) {
    const a = texts[i];
    const b = texts[best];
    const rankDiff = finalityRank(a.type) - finalityRank(b.type);
    if (rankDiff < 0) {
      best = i;
      continue;
    }
    if (rankDiff > 0) continue;
    const da = textDateOrNull(a.date) ?? '';
    const db = textDateOrNull(b.date) ?? '';
    // Same type: newer real date wins; equal (or both missing) dates go to the later index.
    if (da.localeCompare(db) >= 0) best = i;
  }
  return texts[best];
}

/** History actions that mean the bill's text changed after it was introduced. */
const CHANGED_AFTER_INTRODUCTION_ACTION = /committee substitute|floor amendment.*adopted|title amendment/i;

/**
 * True when the bill changed after it was introduced: `texts` holds a committee
 * substitute or amended version, or a history action records a committee substitute,
 * an adopted floor amendment or a title amendment.
 */
export function billChangedAfterIntroduction(
  texts: readonly BillTextVersionLike[] | null | undefined,
  history: readonly BillHistoryActionLike[] | null | undefined,
): boolean {
  if ((texts ?? []).some((t) => t.type === 'Comm Sub' || t.type === 'Amended')) return true;
  return (history ?? []).some((h) => CHANGED_AFTER_INTRODUCTION_ACTION.test(h.action ?? ''));
}
