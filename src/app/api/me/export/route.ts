import { NextResponse, type NextRequest } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/route-auth';

/**
 * GET /api/me/export — GDPR-style JSON export of account data.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

  const [profileRes, followsRes, prefsRes, logRes, savedRes] = await Promise.all([
    auth.supabase.from('ky_user_profiles').select('*').eq('user_id', auth.userId).maybeSingle(),
    auth.supabase
      .from('ky_bill_follows')
      .select('bill_id, snoozed, created_at')
      .eq('user_id', auth.userId),
    auth.supabase.from('ky_notification_preferences').select('*').eq('user_id', auth.userId).maybeSingle(),
    auth.supabase
      .from('ky_notifications_log')
      .select('id, sent_at, digest_frequency, event_count, delivery_status, created_at')
      .eq('user_id', auth.userId)
      .order('sent_at', { ascending: false })
      .limit(100),
    auth.supabase
      .from('ky_saved_searches')
      .select('id, label, href, created_at')
      .eq('user_id', auth.userId),
  ]);

  const errors = [profileRes, followsRes, prefsRes, logRes, savedRes]
    .map((r) => r.error?.message)
    .filter(Boolean);
  if (errors.length) {
    return NextResponse.json({ error: errors[0] }, { status: 500 });
  }

  const prefsRaw = prefsRes.data as Record<string, unknown> | null;
  let notification_preferences: Record<string, unknown> | null = null;
  if (prefsRaw) {
    const { unsubscribe_token: _token, ...rest } = prefsRaw;
    notification_preferences = rest;
  }

  const exportPayload = {
    exported_at: new Date().toISOString(),
    user_id: auth.userId,
    email: (profileRes.data?.email as string | undefined) ?? null,
    profile: profileRes.data ?? null,
    bill_follows: followsRes.data ?? [],
    notification_preferences,
    notification_log: logRes.data ?? [],
    saved_searches: savedRes.data ?? [],
  };

  const filename = `kyvky-export-${auth.userId.slice(0, 8)}.json`;

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
