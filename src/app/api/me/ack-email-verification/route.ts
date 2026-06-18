/**
 * POST /api/me/ack-email-verification — stamp ky_user_profiles.email_verified_at
 * after the user opens the signup confirmation link (/auth/verify).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';
import { getAuthedUser } from '@/lib/supabase/route-auth';

export async function POST(request: NextRequest) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

  const { data: userData, error: userErr } = await auth.supabase.auth.getUser();
  if (userErr || !userData.user?.email_confirmed_at) {
    return NextResponse.json({ verified: false, reason: 'unconfirmed' }, { status: 400 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('ky_user_profiles')
    .update({ email_verified_at: now })
    .eq('user_id', auth.userId)
    .is('email_verified_at', null)
    .select('email_verified_at')
    .maybeSingle();

  if (error) {
    console.error('ack-email-verification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    const { data: existing } = await supabaseAdmin
      .from('ky_user_profiles')
      .select('email_verified_at')
      .eq('user_id', auth.userId)
      .maybeSingle();
    return NextResponse.json({
      verified: Boolean(existing?.email_verified_at),
      email_verified_at: existing?.email_verified_at ?? null,
    });
  }

  return NextResponse.json({ verified: true, email_verified_at: data.email_verified_at });
}
