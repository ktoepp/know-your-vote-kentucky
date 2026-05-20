import { NextResponse, type NextRequest } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/route-auth';

/**
 * GET — list the current user's followed bills + the topic filters from their preferences.
 * Topic follows live inside `ky_notification_preferences.topic_filters` for v1 (no separate table).
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

  const [followsRes, prefsRes] = await Promise.all([
    auth.supabase
      .from('ky_bill_follows')
      .select(
        `created_at,
         snoozed,
         bill:ky_bills (
           id, bill_number, title, status, chamber,
           last_action, last_action_date, topics
         )`,
      )
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false }),
    auth.supabase
      .from('ky_notification_preferences')
      .select('topic_filters')
      .eq('user_id', auth.userId)
      .maybeSingle(),
  ]);

  if (followsRes.error) {
    console.error('ky_bill_follows select:', followsRes.error);
    return NextResponse.json({ error: followsRes.error.message }, { status: 500 });
  }
  if (prefsRes.error) {
    console.error('ky_notification_preferences select:', prefsRes.error);
    return NextResponse.json({ error: prefsRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    bills: followsRes.data ?? [],
    topics: prefsRes.data?.topic_filters ?? [],
  });
}

/** PATCH — snooze or unsnooze a followed bill (digest skips snoozed). */
export async function PATCH(request: NextRequest) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

  let body: { bill_id?: string; snoozed?: boolean };
  try {
    body = (await request.json()) as { bill_id?: string; snoozed?: boolean };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const billId = typeof body.bill_id === 'string' ? body.bill_id.trim() : '';
  if (!billId) {
    return NextResponse.json({ error: 'bill_id is required.' }, { status: 400 });
  }
  if (typeof body.snoozed !== 'boolean') {
    return NextResponse.json({ error: 'snoozed must be a boolean.' }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from('ky_bill_follows')
    .update({ snoozed: body.snoozed })
    .eq('user_id', auth.userId)
    .eq('bill_id', billId)
    .select('bill_id, snoozed')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Follow not found.' }, { status: 404 });
  }

  return NextResponse.json({ bill_id: data.bill_id, snoozed: data.snoozed });
}
