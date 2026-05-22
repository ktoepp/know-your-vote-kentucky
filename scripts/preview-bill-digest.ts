#!/usr/bin/env npx tsx
/**
 * E2E preview / send harness for the bill digest.
 *
 * Usage:
 *   npm run preview:digest -- --email you@example.com [--out /tmp/digest.html]
 *   npm run preview:digest -- --email you@example.com --send      # actually send via Resend
 *   npm run preview:digest -- --email you@example.com --inject HB1 --send
 *   npm run preview:digest -- --email you@example.com --inject-committee interim-joint-education
 *
 * Flags:
 *   --email <addr>            Target one user (must exist in ky_user_profiles).
 *   --out <path>              Write rendered HTML preview to a file (default: ./digest-preview.html).
 *   --send                    Send a real email via Resend (otherwise dry-run preview only).
 *   --inject <billNo>         Insert a synthetic ky_bill_status_history row for the bill,
 *                             run the digest, then delete the synthetic row.
 *   --event <type>            Event type for --inject (default: committee_action).
 *   --inject-committee <slug> Insert a synthetic ky_committee_events row for the committee,
 *                             temporarily follow it, run the digest, then clean up.
 *   --ignore-last-sent        Don't restrict to events after the last sent digest window.
 */
import './load-env';
import fs from 'node:fs/promises';
import path from 'node:path';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { runBillDigestCron } from '../src/lib/digest/run-bill-digest-cron';

type Args = {
  email?: string;
  out: string;
  send: boolean;
  inject?: string;
  event: string;
  injectCommittee?: string;
  ignoreLastSent: boolean;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const out: Args = {
    out: path.resolve(process.cwd(), 'digest-preview.html'),
    send: false,
    event: 'committee_action',
    ignoreLastSent: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--email') out.email = argv[++i];
    else if (a === '--out') out.out = path.resolve(process.cwd(), argv[++i]);
    else if (a === '--send') out.send = true;
    else if (a === '--inject') out.inject = argv[++i];
    else if (a === '--event') out.event = argv[++i];
    else if (a === '--inject-committee') out.injectCommittee = argv[++i];
    else if (a === '--ignore-last-sent') out.ignoreLastSent = true;
    else if (a === '--help' || a === '-h') {
      console.log(
        'preview:digest --email <addr> [--out file] [--send] [--inject HB1 [--event committee_action]] [--inject-committee <slug>] [--ignore-last-sent]',
      );
      process.exit(0);
    }
  }
  return out;
}

async function lookupUserIdByEmail(email: string): Promise<string | null> {
  if (!supabaseAdmin) throw new Error('supabaseAdmin not configured (set SUPABASE_SERVICE_ROLE_KEY)');
  const { data, error } = await supabaseAdmin
    .from('ky_user_profiles')
    .select('user_id')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return (data?.user_id as string | undefined) ?? null;
}

async function lookupBillByNumber(billNumber: string): Promise<{ id: string; title: string | null } | null> {
  if (!supabaseAdmin) throw new Error('supabaseAdmin not configured');
  const { data } = await supabaseAdmin
    .from('ky_bills')
    .select('id, title')
    .ilike('bill_number', billNumber)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { id: string; title: string | null } | null) ?? null;
}

async function injectEvent(billId: string, eventType: string): Promise<number | null> {
  if (!supabaseAdmin) return null;
  const hash = `preview-${Date.now()}`;
  const { data, error } = await supabaseAdmin
    .from('ky_bill_status_history')
    .insert({
      bill_id: billId,
      event_type: eventType,
      event_payload: { last_action: '[preview] Synthetic event for digest E2E', preview: true },
      legiscan_change_hash: hash,
    })
    .select('id')
    .single();
  if (error) {
    console.warn('inject failed:', error.message);
    return null;
  }
  return data.id as number;
}

async function deleteEvent(id: number | null) {
  if (id == null || !supabaseAdmin) return;
  await supabaseAdmin.from('ky_bill_status_history').delete().eq('id', id);
}

async function lookupCommitteeBySlug(
  slug: string,
): Promise<{ id: string; name: string; slug: string } | null> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from('ky_committees')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle();
  return (data as { id: string; name: string; slug: string } | null) ?? null;
}

async function injectCommitteeEvent(committee: {
  id: string;
  name: string;
  slug: string;
}): Promise<string | null> {
  if (!supabaseAdmin) return null;
  // Pick a meeting ~7 days from now so it looks like a real upcoming alert.
  const meetingDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data, error } = await supabaseAdmin
    .from('ky_committee_events')
    .insert({
      committee_id: committee.id,
      meeting_id: null,
      event_type: 'meeting_scheduled',
      event_payload: {
        meeting_date: meetingDate,
        time_and_location: '10:00 ET — Room 171, Capitol Annex [preview]',
        committee_name: committee.name,
        committee_slug: committee.slug,
        preview: true,
      },
    })
    .select('id')
    .single();
  if (error) {
    console.warn('committee event inject failed:', error.message);
    return null;
  }
  return String(data.id);
}

