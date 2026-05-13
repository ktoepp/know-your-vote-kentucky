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
