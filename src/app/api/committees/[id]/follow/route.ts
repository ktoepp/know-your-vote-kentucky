import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAuthedUser } from '@/lib/supabase/route-auth';
import { ensureKyNotificationPreferencesRow } from '@/lib/ky-notification-preferences';
import { rateLimit } from '@/lib/rate-limit';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Resolve a committee by UUID or slug, returning the UUID.
 * Accepts either a raw UUID or a slug string.
 */
async function resolveCommitteeId(supabase: SupabaseClient, raw: string): Promise<string | null> {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRe.test(raw)) return raw;

  const { data } = await supabase
    .from('ky_committees')
    .select('id')
    .eq('slug', raw)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

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
  const committeeId = await resolveCommitteeId(auth.supabase, raw);
  if (!committeeId) {
    return NextResponse.json({ error: 'Committee not found.' }, { status: 404 });
  }

  const { data, error } = await auth.supabase
    .from('ky_committee_follows')
    .select('committee_id')
    .eq('user_id', auth.userId)
    .eq('committee_id', committeeId)
    .maybeSingle();

  if (error) {
    console.error('ky_committee_follows select:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ committee_id: committeeId, following: !!data });
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

  const limit = await checkWriteRateLimit(auth.userId, 'committees/[id]/follow:POST');
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec);

  const { id: raw } = await params;
  const committeeId = await resolveCommitteeId(auth.supabase, raw);
  if (!committeeId) {
    return NextResponse.json({ error: 'Committee not found.' }, { status: 404 });
  }

  const { error } = await auth.supabase
    .from('ky_committee_follows')
    .insert({ user_id: auth.userId, committee_id: committeeId });

  // 23505 = unique_violation — already following is success.
  if (error && error.code !== '23505') {
    console.error('ky_committee_follows insert:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const prefs = await ensureKyNotificationPreferencesRow(auth.supabase, auth.userId);
  if (prefs.error) {
    console.error('ensureKyNotificationPreferencesRow (committee follow):', prefs.error);
  }

  return NextResponse.json({ ok: true, committee_id: committeeId, following: true });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

  const limit = await checkWriteRateLimit(auth.userId, 'committees/[id]/follow:DELETE');
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec);

  const { id: raw } = await params;
  const committeeId = await resolveCommitteeId(auth.supabase, raw);
  if (!committeeId) {
    return NextResponse.json({ error: 'Committee not found.' }, { status: 404 });
  }

  const { error } = await auth.supabase
    .from('ky_committee_follows')
    .delete()
    .eq('user_id', auth.userId)
    .eq('committee_id', committeeId);

  if (error) {
    console.error('ky_committee_follows delete:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, committee_id: committeeId, following: false });
}
