import { NextResponse, type NextRequest } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/route-auth';
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';
import {
  KY_DIGEST_EVENT_LABELS,
  type KyDigestEventType,
} from '@/lib/ky-notification-preferences';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

type DigestHistoryBill = {
  id: string;
  bill_number: string | null;
  title: string | null;
  event_type: string;
  event_label: string;
};

type DigestHistoryEntry = {
  id: number;
  sent_at: string;
  digest_window_start: string;
  digest_window_end: string;
  delivery_status: 'sent' | 'failed' | 'bounced';
  bills: DigestHistoryBill[];
};

export async function GET(request: NextRequest) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const logRes = await auth.supabase
    .from('ky_notifications_log')
    .select('id, sent_at, digest_window_start, digest_window_end, event_ids, delivery_status')
    .eq('delivery_status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (logRes.error) {
    console.error('ky_notifications_log select:', logRes.error);
    return NextResponse.json({ error: logRes.error.message }, { status: 500 });
  }

  const logRows = (logRes.data ?? []) as Array<{
    id: number;
    sent_at: string;
    digest_window_start: string;
    digest_window_end: string;
    delivery_status: 'sent' | 'failed' | 'bounced';
    event_ids: number[] | null;
  }>;

  if (logRows.length === 0) {
    return NextResponse.json({ entries: [] satisfies DigestHistoryEntry[] });
  }

  const allEventIds = Array.from(
    new Set(logRows.flatMap((r) => (r.event_ids ?? []).filter((n) => Number.isFinite(n)))),
  );

  // ky_bill_status_history is service-role only; admin client required to expand event_ids.
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'History expansion is not configured on this server.' },
      { status: 503 },
    );
  }

  const eventMap = new Map<
    number,
    { bill_id: string; event_type: string; bill_number: string | null; title: string | null }
  >();

  if (allEventIds.length > 0) {
    const evRes = await supabaseAdmin
      .from('ky_bill_status_history')
      .select('id, bill_id, event_type')
      .in('id', allEventIds);

    if (evRes.error) {
      console.error('ky_bill_status_history select:', evRes.error);
      return NextResponse.json({ error: evRes.error.message }, { status: 500 });
    }

    const evRows = (evRes.data ?? []) as Array<{
      id: number;
      bill_id: string;
      event_type: string;
    }>;

    const billIds = Array.from(new Set(evRows.map((r) => r.bill_id)));
    const billMap = new Map<string, { bill_number: string | null; title: string | null }>();

    if (billIds.length > 0) {
      const billRes = await supabaseAdmin
        .from('ky_bills')
        .select('id, bill_number, title')
        .in('id', billIds);
      if (billRes.error) {
        console.error('ky_bills select:', billRes.error);
        return NextResponse.json({ error: billRes.error.message }, { status: 500 });
      }
      for (const b of (billRes.data ?? []) as Array<{
        id: string;
        bill_number: string | null;
        title: string | null;
      }>) {
        billMap.set(b.id, { bill_number: b.bill_number, title: b.title });
      }
    }

    for (const row of evRows) {
      const bill = billMap.get(row.bill_id);
      eventMap.set(row.id, {
        bill_id: row.bill_id,
        event_type: row.event_type,
        bill_number: bill?.bill_number ?? null,
        title: bill?.title ?? null,
      });
    }
  }

  const entries: DigestHistoryEntry[] = logRows.map((r) => {
    const ids = r.event_ids ?? [];
    // Dedupe by bill so the same bill doesn't appear twice per digest when it had multiple events.
    const seenBills = new Set<string>();
    const expanded: DigestHistoryBill[] = [];
    for (const eid of ids) {
      const ev = eventMap.get(eid);
      if (!ev) continue;
      if (seenBills.has(ev.bill_id)) continue;
      seenBills.add(ev.bill_id);
      expanded.push({
        id: ev.bill_id,
        bill_number: ev.bill_number,
        title: ev.title,
        event_type: ev.event_type,
        event_label:
          KY_DIGEST_EVENT_LABELS[ev.event_type as KyDigestEventType] ?? ev.event_type,
      });
    }
    return {
      id: r.id,
      sent_at: r.sent_at,
      digest_window_start: r.digest_window_start,
      digest_window_end: r.digest_window_end,
      delivery_status: r.delivery_status,
      bills: expanded,
    };
  });

  return NextResponse.json({ entries });
}
