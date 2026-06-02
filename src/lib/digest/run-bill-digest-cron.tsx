import * as React from 'react';
import { render } from '@react-email/render';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';
import {
  BillDigestEmail,
  type BillDigestGroup,
  type BillDigestLine,
  type BillDigestSection,
} from '@/lib/email/bill-digest-email';
import {
  KY_DIGEST_MAJOR_MILESTONE_SET,
  type KyDigestEventType,
} from '@/lib/ky-notification-preferences';
import { billMatchesTopicFilters, matchedTopicFilters } from '@/lib/ky-topic-legiscan-mapping';
import { formatDigestEventDetail } from '@/lib/digest/format-digest-event-detail';
import { publicSiteOrigin } from '@/lib/site-canonical';

const DIGEST_CAP = 10;

function milestoneScore(eventType: string): number {
  return KY_DIGEST_MAJOR_MILESTONE_SET.has(eventType as KyDigestEventType) ? 1 : 0;
}

function formatObserved(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
    });
  } catch {
    return iso;
  }
}

function formatDigestDate(d: Date): string {
  try {
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/New_York',
    });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

type HistoryRow = {
  id: number;
  bill_id: string;
  event_type: string;
  event_payload: Record<string, unknown>;
  observed_at: string;
};

type BillRow = {
  id: string;
  bill_number: string | null;
  title: string | null;
  topics: string[] | null;
  legiscan_subjects: Array<{ subject_id?: number; subject_name?: string }> | null;
};

type CommitteeEventRow = {
  id: number;
  committee_id: string;
  meeting_id: string | null;
  event_type: string;
  event_payload: Record<string, unknown>;
  observed_at: string;
};

export type DigestCronResult = {
  ok: boolean;
  dryRun: boolean;
  usersConsidered: number;
  emailsSent: number;
  skippedNoEvents: number;
  errors: string[];
  samples?: { email: string; eventCount: number; previewHtml?: string; previewSubject?: string }[];
};

export type RunBillDigestCronOptions = {
  dryRun?: boolean;
  /** Limit to specific user ids (E2E preview). */
  onlyUserIds?: string[];
  /** When true (and dryRun), include rendered HTML in samples. */
  renderPreview?: boolean;
  /** Override the "force send" filter so we ignore prior-window logs (preview only). */
  ignoreLastSentWindow?: boolean;
};

