import { NextResponse, type NextRequest } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/route-auth';
import { resolveBillUuid } from '@/lib/bill-id-resolver';
import { ensureKyNotificationPreferencesRow, maybeEnableDigestOnFirstBillFollow } from '@/lib/ky-notification-preferences';
import { rateLimit } from '@/lib/rate-limit';

type Ctx = { params: Promise<{ id: string }> };

/** 60 follow/unfollow actions per minute per user. Generous burst, blocks runaway clients. */
async function checkWriteRateLimit(userId: string, route: string) {
  return rateLimit(`follow-write:${userId}`, { capacity: 60, refillPerSec: 1, route });
}

function rateLimitResponse(retryAfterSec: number) {
  return NextResponse.json(
    { error: 'Too many requests. Try again shortly.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
  );
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

  const { id: raw } = await params;
  const billId = await resolveBillUuid(auth.supabase, raw);
  if (!billId) {
    return NextResponse.json({ error: 'Bill not found.' }, { status: 404 });
  }

  const { data, error } = await auth.supabase
    .from('ky_bill_follows')
    .select('bill_id')
    .eq('user_id', auth.userId)
    .eq('bill_id', billId)
    .maybeSingle();

  if (error) {
    console.error('ky_bill_follows select:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bill_id: billId, following: !!data });
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

  const limit = await checkWriteRateLimit(auth.userId, 'bills/[id]/follow:POST');
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec);

  const { id: raw } = await params;
  const billId = await resolveBillUuid(auth.supabase, raw);
  if (!billId) {
    return NextResponse.json({ error: 'Bill not found.' }, { status: 404 });
  }

  const { error } = await auth.supabase
    .from('ky_bill_follows')
    .insert({ user_id: auth.userId, bill_id: billId });

  const alreadyFollowing = error?.code === '23505';
  // 23505 = unique_violation — already following is success.
  if (error && !alreadyFollowing) {
    console.error('ky_bill_follows insert:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const prefs = await ensureKyNotificationPreferencesRow(auth.supabase, auth.userId);
  if (prefs.error) {
    console.error('ensureKyNotificationPreferencesRow (follow):', prefs.error);
  }

  if (!alreadyFollowing) {
    await maybeEnableDigestOnFirstBillFollow(auth.supabase, auth.userId);
  }

  return NextResponse.json({ ok: true, bill_id: billId, following: true });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

  const limit = await checkWriteRateLimit(auth.userId, 'bills/[id]/follow:DELETE');
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec);

  const { id: raw } = await params;
  const billId = await resolveBillUuid(auth.supabase, raw);
  if (!billId) {
    return NextResponse.json({ error: 'Bill not found.' }, { status: 404 });
  }

  const { error } = await auth.supabase
    .from('ky_bill_follows')
    .delete()
    .eq('user_id', auth.userId)
    .eq('bill_id', billId);

  if (error) {
    console.error('ky_bill_follows delete:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, bill_id: billId, following: false });
}
