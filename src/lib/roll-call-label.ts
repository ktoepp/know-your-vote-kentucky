/**
 * Roll-call labelling: derive a trustworthy label for each roll call from the
 * official action history, match roll calls to history entries, and collapse
 * twin roll-call rows at read time.
 *
 * Pure functions only (no React, no MUI, no Supabase) so the bill page, the
 * member page, the weekly email and the public API can all share one tested
 * implementation (WS3-01).
 *
 * Why this exists: LegiScan's KY roll-call `desc` is unreliable. Every House
 * roll call comes back "House: Veto Override RCS# N" and every Senate one
 * "Senate: Third Reading RSN# N", regardless of the actual vote. The action
 * history embeds the true action and tally, so we match on chamber + "yea-nay".
 * The "House:"/"Senate:" prefix and the RCS#/RSN# number on `desc` are the only
 * reliable parts.
 */

/** One entry of a bill's LegiScan action history. */
export interface RollCallHistoryEntry {
  date: string;
  action: string;
  /** 'H', 'S', or '' when unknown. */
  chamber: string;
}

/**
 * A roll-call row in either spelling: the bill-page shape mapped by
 * `fetchDbVotes` (`desc`, `yea`, `nay`, ...) or the raw `ky_votes` /
 * member-RPC shape (`description`, `yea_count`, `nay_count`, ...).
 */
export interface RollCallRowLike {
  roll_call_id?: number | null;
  date?: string | null;
  desc?: string | null;
  description?: string | null;
  yea?: number | null;
  yea_count?: number | null;
  nay?: number | null;
  nay_count?: number | null;
  absent?: number | null;
  absent_count?: number | null;
  nv?: number | null;
  nv_count?: number | null;
}

/** The one caption for unmatched roll calls on every page (WS3-02, WS3-03a). */
export const UNMATCHED_ROLL_CALL_CAPTION =
  'The official bill history does not say which motion this vote was on.';

export interface RollCallLabel {
  label: string;
  /** True when the roll call was matched to an official history action. */
  matched: boolean;
  chamber: 'H' | 'S' | null;
  rollCallNumber: string | null;
}

const descOf = (v: RollCallRowLike): string | null => v.desc ?? v.description ?? null;
const yeaOf = (v: RollCallRowLike): number | null => v.yea ?? v.yea_count ?? null;
const nayOf = (v: RollCallRowLike): number | null => v.nay ?? v.nay_count ?? null;
const absentOf = (v: RollCallRowLike): number | null => v.absent ?? v.absent_count ?? null;
const nvOf = (v: RollCallRowLike): number | null => v.nv ?? v.nv_count ?? null;

export function rollCallChamberFromDesc(desc: string | null | undefined): 'H' | 'S' | null {
  const d = (desc ?? '').trim().toLowerCase();
  if (d.startsWith('house')) return 'H';
  if (d.startsWith('senate')) return 'S';
  return null;
}

/** The RCS# (House) or RSN# (Senate) number in a LegiScan KY roll-call desc. */
export function rollCallNumberFromDesc(desc: string | null | undefined): string | null {
  return /(?:RCS|RSN)#\s*(\d+)/i.exec(desc ?? '')?.[1] ?? null;
}

/**
 * True when `action` states the tally `${yea}-${nay}` as a whole number pair.
 * Whitespace is collapsed and en dashes become `-`. A non-digit (or the string
 * edge) is required on both sides, so "8-0" does not match "38-0" or "8-01".
 */
export function historyActionMatchesTally(
  action: string | null | undefined,
  yea: number | null | undefined,
  nay: number | null | undefined,
): boolean {
  if (!action || yea == null || nay == null) return false;
  const y = Number(yea);
  const n = Number(nay);
  if (!Number.isInteger(y) || !Number.isInteger(n) || y < 0 || n < 0) return false;
  const normalized = action.replace(/\s+/g, ' ').replace(/–/g, '-');
  return new RegExp(`(^|\\D)${y}-${n}(\\D|$)`).test(normalized);
}

/**
 * Index of the history entry this roll call belongs to, or -1.
 * Chamber rule (unchanged): an entry qualifies when either side has no chamber
 * or both chambers agree. Among qualifying entries, a same-date one wins;
 * otherwise the first candidate is taken.
 */
export function matchRollCallToHistory(
  vote: RollCallRowLike,
  history: readonly RollCallHistoryEntry[],
): number {
  const chamber = rollCallChamberFromDesc(descOf(vote));
  const yea = yeaOf(vote);
  const nay = nayOf(vote);
  const candidates: number[] = [];
  history.forEach((h, i) => {
    if ((!chamber || !h.chamber || h.chamber === chamber) && historyActionMatchesTally(h.action, yea, nay)) {
      candidates.push(i);
    }
  });
  return candidates.find((i) => history[i]!.date === vote.date) ?? candidates[0] ?? -1;
}