export async function runBillDigestCron(opts: RunBillDigestCronOptions = {}): Promise<DigestCronResult> {
  const dryRun = opts.dryRun === true || process.env.DIGEST_DRY_RUN === 'true';
  const onlyUserIds = opts.onlyUserIds && opts.onlyUserIds.length ? new Set(opts.onlyUserIds) : null;
  const renderPreview = dryRun && opts.renderPreview === true;
  const errors: string[] = [];
  let usersConsidered = 0;
  let emailsSent = 0;
  let skippedNoEvents = 0;
  const samples: { email: string; eventCount: number }[] = [];

  if (!supabaseAdmin) {
    return {
      ok: false,
      dryRun,
      usersConsidered: 0,
      emailsSent: 0,
      skippedNoEvents: 0,
      errors: ['supabaseAdmin not configured'],
    };
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'alerts@kyvky.com';
  const resend = resendKey && !dryRun ? new Resend(resendKey) : null;

  const now = new Date();
  const dow = now.getUTCDay();
  const windowEnd = now.toISOString();

  const { data: prefsRows, error: prefsErr } = await supabaseAdmin
    .from('ky_notification_preferences')
    .select('user_id, digest_frequency, event_types, topic_filters, unsubscribe_token')
    .neq('digest_frequency', 'off')
    .is('unsubscribed_all_at', null)
    .is('suppressed_at', null);

  if (prefsErr) {
    return {
      ok: false,
      dryRun,
      usersConsidered: 0,
      emailsSent: 0,
      skippedNoEvents: 0,
      errors: [prefsErr.message],
    };
  }

  const prefs = (prefsRows ?? []).filter((p) => {
    if (onlyUserIds && !onlyUserIds.has(p.user_id as string)) return false;
    if (onlyUserIds) return true; // bypass weekly-day gate in targeted preview
    if (p.digest_frequency === 'weekly') return dow === 1;
    return p.digest_frequency === 'daily';
  });

  if (!prefs.length) {
    return { ok: true, dryRun, usersConsidered: 0, emailsSent: 0, skippedNoEvents: 0, errors: [] };
  }

  const userIds = prefs.map((p) => p.user_id as string);
  const { data: profiles, error: profErr } = await supabaseAdmin
    .from('ky_user_profiles')
    .select('user_id, email')
    .in('user_id', userIds);

  if (profErr) {
    errors.push(profErr.message);
  }

  const emailByUser = new Map<string, string>();
  for (const r of profiles ?? []) {
    if (r.user_id && r.email) emailByUser.set(String(r.user_id), String(r.email));
  }

  const globalWindowStart = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const { data: historyRows, error: histErr } = await supabaseAdmin
    .from('ky_bill_status_history')
    .select('id, bill_id, event_type, event_payload, observed_at')
    .gte('observed_at', globalWindowStart)
    .lt('observed_at', windowEnd)
    .order('observed_at', { ascending: false })
    .limit(8000);

  if (histErr) {
    return {
      ok: false,
      dryRun,
      usersConsidered: 0,
      emailsSent: 0,
      skippedNoEvents: 0,
      errors: [histErr.message],
    };
  }

  const history = (historyRows ?? []) as HistoryRow[];
  const billIds = [...new Set(history.map((h) => h.bill_id))];
  const billById = new Map<string, BillRow>();

  const CHUNK = 400;
  for (let i = 0; i < billIds.length; i += CHUNK) {
    const chunk = billIds.slice(i, i + CHUNK);
    const { data: bills } = await supabaseAdmin
      .from('ky_bills')
      .select('id, bill_number, title, topics, legiscan_subjects')
      .in('id', chunk);
    for (const b of bills ?? []) {
      billById.set(String(b.id), b as BillRow);
    }
  }

  for (const pref of prefs) {
    usersConsidered++;
    const uid = pref.user_id as string;
    const email = emailByUser.get(uid);
    if (!email?.includes('@')) {
      errors.push(`No email for user ${uid}`);
      continue;
    }

    const windowMs = pref.digest_frequency === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    let windowStart = new Date(now.getTime() - windowMs).toISOString();

    const { data: lastLog } = await supabaseAdmin
      .from('ky_notifications_log')
      .select('digest_window_end')
      .eq('user_id', uid)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastLog?.digest_window_end && !opts.ignoreLastSentWindow) {
      const le = new Date(lastLog.digest_window_end as string).getTime();
      if (!Number.isNaN(le) && le > new Date(windowStart).getTime()) {
        windowStart = new Date(le).toISOString();
      }
    }

    const { data: follows } = await supabaseAdmin
      .from('ky_bill_follows')
      .select('bill_id')
      .eq('user_id', uid)
      .eq('snoozed', false);
    const followedSet = new Set((follows ?? []).map((f) => String(f.bill_id)));

    const allowedTypes = new Set((pref.event_types as string[]) ?? []);
    const topicFilters = (pref.topic_filters as string[]) ?? [];

    const candidates = history.filter((h) => {
      if (new Date(h.observed_at) < new Date(windowStart)) return false;
      if (!allowedTypes.has(h.event_type)) return false;
      const bill = billById.get(String(h.bill_id));
      if (!bill) return false;
      if (followedSet.has(String(h.bill_id))) return true;
      return billMatchesTopicFilters(bill.topics, bill.legiscan_subjects, topicFilters);
    });

    // Fetch committee follows + events when the user has opted into committee_meeting_scheduled.
    const committeeGroups: BillDigestGroup[] = [];
    if (allowedTypes.has('committee_meeting_scheduled')) {
      const { data: committeeFollows } = await supabaseAdmin
        .from('ky_committee_follows')
        .select('committee_id')
        .eq('user_id', uid);
      const followedCommitteeIds = new Set((committeeFollows ?? []).map((f) => String(f.committee_id)));

      if (followedCommitteeIds.size > 0) {
        const { data: committeeEvents } = await supabaseAdmin
          .from('ky_committee_events')
          .select('id, committee_id, event_type, event_payload, observed_at')
          .in('committee_id', [...followedCommitteeIds])
          .eq('event_type', 'meeting_scheduled')
          .gte('observed_at', windowStart)
          .lt('observed_at', windowEnd)
          .order('observed_at', { ascending: false })
          .limit(20);

        const origin = publicSiteOrigin();
        for (const ev of (committeeEvents ?? []) as CommitteeEventRow[]) {
          const payload = ev.event_payload;
          const committeeName = String(payload.committee_name ?? 'Committee');
          const committeeSlug = String(payload.committee_slug ?? ev.committee_id);
          const meetingDate = String(payload.meeting_date ?? '');
          const timeAndLocation = payload.time_and_location ? String(payload.time_and_location) : null;
          const detail = timeAndLocation
            ? `New meeting: ${meetingDate} — ${timeAndLocation}`
            : `New meeting: ${meetingDate}`;
          committeeGroups.push({
            billNumber: committeeName,
            billTitle: 'New meeting added to the calendar',
            billHref: `${origin}/committees/${encodeURIComponent(committeeSlug)}`,
            lines: [{ detail, observedAt: formatObserved(ev.observed_at) }],
          });
        }
      }
    }

    if (!candidates.length && !committeeGroups.length) {
      skippedNoEvents++;
      continue;
    }

    const scored = candidates.map((h) => ({
      ...h,
      ms: milestoneScore(h.event_type),
    }));
    scored.sort((a, b) => b.ms - a.ms || new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime());
    const top = scored.slice(0, DIGEST_CAP);
    const overflow = Math.max(0, scored.length - DIGEST_CAP);

    const byBill = new Map<string, HistoryRow[]>();
    for (const h of top) {
      const k = String(h.bill_id);
      if (!byBill.has(k)) byBill.set(k, []);
      byBill.get(k)!.push(h);
    }

    const origin = publicSiteOrigin();
    const followedGroups: BillDigestGroup[] = [];
    const topicGroups: BillDigestGroup[] = [];
    for (const [billId, evs] of byBill) {
      const bill = billById.get(billId);
      if (!bill) continue;
      // Lead each line with the raw last-action text; dedupe identical actions
      // (one transition can emit several event rows, e.g. passed_chamber + floor_vote).
      const seenDetails = new Set<string>();
      const lines: BillDigestLine[] = [];
      for (const h of evs) {
        const detail = formatDigestEventDetail(
          h.event_type,
          h.event_payload as Record<string, unknown>,
          bill.title,
        );
        const key = detail.trim().toLowerCase();
        if (!key || seenDetails.has(key)) continue;
        seenDetails.add(key);
        lines.push({ detail, observedAt: formatObserved(h.observed_at) });
      }
      const group: BillDigestGroup = {
        billNumber: bill.bill_number || 'Bill',
        billTitle: bill.title || '',
        billHref: `${origin}/bills/${billId}`,
        lines,
      };
      if (followedSet.has(billId)) {
        followedGroups.push(group);
      } else {
        group.matchedTopics = matchedTopicFilters(bill.topics, bill.legiscan_subjects, topicFilters);
        topicGroups.push(group);
      }
    }

    const sections: BillDigestSection[] = [
      { heading: 'Bills you follow', groups: followedGroups },
      { heading: 'From topics you follow', groups: topicGroups },
      { heading: 'Committees you follow', groups: committeeGroups },
    ].filter((s) => s.groups.length > 0);

    if (!sections.length) {
      skippedNoEvents++;
      continue;
    }
    const totalBills = followedGroups.length + topicGroups.length;
    const totalItems = totalBills + committeeGroups.length;

    const unsubscribeToken = pref.unsubscribe_token as string;
    const unsubscribeHref = `${origin}/api/unsubscribe/${unsubscribeToken}`;
    const followedBillsHref = `${origin}/bills?follows=me`;
    const preferencesHref = `${origin}/profile#notifications`;
    const privacyHref = `${origin}/privacy`;
    const termsHref = `${origin}/terms`;

    const previewText = `${totalItems} update${totalItems === 1 ? '' : 's'} from bills and committees you follow`;
    const subject = `Kentucky bill digest — ${formatDigestDate(now)}`;

    const needsHtml = renderPreview || !(dryRun || !resend);
    const emailEl = (
      <BillDigestEmail
        previewText={previewText}
        sections={sections}
        moreCount={overflow}
        followedBillsHref={followedBillsHref}
        preferencesHref={preferencesHref}
        unsubscribeHref={unsubscribeHref}
        privacyHref={privacyHref}
        termsHref={termsHref}
      />
    );
    const html = needsHtml ? await render(emailEl) : '';
    const text = needsHtml ? await render(emailEl, { plainText: true }) : '';

    if (dryRun || !resend) {
      if (samples.length < 3) {
        samples.push({
          email,
          eventCount: top.length,
          ...(renderPreview ? { previewHtml: html, previewSubject: subject } : {}),
        });
      }
      continue;
    }

    try {
      const { data: sendData, error: sendErr } = await resend.emails.send({
        from: fromEmail,
        to: email,
        replyTo: 'katie@kyvky.com',
        subject,
        html,
        text,
        headers: {
          'List-Unsubscribe': `<${unsubscribeHref}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
      if (sendErr) {
        errors.push(`${email}: ${sendErr.message}`);
        await supabaseAdmin.from('ky_notifications_log').insert({
          user_id: uid,
          digest_window_start: windowStart,
          digest_window_end: windowEnd,
          event_ids: top.map((t) => t.id),
          delivery_status: 'failed',
        });
        continue;
      }
      emailsSent++;
      await supabaseAdmin.from('ky_notifications_log').insert({
        user_id: uid,
        digest_window_start: windowStart,
        digest_window_end: windowEnd,
        event_ids: top.map((t) => t.id),
        resend_message_id: sendData?.id ?? null,
        delivery_status: 'sent',
      });
    } catch (e) {
      errors.push(`${email}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    ok: errors.length === 0,
    dryRun,
    usersConsidered,
    emailsSent,
    skippedNoEvents,
    errors,
    samples: dryRun ? samples : undefined,
  };
}
