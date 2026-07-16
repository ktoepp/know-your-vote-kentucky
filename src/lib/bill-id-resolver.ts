import type { SupabaseClient } from '@supabase/supabase-js';
import { parseKyBillSlug } from '@/lib/ky-bill-slug';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve a bill identifier from the URL to the canonical `ky_bills.id` UUID.
 * Accepts a UUID directly, a canonical slug ("hb208-2026rs"), or a bill number
 * like "HB1" / "hb 1" (newest session wins). Returns null when no matching row exists.
 */
export async function resolveBillUuid(
  supabase: SupabaseClient,
  raw: string,
): Promise<string | null> {
  if (UUID_RE.test(raw)) return raw;

  const slugParts = parseKyBillSlug(raw);
  if (slugParts) {
    const { data } = await supabase
      .from('ky_bills')
      .select('id')
      .ilike('bill_number', slugParts.billNumber)
      .eq('session', slugParts.session)
      .order('last_action_date', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  }

  const normalised = raw.toUpperCase().replace(/\s+/g, '');
  const { data } = await supabase
    .from('ky_bills')
    .select('id')
    .ilike('bill_number', normalised)
    .order('session', { ascending: false })
    .order('last_action_date', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}
