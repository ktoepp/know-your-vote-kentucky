import * as React from 'react';
import { render } from 'react-email';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';
import {
  BillDigestEmail,
  joinWithAnd,
  type BillDigestGroup,
  type BillDigestLine,
  type BillDigestSection,
  type DigestBillProgress,
} from '@/lib/email/bill-digest-email';
import { getBillProgress } from '@/lib/ky-bill-progress';
import type { KYBill } from '@/types/kentucky';
import {
  KY_DIGEST_MAJOR_MILESTONE_SET,
  type KyDigestEventType,
} from '@/lib/ky-notification-preferences';
import { billMatchesTopicFilters, matchedTopicFilters } from '@/lib/ky-topic-legiscan-mapping';
import {
  formatDigestEventDetail,
  formatDigestEventLabel,
  formatMeetingDate,
} from '@/lib/digest/format-digest-event-detail';
import { publicSiteOrigin } from '@/lib/site-canonical';
import { kyBillSlug } from '@/lib/ky-bill-slug';
import { KYVKY_POSTAL_ADDRESS } from '@/lib/kyvky-contact';

const DIGEST_CAP = 10;
/** Committee updates get their own cap; the remainder counts toward the overflow line. */
const COMMITTEE_DIGEST_CAP = 10;

function milestoneScore(eventType: string): number {
  return KY_DIGEST_MAJOR_MILESTONE_SET.has(eventType as KyDigestEventType) ? 1 : 0;
}

/**
 * Calendar date we recorded the event ("Jul 15"), rendered in the email as
 * "(recorded Jul 15)". Deliberately date-only: `observed_at` is when our sync
 * noticed the event, not when the legislature acted, so a clock time would
 * overstate what we know.
 */
function formatObserved(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'America/New_York',
    });
  } catch {
    return iso;
  }
}

