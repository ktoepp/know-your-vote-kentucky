/**
 * POST /api/me/welcome-email — one-time welcome email (paused; route kept for manual/preview use).
 *
 * Idempotent: checks ky_user_profiles.welcome_email_sent_at and returns 200 with
 * { sent: false } if already sent. Not called from /auth/verify while welcome is paused.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { render } from 'react-email';
import { Resend } from 'resend';
import { getAuthedUser } from '@/lib/supabase/route-auth';
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';
import { WelcomeEmail } from '@/lib/email/welcome-email';
import { emailLogoSrc } from '@/lib/email/brand';
import { publicSiteOrigin } from '@/lib/site-canonical';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 });
  }

  const { data: profile, error: profErr } = await supabaseAdmin
    .from('ky_user_profiles')
    .select('user_id, email, display_name, email_verified_at, welcome_email_sent_at')
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  }
  if (!profile.email_verified_at) {
    return NextResponse.json({ sent: false, reason: 'unverified' }, { status: 200 });
  }
  const force = new URL(request.url).searchParams.get('force') === '1';

  if (profile.welcome_email_sent_at && !force) {
    return NextResponse.json({ sent: false, reason: 'already_sent' }, { status: 200 });
  }
  if (!profile.email || !String(profile.email).includes('@')) {
    return NextResponse.json({ sent: false, reason: 'no_email' }, { status: 200 });
  }

  const stampedAt = new Date().toISOString();
  if (!force) {
    // Stamp first to make the send idempotent under concurrent verify-page loads.
    const { data: stamped, error: stampErr } = await supabaseAdmin
      .from('ky_user_profiles')
      .update({ welcome_email_sent_at: stampedAt })
      .eq('user_id', auth.userId)
      .is('welcome_email_sent_at', null)
      .select('user_id');

    if (stampErr) {
      return NextResponse.json({ error: stampErr.message }, { status: 500 });
    }
    if (!stamped || stamped.length === 0) {
      return NextResponse.json({ sent: false, reason: 'already_sent' }, { status: 200 });
    }
  } else {
    await supabaseAdmin
      .from('ky_user_profiles')
      .update({ welcome_email_sent_at: stampedAt })
      .eq('user_id', auth.userId);
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'alerts@kyvky.com';
  if (!resendKey) {
    // Stamp persists; without an API key we can't send. Surface for ops.
    return NextResponse.json(
      { sent: false, reason: 'resend_not_configured', stamped: true },
      { status: 200 },
    );
  }

  const origin = publicSiteOrigin();
  const emailEl = (
    <WelcomeEmail
      displayName={profile.display_name as string | null}
      browseBillsHref={`${origin}/bills`}
      profileHref={`${origin}/profile`}
      preferencesHref={`${origin}/profile#notifications`}
      districtMapHref={`${origin}/members/map`}
      aboutHref={`${origin}/about`}
      logoSrc={emailLogoSrc(origin)}
      homeHref={origin}
      privacyHref={`${origin}/privacy`}
      termsHref={`${origin}/terms`}
    />
  );
  const html = await render(emailEl);
  const text = await render(emailEl, { plainText: true });

  try {
    const resend = new Resend(resendKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: profile.email as string,
      replyTo: 'katie@kyvky.com',
      subject: 'Your Know Your Vote Kentucky account is set up',
      html,
      text,
    });
    if (error) {
      // Roll back the stamp so a future call can retry.
      await supabaseAdmin
        .from('ky_user_profiles')
        .update({ welcome_email_sent_at: null })
        .eq('user_id', auth.userId)
        .eq('welcome_email_sent_at', stampedAt);
      return NextResponse.json({ sent: false, error: error.message }, { status: 502 });
    }

    return NextResponse.json({ sent: true, id: data?.id ?? null }, { status: 200 });
  } catch (e) {
    await supabaseAdmin
      .from('ky_user_profiles')
      .update({ welcome_email_sent_at: null })
      .eq('user_id', auth.userId)
      .eq('welcome_email_sent_at', stampedAt);
    return NextResponse.json(
      { sent: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
