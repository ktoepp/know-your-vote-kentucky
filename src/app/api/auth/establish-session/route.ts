/**
 * POST /api/auth/establish-session — sign in immediately after signup when email
 * confirmation is enabled. Tries password sign-in first; if Supabase blocks
 * unverified users, exchanges an admin-generated magic-link OTP (no extra email).
 */
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

function isEmailNotConfirmed(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('email not confirmed') || m.includes('not confirmed');
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = await rateLimit(`auth-establish:${ip}`, {
    capacity: 10,
    refillPerSec: 10 / 60,
    route: 'auth/establish-session:POST',
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Body must be a JSON object.' }, { status: 400 });
  }

  const { email, password } = body as { email?: unknown; password?: unknown };
  if (typeof email !== 'string' || typeof password !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const normalizedEmail = email.trim();
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const signIn = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (signIn.data.session) {
    return NextResponse.json({
      access_token: signIn.data.session.access_token,
      refresh_token: signIn.data.session.refresh_token,
    });
  }

  const signInMessage = signIn.error?.message ?? '';
  if (!isEmailNotConfirmed(signInMessage)) {
    return NextResponse.json(
      { error: signIn.error?.message ?? 'Could not sign in.' },
      { status: 401 },
    );
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 });
  }

  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail.toLowerCase(),
  });
  const otp = linkData?.properties?.email_otp;
  if (linkErr || !otp) {
    return NextResponse.json(
      { error: linkErr?.message ?? 'Could not establish session.' },
      { status: 500 },
    );
  }

  const { data: otpData, error: otpErr } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: otp,
    type: 'email',
  });

  if (otpErr || !otpData.session) {
    return NextResponse.json(
      { error: otpErr?.message ?? 'Could not establish session.' },
      { status: 500 },
    );
  }

  // verifyOtp marks email_confirmed_at in auth; keep app verification separate so
  // notification prefs stay gated until the user opens the signup email link.
  const userId = otpData.session.user.id;
  if (userId) {
    await supabaseAdmin
      .from('ky_user_profiles')
      .update({ email_verified_at: null })
      .eq('user_id', userId);
  }

  return NextResponse.json({
    access_token: otpData.session.access_token,
    refresh_token: otpData.session.refresh_token,
  });
}
