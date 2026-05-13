#!/usr/bin/env npx tsx
/**
 * Print the digest-related state for one user. Use to verify the end-to-end
 * flow after a test send / webhook event.
 *
 *   npm run verify:digest-state -- --email you@example.com
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg('--email');
  if (!email) {
    console.error('Usage: verify:digest-state --email <addr>');
    process.exit(1);
  }
  if (!supabaseAdmin) {
    console.error('supabaseAdmin not configured');
    process.exit(2);
  }

  const { data: profile } = await supabaseAdmin
    .from('ky_user_profiles')
    .select('user_id, email, email_verified_at')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (!profile) {
    console.log(`No profile for ${email}`);
    return;
  }
  console.log('PROFILE');
  console.log(profile);

  const { data: prefs } = await supabaseAdmin
    .from('ky_notification_preferences')
    .select(
      'digest_frequency, event_types, topic_filters, unsubscribed_all_at, suppressed_at, suppressed_reason, bounce_state, bounce_count, last_bounced_at, unsubscribe_token',
    )
    .eq('user_id', profile.user_id)
    .maybeSingle();
  console.log('\nPREFERENCES');
  console.log(prefs);

  const { data: follows } = await supabaseAdmin
    .from('ky_bill_follows')
    .select('bill_id, created_at, ky_bills:bill_id(bill_number)')
    .eq('user_id', profile.user_id)
    .order('created_at', { ascending: false });
  console.log('\nFOLLOWS');
  console.log(follows);

  const { data: log } = await supabaseAdmin
    .from('ky_notifications_log')
    .select('id, sent_at, delivery_status, resend_message_id, digest_window_start, digest_window_end, event_ids')
    .eq('user_id', profile.user_id)
    .order('sent_at', { ascending: false })
    .limit(5);
  console.log('\nRECENT NOTIFICATIONS_LOG (5)');
  console.log(log);

  const send = prefs?.digest_frequency !== 'off' && !prefs?.unsubscribed_all_at && !prefs?.suppressed_at;
  console.log(`\nWILL_RECEIVE_DIGEST: ${send ? 'YES' : 'NO'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
