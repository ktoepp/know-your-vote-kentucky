import { NextResponse, type NextRequest } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/route-auth';
import { resolveBillUuid } from '@/lib/bill-id-resolver';
import { ensureKyNotificationPreferencesRow } from '@/lib/ky-notification-preferences';

type Ctx = { params: Promise<{ id: string }> };

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

  const { id: raw } = await params;
  const billId = await resolveBillUuid(auth.supabase, raw);
  if (!billId) {
    return NextResponse.json({ error: 'Bill not found.' }, { status: 404 });
  }

  const { error } = await auth.supabase
    .from('ky_bill_follows')
    .insert({ user_id: auth.userId, bill_id: billId });

  // 23505 = unique_violation — already following is success.
  if (error && error.code !== '23505') {
    console.error('ky_bill_follows insert:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const prefs = await ensureKyNotificationPreferencesRow(auth.supabase, auth.userId);
  if (prefs.error) {
    console.error('ensureKyNotificationPreferencesRow (follow):', prefs.error);
  }

  return NextResponse.json({ ok: true, bill_id: billId, following: true });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

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
