/**
 * LegiScan monthly query counter stored in ky_sync_state (see ky-legiscan-client).
 */
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';

export const LEGISCAN_QUERY_COUNTER_KEY = 'legiscan_query_counter';

/**
 * Bucket keys in the counter payload, since migration 054 / 2026-08-24:
 *
 *   "2026-08"                        month total (authoritative — the guard reads this)
 *   "2026-08:getBill"                per-operation
 *   "2026-08:getBill@accuracy-audit" per-operation, per-caller
 *
 * Months recorded before that only have the first form, so any reader has to
 * treat a missing breakdown as "not instrumented yet", not as zero.
 */
export type LegiscanUsageBucket = {
  month: string;
  /** null on a plain month-total bucket. */
  op: string | null;
  /** null unless the bucket carries an `@caller` suffix. */
  caller: string | null;
};

/** LegiScan operation names are alphanumeric (`getBill`, `getRollCall`, …). */
export function normalizeLegiscanOp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const op = raw.replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
  return op || null;
}

export function parseLegiscanUsageBucket(key: string): LegiscanUsageBucket | null {
  const m = /^(\d{4}-\d{2})(?::([^@]+)(?:@(.+))?)?$/.exec(key);
  if (!m) return null;
  return { month: m[1], op: m[2] ?? null, caller: m[3] ?? null };
}

export type LegiscanOpUsage = {
  op: string;
  count: number;
  /** Descending by count. `untagged` means no caller tag was in scope. */
  byCaller: { caller: string; count: number }[];
};

export type LegiscanMonthUsage = {
  month: string;
  /** The month-total bucket, not a sum of `byOp`. */
  total: number;
  /** Descending by count; empty for a month recorded before instrumentation. */
  byOp: LegiscanOpUsage[];
  /**
   * Calls counted in the month total but carrying no per-op bucket. Non-zero
   * means part of the month predates instrumentation, or an op key was dropped.
   */
  unattributed: number;
};

/** Breaks one month of a `legiscan_query_counter` payload into op/caller detail. */
export function summarizeLegiscanMonthUsage(
  payload: Record<string, unknown> | null | undefined,
  month: string,
): LegiscanMonthUsage {
  const rows = payload ?? {};
  const total = Number(rows[month] ?? 0) || 0;
  const byOp = new Map<string, { count: number; callers: Map<string, number> }>();

  for (const [key, value] of Object.entries(rows)) {
    const parsed = parseLegiscanUsageBucket(key);
    if (!parsed || parsed.month !== month || !parsed.op) continue;
    const count = Number(value) || 0;
    let entry = byOp.get(parsed.op);
    if (!entry) {
      entry = { count: 0, callers: new Map() };
      byOp.set(parsed.op, entry);
    }
    // `month:op` carries the op total; `month:op@caller` splits that same total,
    // so only the former is added to `count` (else every call counts twice).
    if (parsed.caller) {
      entry.callers.set(parsed.caller, (entry.callers.get(parsed.caller) ?? 0) + count);
    } else {
      entry.count += count;
    }
  }

  const ops: LegiscanOpUsage[] = [...byOp.entries()]
    .map(([op, entry]) => ({
      op,
      count: entry.count,
      byCaller: [...entry.callers.entries()]
        .map(([caller, count]) => ({ caller, count }))
        .sort((a, b) => b.count - a.count || a.caller.localeCompare(b.caller)),
    }))
    .sort((a, b) => b.count - a.count || a.op.localeCompare(b.op));

  const attributed = ops.reduce((sum, o) => sum + o.count, 0);
  return { month, total, byOp: ops, unattributed: Math.max(0, total - attributed) };
}

export function legiscanPublicMonthlyLimit(): number {
  const raw = process.env.LEGISCAN_MONTHLY_QUERY_LIMIT?.trim();
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 30_000;
}

export type LegiscanQuotaSummary = {
  month: string;
  used: number;
  limit: number;
  /** Percent used, one decimal */
  pct: number;
};

export async function fetchLegiscanQuotaSummary(): Promise<LegiscanQuotaSummary | null> {
  if (!supabaseAdmin) return null;
  const month = new Date().toISOString().slice(0, 7);
  const { data, error } = await supabaseAdmin
    .from('ky_sync_state')
    .select('payload')
    .eq('key', LEGISCAN_QUERY_COUNTER_KEY)
    .maybeSingle();
  if (error) return null;
  const payload = (data?.payload as Record<string, number> | null) ?? {};
  const used = Number(payload[month] ?? 0);
  const limit = legiscanPublicMonthlyLimit();
  const pct = limit > 0 ? Math.round((used / limit) * 1000) / 10 : 0;
  return { month, used, limit, pct };
}

function envQuotaStopPct(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 1 && n <= 100 ? n : fallback;
}

/** Monthly usage % at which scheduled sync skips LegiScan calls (default 95, same as accuracy audit). */
export function legiscanSyncQuotaStopPct(): number {
  if (process.env.LEGISCAN_SYNC_QUOTA_STOP_PCT?.trim()) {
    return envQuotaStopPct('LEGISCAN_SYNC_QUOTA_STOP_PCT', 95);
  }
  return envQuotaStopPct('ACCURACY_LEGISCAN_QUOTA_STOP_PCT', 95);
}

export type LegiscanQuotaGuardResult = {
  blocked: boolean;
  reason?: string;
  summary: LegiscanQuotaSummary | null;
};

/**
 * Thrown by `KyLegiScanClient.request()` when monthly quota is at/above the sync hold threshold.
 * Caught upstream by sync callers, which mark the run skipped. The bill-detail render path no
 * longer touches LegiScan at all (decisions.md § 2026-06-26), so nothing on the read path catches this.
 */
export class LegiscanQuotaHoldError extends Error {
  readonly summary: LegiscanQuotaSummary | null;
  constructor(message: string, summary: LegiscanQuotaSummary | null) {
    super(message);
    this.name = 'LegiscanQuotaHoldError';
    this.summary = summary;
  }
}

export function isLegiscanQuotaHoldError(err: unknown): err is LegiscanQuotaHoldError {
  return err instanceof Error && err.name === 'LegiscanQuotaHoldError';
}

/** Returns `blocked: true` when monthly LegiScan usage is at/above the sync hold threshold. */
export async function checkLegiscanQuotaForSync(): Promise<LegiscanQuotaGuardResult> {
  const summary = await fetchLegiscanQuotaSummary();
  if (!summary || summary.limit <= 0) {
    return { blocked: false, summary };
  }
  const stopPct = legiscanSyncQuotaStopPct();
  if (summary.pct >= stopPct) {
    return {
      blocked: true,
      reason: `LegiScan quota ${summary.pct}% (>= ${stopPct}% sync hold)`,
      summary,
    };
  }
  return { blocked: false, summary };
}
