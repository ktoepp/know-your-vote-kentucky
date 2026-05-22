import { NextResponse, type NextRequest } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/route-auth';
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';
import { formatDigestEventDetail, formatDigestEventLabel } from '@/lib/digest/format-digest-event-detail';
import { kyTodayIso, normalizeKyGaAgendaLine, normalizeKyGaDisplayName } from '@/lib/ky-committee-display';
import { KY_TOPICS } from '@/lib/ky-topic-classifier';
import {
  billMatchesTopicFilters,
  topicsForLegiScanSubjects,
} from '@/lib/ky-topic-legiscan-mapping';

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 80;

export type ProfileActivityKindFilter = 'all' | 'bill' | 'hearing';

function parseKindFilter(raw: string | null): ProfileActivityKindFilter {
  if (raw === 'bill' || raw === 'hearing') return raw;
  return 'all';
}

function parseTopicFilter(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const topic = raw.trim();
  return (KY_TOPICS as readonly string[]).includes(topic) ? topic : null;
}

const AGENDA_SELECT = `
  id,
  raw_text,
  ky_bill_id,
  bill_number,
  ky_committee_meetings (
    meeting_date,
    time_and_location,
    ky_committees ( name, slug )
  )
`;

export type ProfileActivityItem = {
  id: string;
  kind: 'bill_event' | 'hearing';
  occurred_at: string;
  bill_id: string | null;
  bill_number: string | null;
  bill_title: string | null;
  label: string;
  href: string;
  detail: string | null;
};

type BillMeta = {
  bill_number: string | null;
  title: string | null;
  topics: string[] | null;
  legiscan_subjects: unknown;
};

function collectBillTopics(meta: BillMeta): string[] {
  const out = new Set<string>();
  for (const t of meta.topics ?? []) {
    if (t) out.add(t);
  }
  for (const t of topicsForLegiScanSubjects(
    meta.legiscan_subjects as { subject_name?: string | null }[] | null,
  )) {
    out.add(t);
  }
  return Array.from(out).sort((a, b) => a.localeCompare(b));
}

export async function GET(request: NextRequest) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const kindFilter = parseKindFilter(url.searchParams.get('kind'));
  const topicFilter = parseTopicFilter(url.searchParams.get('topic'));

  const followsRes = await auth.supabase
    .from('ky_bill_follows')
    .select('bill_id, ky_bills ( id, bill_number, title, topics, legiscan_subjects )')
    .order('created_at', { ascending: false });

  if (followsRes.error) {
    return NextResponse.json({ error: followsRes.error.message }, { status: 500 });
  }

  const billIds: string[] = [];
  const billMeta = new Map<string, BillMeta>();
  const availableTopics = new Set<string>();

  for (const row of followsRes.data ?? []) {
    const id = row.bill_id as string;
    if (!id) continue;
    billIds.push(id);
    const b = row.ky_bills as {
      id?: string;
      bill_number?: string | null;
      title?: string | null;
      topics?: string[] | null;
      legiscan_subjects?: unknown;
    } | null;
    const meta: BillMeta = {
      bill_number: b?.bill_number ?? null,
      title: b?.title ?? null,
      topics: b?.topics ?? null,
      legiscan_subjects: b?.legiscan_subjects ?? null,
    };
    billMeta.set(id, meta);
    for (const t of collectBillTopics(meta)) availableTopics.add(t);
  }

  if (billIds.length === 0) {
    return NextResponse.json({
      items: [] satisfies ProfileActivityItem[],
      kind: kindFilter,
      topic: topicFilter,
      availableTopics: [],
    });
  }

  const items: ProfileActivityItem[] = [];
  const today = kyTodayIso();
  const hearingKeysFromHistory = new Set<string>();

  if (supabaseAdmin) {
    const historyRes = await supabaseAdmin
      .from('ky_bill_status_history')
      .select('id, bill_id, event_type, event_payload, observed_at')
      .in('bill_id', billIds)
      .order('observed_at', { ascending: false })
      .limit(limit);

    for (const row of historyRes.data ?? []) {
      const billId = row.bill_id as string;
      const meta = billMeta.get(billId);
      const eventType = row.event_type as string;
      const payload = (row.event_payload ?? {}) as Record<string, unknown>;
      const label = formatDigestEventLabel(eventType, payload);

      const detail = formatDigestEventDetail(eventType, payload, meta?.title ?? null) || null;
      if (eventType === 'hearing_scheduled' && typeof payload.meeting_date === 'string') {
        hearingKeysFromHistory.add(`${billId}|${payload.meeting_date}`);
      }

      items.push({
        id: `history-${row.id}`,
        kind: 'bill_event',
        occurred_at: row.observed_at as string,
        bill_id: billId,
        bill_number: meta?.bill_number ?? null,
        bill_title: meta?.title ?? null,
        label,
        href: `/bills/${billId}`,
        detail,
      });
    }
  }

  const agendaRes = await auth.supabase
    .from('ky_committee_agenda_items')
    .select(AGENDA_SELECT)
    .in('ky_bill_id', billIds)
    .limit(limit * 3);

  for (const row of agendaRes.data ?? []) {
    const billId = row.ky_bill_id as string | null;
    if (!billId) continue;
    const meta = billMeta.get(billId);
    const meeting = row.ky_committee_meetings as {
      meeting_date?: string;
      time_and_location?: string | null;
      ky_committees?: { name?: string; slug?: string } | null;
    } | null;
    const committee = meeting?.ky_committees;
    const meetingDate = meeting?.meeting_date;
    if (!meetingDate || meetingDate < today) continue;
    if (hearingKeysFromHistory.has(`${billId}|${meetingDate}`)) continue;

    const committeeName = committee?.name ? normalizeKyGaDisplayName(committee.name) : 'Committee';
    const detailParts = [
      committeeName,
      meeting.time_and_location,
    ].filter(Boolean);

    items.push({
      id: `hearing-${row.id}`,
      kind: 'hearing',
      occurred_at: `${meetingDate}T12:00:00.000Z`,
      bill_id: billId,
      bill_number: meta?.bill_number ?? row.bill_number ?? null,
      bill_title: meta?.title ?? null,
      label: 'Hearing on committee agenda',
      href: `/bills/${billId}`,
      detail: `${detailParts.join(' · ')} · ${normalizeKyGaAgendaLine(row.raw_text as string)}`,
    });
  }

  items.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

  let filtered =
    kindFilter === 'all'
      ? items
      : items.filter((item) =>
          kindFilter === 'hearing' ? item.kind === 'hearing' : item.kind === 'bill_event',
        );

  if (topicFilter) {
    filtered = filtered.filter((item) => {
      if (!item.bill_id) return false;
      const meta = billMeta.get(item.bill_id);
      if (!meta) return false;
      return billMatchesTopicFilters(meta.topics, meta.legiscan_subjects as never, [topicFilter]);
    });
  }

  return NextResponse.json({
    items: filtered.slice(0, limit),
    kind: kindFilter,
    topic: topicFilter,
    availableTopics: Array.from(availableTopics).sort((a, b) => a.localeCompare(b)),
  });
}
