/**
 * Guard against duplicate `ky_votes` rows for one physical roll call.
 *
 * The upsert key on `ky_votes` is (bill_id, roll_call_id), but LegiScan sometimes
 * assigns TWO roll_call_ids to the same physical vote — same RCS#/RSN# number,
 * date, and tally, shipped with variant descriptions ("Third Reading" vs
 * "Third Reading W/SCS 1", or a mislabeled "Veto Override" copy). A plain upsert
 * inserts both as distinct rows. Found 2026-07-17 (84 such twins cleaned up —
 * backup in `ky_votes_dupe_backup_20260717`; see TASKS.md).
 *
 * A roll call's *physical identity* is (bill, date, yea, nay, absent, RCS/RSN
 * number parsed from the description). Rows whose description has no parseable
 * number are never cross-collapsed — genuinely distinct roll calls can share a
 * date and tally, so the number is required evidence of sameness.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

type VoteUpsertRow = Record<string, unknown>;

function physicalKey(row: {
  bill_id?: unknown;
  date?: unknown;
  description?: unknown;
  yea_count?: unknown;
  nay_count?: unknown;
  absent_count?: unknown;
}): string | null {
  const num = /(?:RCS|RSN)#\s*(\d+)/i.exec(String(row.description ?? ''))?.[1];
  if (!num) return null;
  return [
    String(row.bill_id ?? ''),
    String(row.date ?? ''),
    Number(row.yea_count ?? 0),
    Number(row.nay_count ?? 0),
    Number(row.absent_count ?? 0),
    num,
  ].join('|');
}

/**
 * Drop incoming vote rows that duplicate the same physical roll call — either
 * within the batch (keep the lowest roll_call_id) or against rows already in
 * `ky_votes` under a different roll_call_id (existing row wins; a re-sync of the
 * SAME roll_call_id passes through so upserts still refresh content).
 */
export async function dropDuplicateRollCallRows(
  db: SupabaseClient,
  rows: VoteUpsertRow[],
): Promise<{ rows: VoteUpsertRow[]; dropped: number }> {
  if (rows.length === 0) return { rows, dropped: 0 };

  // In-batch: keep the earliest roll_call_id per physical key, preserving input order.
  const lowestRcidByKey = new Map<string, number>();
  for (const r of rows) {
    const key = physicalKey(r);
    const rcid = Number(r.roll_call_id);
    if (key == null || !Number.isFinite(rcid)) continue;
    const prev = lowestRcidByKey.get(key);
    if (prev == null || rcid < prev) lowestRcidByKey.set(key, rcid);
  }
  let kept = rows.filter((r) => {
    const key = physicalKey(r);
    if (key == null) return true;
    const winner = lowestRcidByKey.get(key);
    return winner == null || Number(r.roll_call_id) === winner;
  });

  // Against the DB: an existing row for the same physical key under a different
  // roll_call_id means this incoming row is LegiScan's second copy — skip it.
  const billIds = [...new Set(kept.map((r) => String(r.bill_id ?? '')).filter(Boolean))];
  if (billIds.length > 0) {
    const { data, error } = await db
      .from('ky_votes')
      .select('bill_id, roll_call_id, date, description, yea_count, nay_count, absent_count')
      .in('bill_id', billIds);
    if (!error && data) {
      const existingRcidByKey = new Map<string, number>();
      for (const e of data) {
        const key = physicalKey(e);
        const rcid = Number(e.roll_call_id);
        if (key == null || !Number.isFinite(rcid)) continue;
        const prev = existingRcidByKey.get(key);
        if (prev == null || rcid < prev) existingRcidByKey.set(key, rcid);
      }
      kept = kept.filter((r) => {
        const key = physicalKey(r);
        if (key == null) return true;
        const existing = existingRcidByKey.get(key);
        return existing == null || Number(r.roll_call_id) === existing;
      });
    }
  }

  return { rows: kept, dropped: rows.length - kept.length };
}