/**
 * Label a roll call from the official history.
 * Matched: "House: " / "Senate: " plus the action with its first letter
 * upper-cased (just the action when the chamber is unknown).
 * Unmatched: "House roll call no. 155", "Senate roll call no. 12",
 * "House roll call" (no number) or "Roll call" (no chamber).
 */
export function deriveRollCallLabel(
  vote: RollCallRowLike,
  history: readonly RollCallHistoryEntry[],
): RollCallLabel {
  const desc = descOf(vote);
  const chamber = rollCallChamberFromDesc(desc);
  const rollCallNumber = rollCallNumberFromDesc(desc);
  const chamberLabel = chamber === 'H' ? 'House' : chamber === 'S' ? 'Senate' : '';
  const idx = matchRollCallToHistory(vote, history);
  if (idx >= 0) {
    const action = history[idx]!.action.trim();
    const pretty = action.charAt(0).toUpperCase() + action.slice(1);
    return {
      label: chamberLabel ? `${chamberLabel}: ${pretty}` : pretty,
      matched: true,
      chamber,
      rollCallNumber,
    };
  }
  let label = 'Roll call';
  if (chamberLabel) {
    label = rollCallNumber ? `${chamberLabel} roll call no. ${rollCallNumber}` : `${chamberLabel} roll call`;
  }
  return { label, matched: false, chamber, rollCallNumber };
}

/**
 * Attach each roll call to the history entry it belongs to (see
 * matchRollCallToHistory). Votes with no matching entry are returned separately
 * so the timeline can synthesize a dated row for them instead of dropping them.
 */
export function matchVotesToHistory<T extends RollCallRowLike>(
  votes: readonly T[],
  history: readonly RollCallHistoryEntry[],
): { attached: Map<number, T[]>; unmatched: T[] } {
  const attached = new Map<number, T[]>();
  const unmatched: T[] = [];
  for (const v of votes) {
    const idx = matchRollCallToHistory(v, history);
    if (idx >= 0) attached.set(idx, [...(attached.get(idx) ?? []), v]);
    else unmatched.push(v);
  }
  return { attached, unmatched };
}

/**
 * Read-time dedupe of rows describing the same physical roll call. Input order
 * matters: pass rows ordered by date then roll_call_id (the `fetchDbVotes` query
 * order), because ties keep the earliest row.
 *
 * Guard: primary dedupe ran as a one-time DB cleanup 2026-07-17, see TASKS.md.
 * Two duplicate shapes exist:
 * (a) rows without roll_call_id that a later sync re-added with one: dropped when
 *     any keyed row shares their (date, yea, nay, absent) tally;
 * (b) LegiScan shipping one RCS#/RSN# twice with variant descriptions ("Third
 *     Reading" vs "Third Reading W/SCS 1", or a mislabeled "Veto Override" copy):
 *     collapsed only when the parsed roll-call number ALSO matches, because
 *     genuinely distinct roll calls can share a date and tally (27 such pairs in
 *     production). Prefer the row with NV populated; ties keep the earliest
 *     roll_call_id (query order).
 *
 * Missing counts are read as 0, matching the `?? 0` mapping in `fetchDbVotes`.
 */
export function dedupeRollCallRows<T extends RollCallRowLike>(rows: readonly T[]): T[] {
  const tallyKey = (v: T) =>
    `${v.date ?? null}|${yeaOf(v) ?? 0}|${nayOf(v) ?? 0}|${absentOf(v) ?? 0}`;
  const nv = (v: T) => nvOf(v) ?? 0;

  const keyedTallies = new Set(rows.filter((v) => v.roll_call_id != null).map(tallyKey));
  const winners: T[] = [];
  const winnerIndexByKey = new Map<string, number>();
  for (const v of rows) {
    if (v.roll_call_id == null) {
      if (!keyedTallies.has(tallyKey(v))) winners.push(v);
      continue;
    }
    const num = rollCallNumberFromDesc(descOf(v));
    if (num == null) {
      winners.push(v);
      continue;
    }
    const key = `${tallyKey(v)}|${num}`;
    const at = winnerIndexByKey.get(key);
    if (at == null) {
      winnerIndexByKey.set(key, winners.length);
      winners.push(v);
    } else if (nv(v) > 0 && nv(winners[at]!) <= 0) {
      winners[at] = v;
    }
  }
  return winners;
}
