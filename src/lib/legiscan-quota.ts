/**
 * LegiScan monthly query counter stored in ky_sync_state (see ky-legiscan-client).
 */
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';

export const LEGISCAN_QUERY_COUNTER_KEY = 'legiscan_query_counter';

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
 * Caught upstream by sync callers (mark the run skipped) and by bill-detail render (fall back to DB).
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
