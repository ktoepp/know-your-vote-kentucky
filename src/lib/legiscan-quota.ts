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
