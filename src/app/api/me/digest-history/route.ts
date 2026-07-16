import { NextResponse, type NextRequest } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/route-auth';
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';
import { formatDigestEventLabel } from '@/lib/digest/format-digest-event-detail';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

type DigestHistoryBill = {
  id: string;
  bill_number: string | null;
  title: string | null;
  event_type: string;
  event_label: string;
};

type DigestHistoryCommittee = {
  id: string;
  name: string;
  slug: string | null;
  event_type: string;
  event_label: string;
  meeting_date: string | null;
};

type DigestHistoryEntry = {
  id: number;
  sent_at: string;
  digest_window_start: string;
  digest_window_end: string;
  delivery_status: 'sent' | 'failed' | 'bounced';
  bills: DigestHistoryBill[];
  committees: DigestHistoryCommittee[];
};

function committeeEventLabel(eventType: string): string {
  switch (eventType) {
    case 'meeting_scheduled':
      return 'New meeting scheduled';
    case 'agenda_updated':
      return 'Agenda updated';
    case 'meeting_cancelled':
      return 'Meeting cancelled';
    default:
      return 'Committee update';
  }
}

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
    .select('id, sent_at, digest_window_start, digest_window_end, event_ids, committee_event_ids, delivery_status')
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
    committee_event_ids: number[] | null;
  }>;

  if (logRows.length === 0) {
    return NextResponse.json({ entries: [] satisfies DigestHistoryEntry[] });
  }

  const allEventIds = Array.from(
    new Set(logRows.flatMap((r) => (r.event_ids ?? []).filter((n) => Number.isFinite(n)))),
  );
  const allCommitteeEventIds = Array.from(
    new Set(logRows.flatMap((r) => (r.committee_event_ids ?? []).filter((n) => Number.isFinite(n)))),
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
    {
      bill_id: string;
      event_type: string;
      event_payload: Record<string, unknown> | null;
      bill_number: string | null;
      title: string | null;
    }
  >();

  if (allEventIds.length > 0) {
    const evRes = await supabaseAdmin
      .from('ky_bill_status_history')
      .select('id, bill_id, event_type, event_payload')
      .in('id', allEventIds);

    if (evRes.error) {
      console.error('ky_bill_status_history select:', evRes.error);
      return NextResponse.json({ error: evRes.error.message }, { status: 500 });
    }

    const evRows = (evRes.data ?? []) as Array<{
      id: number;
      bill_id: string;
      event_type: string;
      event_payload: Record<string, unknown> | null;
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
        event_payload: row.event_payload,
        bill_number: bill?.bill_number ?? null,
        title: bill?.title ?? null,
      });
    }
  }

  // Committee events (v1.5): name/slug/meeting date live in the event payload.
  const committeeEventMap = new Map<
    number,
    { committee_id: string; event_type: string; name: string; slug: string | null; meeting_date: string | null }
  >();
  if (allCommitteeEventIds.length > 0) {
    const cevRes = await supabaseAdmin
      .from('ky_committee_events')
      .select('id, committee_id, event_type, event_payload')
      .in('id', allCommitteeEventIds);
    if (cevRes.error) {
      console.error('ky_committee_events select:', cevRes.error);
      return NextResponse.json({ error: cevRes.error.message }, { status: 500 });
    }
    for (const row of (cevRes.data ?? []) as Array<{
      id: number;
      committee_id: string;
      event_type: string;
      event_payload: Record<string, unknown> | null;
    }>) {
      const p = row.event_payload ?? {};
      committeeEventMap.set(row.id, {
        committee_id: row.committee_id,
        event_type: row.event_type,
        name: typeof p.committee_name === 'string' ? p.committee_name : 'Committee',
        slug: typeof p.committee_slug === 'string' ? p.committee_slug : null,
        meeting_date: typeof p.meeting_date === 'string' ? p.meeting_date : null,
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
        event_label: formatDigestEventLabel(ev.event_type, ev.event_payload),
      });
    }
    const seenCommittees = new Set<string>();
    const committees: DigestHistoryCommittee[] = [];
    for (const cid of r.committee_event_ids ?? []) {
      const cev = committeeEventMap.get(cid);
      if (!cev) continue;
      const key = `${cev.committee_id}::${cev.event_type}::${cev.meeting_date ?? ''}`;
      if (seenCommittees.has(key)) continue;
      seenCommittees.add(key);
      committees.push({
        id: cev.committee_id,
        name: cev.name,
        slug: cev.slug,
        event_type: cev.event_type,
        event_label: committeeEventLabel(cev.event_type),
        meeting_date: cev.meeting_date,
      });
    }
    return {
      id: r.id,
      sent_at: r.sent_at,
      digest_window_start: r.digest_window_start,
      digest_window_end: r.digest_window_end,
      delivery_status: r.delivery_status,
      bills: expanded,
      committees,
    };
  });

  return NextResponse.json({ entries });
}