/** Short subject-line date ("Jul 16") — the counts carry the information. */
function formatDigestDateShort(d: Date): string {
  try {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
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
  session: string | null;
  status: string | null;
  last_action: string | null;
  chamber: 'house' | 'senate' | null;
  topics: string[] | null;
  legiscan_subjects: Array<{ subject_id?: number; subject_name?: string }> | null;
  official_short_titles: string[] | null;
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
    .select('user_id, email, email_verified_at')
    .in('user_id', userIds);

  if (profErr) {
    errors.push(profErr.message);
  }

  const emailByUser = new Map<string, string>();
  for (const r of profiles ?? []) {
    if (r.user_id && r.email && r.email_verified_at) {
      emailByUser.set(String(r.user_id), String(r.email));
    }
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
      .select('id, bill_number, title, session, status, last_action, chamber, topics, legiscan_subjects, official_short_titles')
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

    // Only delivered digests advance the window — a 'failed' send must not
    // swallow its window's events, or they are never delivered at all.
    const { data: lastLog } = await supabaseAdmin
      .from('ky_notifications_log')
      .select('digest_window_end')
      .eq('user_id', uid)
      .neq('delivery_status', 'failed')
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

    // Fetch committee follows + events for whichever committee event types the user opted into.
    // v1 had a single `committee_meeting_scheduled` toggle; v1.5 adds `committee_agenda_updated`
    // and `committee_meeting_cancelled` as separate toggles (mapped to the matching DB
    // event_type values minus the `committee_` prefix).
    const committeeGroups: BillDigestGroup[] = [];
    let committeeOverflow = 0;
    let committeeEventIds: number[] = [];
    const committeeEventTypeMap: Record<string, KyDigestEventType> = {
      meeting_scheduled: 'committee_meeting_scheduled',
      agenda_updated: 'committee_agenda_updated',
      meeting_cancelled: 'committee_meeting_cancelled',
    };
    const wantedCommitteeTypes = (
      Object.keys(committeeEventTypeMap) as Array<keyof typeof committeeEventTypeMap>
    ).filter((k) => allowedTypes.has(committeeEventTypeMap[k]));

    if (wantedCommitteeTypes.length > 0) {
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
          .in('event_type', wantedCommitteeTypes)
          .gte('observed_at', windowStart)
          .lt('observed_at', windowEnd)
          .order('observed_at', { ascending: false })
          .limit(40);

        const origin = publicSiteOrigin();
        const rows = (committeeEvents ?? []) as CommitteeEventRow[];

        // "Agenda updated" carries no new information when the same meeting's
        // "New meeting" announcement is already in this digest — suppress it.
        const scheduledMeetingKeys = new Set(
          rows
            .filter((ev) => ev.event_type === 'meeting_scheduled')
            .map((ev) => `${ev.committee_id}::${String(ev.event_payload.meeting_date ?? '')}`),
        );

        const seenCommitteeEvents = new Set<string>();
        const keptEvents: Array<{
          id: number;
          committeeId: string;
          committeeName: string;
          committeeSlug: string;
          detail: string;
          observedAtIso: string;
        }> = [];
        for (const ev of rows) {
          const payload = ev.event_payload;
          const committeeName = typeof payload.committee_name === 'string' ? payload.committee_name.trim() : '';
          if (!committeeName) continue; // nothing to identify the committee by
          const committeeSlug = String(payload.committee_slug ?? ev.committee_id);
          const meetingDate = String(payload.meeting_date ?? '');
          const timeAndLocation = payload.time_and_location ? String(payload.time_and_location) : null;
          const locSuffix = timeAndLocation ? ` — ${timeAndLocation}` : '';
          const friendlyDate = meetingDate ? formatMeetingDate(meetingDate) : 'date not listed';

          if (
            ev.event_type === 'agenda_updated' &&
            scheduledMeetingKeys.has(`${ev.committee_id}::${meetingDate}`)
          ) {
            continue;
          }
          const dedupeKey = [ev.committee_id, ev.event_type, meetingDate, timeAndLocation ?? ''].join('::');
          if (seenCommitteeEvents.has(dedupeKey)) continue;
          seenCommitteeEvents.add(dedupeKey);

          let detail: string;
          switch (ev.event_type) {
            case 'agenda_updated':
              detail = `Agenda updated: ${friendlyDate}${locSuffix}`;
              break;
            case 'meeting_cancelled':
              detail = `Meeting cancelled: ${friendlyDate}${locSuffix}`;
              break;
            case 'meeting_scheduled':
            default:
              detail = `New meeting: ${friendlyDate}${locSuffix}`;
              break;
          }
          keptEvents.push({
            id: ev.id,
            committeeId: ev.committee_id,
            committeeName,
            committeeSlug,
            detail,
            observedAtIso: ev.observed_at,
          });
        }

        // Rows arrive newest-first, so the slice keeps the most recent updates;
        // the remainder counts toward the overflow line.
        const shownEvents = keptEvents.slice(0, COMMITTEE_DIGEST_CAP);
        committeeOverflow = keptEvents.length - shownEvents.length;
        committeeEventIds = shownEvents.map((e) => e.id);

        // Oldest first within the section, matching the bills' story order.
        shownEvents.sort(
          (a, b) => new Date(a.observedAtIso).getTime() - new Date(b.observedAtIso).getTime(),
        );
        const byCommittee = new Map<string, BillDigestGroup>();
        for (const ev of shownEvents) {
          let group = byCommittee.get(ev.committeeId);
          if (!group) {
            group = {
              billNumber: ev.committeeName,
              billTitle: '',
              billHref: `${origin}/committees/${encodeURIComponent(ev.committeeSlug)}`,
              lines: [],
            };
            byCommittee.set(ev.committeeId, group);
            committeeGroups.push(group);
          }
          group.lines.push({ detail: ev.detail, observedAt: formatObserved(ev.observedAtIso) });
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

    // Resolve each event to its display line, then dedupe identical actions on the
    // same bill (one transition can emit several event rows, e.g. passed_chamber +
    // floor_vote) BEFORE capping, so the overflow count matches reality. When the
    // payload has no last-action text, fall back to the event label ("Floor action")
    // rather than repeating the bill title as if it were the event. The dedupe key
    // includes the recorded date so distinct events that share fallback text
    // (three "New cosponsor" days apart) are not collapsed into one.
    const seenDetails = new Set<string>();
    const deduped: Array<HistoryRow & { ms: number; detail: string }> = [];
    for (const h of scored) {
      const bill = billById.get(String(h.bill_id));
      if (!bill) continue;
      if (!bill.bill_number && !bill.title) continue; // nothing to identify the bill by
      const payload = h.event_payload as Record<string, unknown>;
      const detail =
        formatDigestEventDetail(h.event_type, payload, null, { hearingVerb: true }) ||
        formatDigestEventLabel(h.event_type, payload);
      const key = `${h.bill_id}::${detail.trim().toLowerCase()}::${formatObserved(h.observed_at)}`;
      if (!detail.trim() || seenDetails.has(key)) continue;
      seenDetails.add(key);
      deduped.push({ ...h, detail });
    }
    const top = deduped.slice(0, DIGEST_CAP);
    const overflow = deduped.length - top.length + committeeOverflow;

    const byBill = new Map<string, Array<HistoryRow & { detail: string }>>();
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
      // Oldest first within a bill, so multiple events read in story order.
      evs.sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime());
      const lines: BillDigestLine[] = evs.map((h) => ({
        detail: h.detail,
        observedAt: formatObserved(h.observed_at),
      }));
      // Generalized 4-stage progress meter, same derivation as the site (bills
      // with a usable status only).
      let progress: DigestBillProgress | undefined;
      if (bill.bill_number && bill.status) {
        const p = getBillProgress({
          bill_number: bill.bill_number,
          status: bill.status,
          last_action: bill.last_action,
          chamber: bill.chamber,
          session: bill.session,
        } as KYBill);
        progress = {
          stageLabels: p.stages.map((s) => s.label),
          reachedIndex: p.reachedIndex,
          // The email meter only distinguishes vetoed vs stopped; an adjourned-sine-die
          // bill renders like any other stopped bill.
          terminal: p.terminal === 'adjourned' ? 'failed' : p.terminal,
        };
      }
      const group: BillDigestGroup = {
        billNumber: bill.bill_number || '',
        billTitle: bill.title || '',
        // Official short title only (neutral); the first when a bill carries several. Media
        // names (editorial_popular_names) are deliberately kept out of the digest for now.
        shortTitle: bill.official_short_titles?.[0] ?? undefined,
        billHref: `${origin}/bills/${(bill.bill_number && kyBillSlug({ bill_number: bill.bill_number, session: bill.session })) || billId}`,
        progress,
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
      { heading: 'Topics you follow', groups: topicGroups },
      { heading: 'Committees you follow', groups: committeeGroups },
    ].filter((s) => s.groups.length > 0);

    if (!sections.length) {
      skippedNoEvents++;
      continue;
    }
    const totalBills = followedGroups.length + topicGroups.length;
    const committeeUpdateCount = committeeGroups.reduce((n, g) => n + g.lines.length, 0);

    const unsubscribeToken = pref.unsubscribe_token as string;
    const unsubscribeHref = `${origin}/api/unsubscribe/${unsubscribeToken}`;
    // Profile activity covers followed bills and committees (NOT topic-matched
    // bills) — the overflow copy in the template is scoped to match. When
    // topic-matched updates were cut, the closest destination is the bills
    // browse filtered by topic, so surface those topics alongside.
    const moreHref = `${origin}/profile#activity`;
    const overflowTopicSet = new Set<string>();
    for (const h of deduped.slice(DIGEST_CAP)) {
      if (followedSet.has(String(h.bill_id))) continue;
      const bill = billById.get(String(h.bill_id));
      if (!bill) continue;
      for (const t of matchedTopicFilters(bill.topics, bill.legiscan_subjects, topicFilters)) {
        overflowTopicSet.add(t);
      }
    }
    const glossaryHref = `${origin}/glossary`;
    const preferencesHref = `${origin}/profile#notifications`;
    const privacyHref = `${origin}/privacy`;
    const termsHref = `${origin}/terms`;

    // Describe only what this digest actually contains.
    const previewParts: string[] = [];
    if (totalBills > 0) {
      previewParts.push(`${totalBills} bill${totalBills === 1 ? '' : 's'} with new activity`);
    }
    if (committeeUpdateCount > 0) {
      previewParts.push(`${committeeUpdateCount} committee update${committeeUpdateCount === 1 ? '' : 's'}`);
    }
    const previewText = joinWithAnd(previewParts);
    const scopeParts: string[] = [];
    if (followedGroups.length > 0) scopeParts.push('bills');
    if (topicGroups.length > 0) scopeParts.push('topics');
    if (committeeGroups.length > 0) scopeParts.push('committees');
    const introText = `Status updates for ${joinWithAnd(scopeParts)} you follow.`;
    // A digest with no bill sections shouldn't call itself a bill digest.
    const heading = totalBills > 0 ? 'Kentucky bill digest' : 'Kentucky committee digest';
    // The inbox column already shows the date, so the subject's variable slot
    // carries the counts; a short date keeps each day's subject distinct so
    // threading clients don't collapse digests together.
    const subjectCounts: string[] = [];
    if (totalBills > 0) subjectCounts.push(`${totalBills} bill${totalBills === 1 ? '' : 's'}`);
    if (committeeUpdateCount > 0) {
      subjectCounts.push(
        totalBills > 0
          ? `${committeeUpdateCount} committee update${committeeUpdateCount === 1 ? '' : 's'}`
          : `${committeeUpdateCount} update${committeeUpdateCount === 1 ? '' : 's'}`,
      );
    }
    const subject = `${heading} — ${formatDigestDateShort(now)}: ${subjectCounts.join(', ')}`;

    const needsHtml = renderPreview || !(dryRun || !resend);
    const emailEl = (
      <BillDigestEmail
        previewText={previewText}
        logoSrc={`${origin}/branding/Logo-03.png`}
        homeHref={origin}
        heading={heading}
        introText={introText}
        sections={sections}
        billsBrowseHref={`${origin}/bills`}
        moreCount={overflow}
        moreHref={moreHref}
        overflowTopics={[...overflowTopicSet]}
        glossaryHref={glossaryHref}
        preferencesHref={preferencesHref}
        unsubscribeHref={unsubscribeHref}
        privacyHref={privacyHref}
        termsHref={termsHref}
        postalAddress={KYVKY_POSTAL_ADDRESS}
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
          committee_event_ids: committeeEventIds,
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
        committee_event_ids: committeeEventIds,
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