async function deleteCommitteeEvent(id: string | null) {
  if (!id || !supabaseAdmin) return;
  await supabaseAdmin.from('ky_committee_events').delete().eq('id', id);
}

async function main() {
  const args = parseArgs();
  if (!args.email) {
    console.error('Missing --email <addr>');
    process.exit(1);
  }
  const userId = await lookupUserIdByEmail(args.email);
  if (!userId) {
    console.error(`No ky_user_profiles row found for ${args.email}`);
    process.exit(2);
  }

  let injectedCommitteeEventId: string | null = null;
  let temporaryFollowCommitteeId: string | null = null;
  if (args.injectCommittee) {
    const committee = await lookupCommitteeBySlug(args.injectCommittee);
    if (!committee) {
      console.error(`Committee slug "${args.injectCommittee}" not found in ky_committees.`);
      process.exit(3);
    }
    injectedCommitteeEventId = await injectCommitteeEvent(committee);
    if (injectedCommitteeEventId) {
      console.log(`Injected synthetic committee event id=${injectedCommitteeEventId} committee=${committee.id} (${committee.name})`);
    }
    // Ensure the user follows this committee.
    if (supabaseAdmin) {
      const { data: existing } = await supabaseAdmin
        .from('ky_committee_follows')
        .select('committee_id')
        .eq('user_id', userId)
        .eq('committee_id', committee.id)
        .maybeSingle();
      if (!existing) {
        const { error } = await supabaseAdmin
          .from('ky_committee_follows')
          .insert({ user_id: userId, committee_id: committee.id });
        if (error) console.warn('temp committee follow insert failed:', error.message);
        else {
          temporaryFollowCommitteeId = committee.id;
          console.log(`Inserted temporary committee follow user=${userId} committee=${committee.id}`);
        }
      }
    }
  }

  let injectedId: number | null = null;
  let temporaryFollowBillId: string | null = null;
  if (args.inject) {
    const bill = await lookupBillByNumber(args.inject);
    if (!bill) {
      console.error(`Bill ${args.inject} not found.`);
      process.exit(3);
    }
    injectedId = await injectEvent(bill.id, args.event);
    if (injectedId) console.log(`Injected synthetic event id=${injectedId} bill=${bill.id} (${args.inject})`);

    // Ensure the user follows this bill so the digest selects it. Track whether
    // we created the row so cleanup only removes follows we added.
    if (supabaseAdmin) {
      const { data: existing } = await supabaseAdmin
        .from('ky_bill_follows')
        .select('bill_id')
        .eq('user_id', userId)
        .eq('bill_id', bill.id)
        .maybeSingle();
      if (!existing) {
        const { error } = await supabaseAdmin
          .from('ky_bill_follows')
          .insert({ user_id: userId, bill_id: bill.id });
        if (error) console.warn('temp follow insert failed:', error.message);
        else {
          temporaryFollowBillId = bill.id;
          console.log(`Inserted temporary follow user=${userId} bill=${bill.id}`);
        }
      }
    }
  }

  try {
    if (args.send) {
      const result = await runBillDigestCron({
        dryRun: false,
        onlyUserIds: [userId],
        ignoreLastSentWindow: args.ignoreLastSent,
      });
      console.log(JSON.stringify(result, null, 2));
    } else {
      const result = await runBillDigestCron({
        dryRun: true,
        onlyUserIds: [userId],
        renderPreview: true,
        ignoreLastSentWindow: args.ignoreLastSent,
      });
      const sample = result.samples?.[0];
      const summary = {
        ...result,
        samples: result.samples?.map((s) => ({ email: s.email, eventCount: s.eventCount, previewSubject: s.previewSubject })),
      };
      console.log(JSON.stringify(summary, null, 2));
      if (sample?.previewHtml) {
        await fs.writeFile(args.out, sample.previewHtml, 'utf8');
        console.log(`\nWrote ${args.out} (open in a browser to review).`);
      } else {
        console.log('\nNo digest content for this user in the window (nothing to render).');
      }
    }
  } finally {
    await deleteEvent(injectedId);
    if (injectedId) console.log(`Cleaned up synthetic bill event id=${injectedId}.`);
    if (temporaryFollowBillId && supabaseAdmin) {
      await supabaseAdmin
        .from('ky_bill_follows')
        .delete()
        .eq('user_id', userId)
        .eq('bill_id', temporaryFollowBillId);
      console.log(`Removed temporary bill follow bill=${temporaryFollowBillId}.`);
    }
    await deleteCommitteeEvent(injectedCommitteeEventId);
    if (injectedCommitteeEventId) console.log(`Cleaned up synthetic committee event id=${injectedCommitteeEventId}.`);
    if (temporaryFollowCommitteeId && supabaseAdmin) {
      await supabaseAdmin
        .from('ky_committee_follows')
        .delete()
        .eq('user_id', userId)
        .eq('committee_id', temporaryFollowCommitteeId);
      console.log(`Removed temporary committee follow committee=${temporaryFollowCommitteeId}.`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
