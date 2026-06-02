#!/usr/bin/env npx tsx
/**
 * Preview / send the welcome email for one user.
 *
 *   npm run preview:welcome -- --email you@example.com               # dry-run, writes welcome-preview.html
 *   npm run preview:welcome -- --email you@example.com --send        # actually send via Resend
 *   npm run preview:welcome -- --email you@example.com --reset-stamp # clear welcome_email_sent_at first
 *
 * The production trigger lives in /auth/verify which fire-and-forgets to
 * /api/me/welcome-email after a successful session exchange.
 */
import './load-env';
import * as React from 'react';
import fs from 'node:fs/promises';
import path from 'node:path';
import { render } from '@react-email/render';
import { Resend } from 'resend';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { WelcomeEmail } from '../src/lib/email/welcome-email';
import { publicSiteOrigin } from '../src/lib/site-canonical';

type Args = {
  email?: string;
  send: boolean;
  resetStamp: boolean;
  out: string;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const out: Args = {
    send: false,
    resetStamp: false,
    out: path.resolve(process.cwd(), 'welcome-preview.html'),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--email') out.email = argv[++i];
    else if (a === '--send') out.send = true;
    else if (a === '--reset-stamp') out.resetStamp = true;
    else if (a === '--out') out.out = path.resolve(process.cwd(), argv[++i]);
  }
  return out;
}

async function main() {
  const args = parseArgs();
  if (!args.email) {
    console.error('Usage: preview:welcome --email <addr> [--send] [--reset-stamp]');
    process.exit(1);
  }
  if (!supabaseAdmin) {
    console.error('supabaseAdmin not configured');
    process.exit(2);
  }

  const { data: profile, error } = await supabaseAdmin
    .from('ky_user_profiles')
    .select('user_id, email, display_name, email_verified_at, welcome_email_sent_at')
    .eq('email', args.email.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  if (!profile) {
    console.error(`No profile for ${args.email}`);
    process.exit(3);
  }
  console.log('Profile:', profile);

  if (args.resetStamp && profile.welcome_email_sent_at) {
    await supabaseAdmin
      .from('ky_user_profiles')
      .update({ welcome_email_sent_at: null })
      .eq('user_id', profile.user_id);
    console.log('Cleared welcome_email_sent_at.');
  }

  const origin = publicSiteOrigin();
  const emailEl = (
    <WelcomeEmail
      displayName={profile.display_name as string | null}
      browseBillsHref={`${origin}/bills`}
      profileHref={`${origin}/profile`}
      preferencesHref={`${origin}/profile#notifications`}
      districtMapHref={`${origin}/members/map`}
      privacyHref={`${origin}/privacy`}
      termsHref={`${origin}/terms`}
    />
  );
  const html = await render(emailEl);
  const text = await render(emailEl, { plainText: true });

  if (!args.send) {
    await fs.writeFile(args.out, html, 'utf8');
    console.log(`Wrote ${args.out} (open in a browser to review).`);
    return;
  }

  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.error('RESEND_API_KEY not set');
    process.exit(4);
  }
  const from = process.env.RESEND_FROM_EMAIL?.trim() || 'alerts@kyvky.com';
  const resend = new Resend(key);
  const { data, error: sendErr } = await resend.emails.send({
    from,
    to: profile.email as string,
    replyTo: 'katie@kyvky.com',
    subject: 'Your Know Your Vote Kentucky account is set up',
    html,
    text,
  });
  if (sendErr) {
    console.error('Send failed:', sendErr.message);
    process.exit(5);
  }
  await supabaseAdmin
    .from('ky_user_profiles')
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq('user_id', profile.user_id);
  console.log('Sent:', data?.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
