import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';
import { getAuthedUser } from '@/lib/supabase/route-auth';
import {
  ensureKyNotificationPreferencesRow,
  isDigestFrequency,
  myLegislatorsDistrictsError,
  normalizeDigestEventTypes,
  normalizeMyLegislatorsPatch,
  normalizeTopicFilters,
  type StoredMyLegislators,
} from '@/lib/ky-notification-preferences';
import { rateLimit } from '@/lib/rate-limit';

// One string literal so supabase-js can infer the selected row type.
const SELECT_FIELDS =
  'digest_frequency, event_types, topic_filters, unsubscribed_all_at, updated_at, my_legislators_weekly, house_district, senate_district, districts_set_at';

const VERIFY_EMAIL_ERROR = 'Verify your email before turning on email notifications.';

/**
 * Shared gate for every email opt-in (bill digest and the weekly My Legislators
 * email): both return the same 403 and message when the account's email is not
 * verified.
 */
async function requireVerifiedEmail(userId: string): Promise<NextResponse | null> {
  if (!supabaseAdmin) return null;
  const { data: profile } = await supabaseAdmin
    .from('ky_user_profiles')
    .select('email_verified_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (!profile?.email_verified_at) {
    return NextResponse.json({ error: VERIFY_EMAIL_ERROR }, { status: 403 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

  const ensured = await ensureKyNotificationPreferencesRow(auth.supabase, auth.userId);
  if (ensured.error) {
    console.error('ensureKyNotificationPreferencesRow:', ensured.error);
    return NextResponse.json({ error: ensured.error.message }, { status: 500 });
  }

  const { data, error } = await auth.supabase
    .from('ky_notification_preferences')
    .select(SELECT_FIELDS)
    .eq('user_id', auth.userId)
    .single();

  if (error) {
    console.error('ky_notification_preferences select:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let emailVerifiedAt: string | null = null;
  if (supabaseAdmin) {
    const { data: profile } = await supabaseAdmin
      .from('ky_user_profiles')
      .select('email_verified_at')
      .eq('user_id', auth.userId)
      .maybeSingle();
    emailVerifiedAt = profile?.email_verified_at ?? null;
  }

  return NextResponse.json({ ...data, email_verified_at: emailVerifiedAt });
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

  const limit = await rateLimit(`prefs-write:${auth.userId}`, {
    capacity: 30,
    refillPerSec: 0.5,
    route: 'me/preferences:PATCH',
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Body must be a JSON object.' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  const b = body as Record<string, unknown>;

  if ('digest_frequency' in b) {
    const v = b.digest_frequency;
    if (typeof v !== 'string' || !isDigestFrequency(v)) {
      return NextResponse.json(
        { error: 'digest_frequency must be one of: daily, weekly, off.' },
        { status: 400 },
      );
    }
    patch.digest_frequency = v;
  }

  if ('event_types' in b) {
    const v = b.event_types;
    if (!Array.isArray(v) || !v.every(x => typeof x === 'string')) {
      return NextResponse.json({ error: 'event_types must be an array of strings.' }, { status: 400 });
    }
    const normalized = normalizeDigestEventTypes(v as string[]);
    if (normalized.length !== v.length) {
      return NextResponse.json({ error: 'event_types contains invalid or duplicate values.' }, { status: 400 });
    }
    patch.event_types = normalized;
  }

  if ('topic_filters' in b) {
    const v = b.topic_filters;
    if (!Array.isArray(v) || !v.every(x => typeof x === 'string')) {
      return NextResponse.json({ error: 'topic_filters must be an array of strings.' }, { status: 400 });
    }
    const normalized = normalizeTopicFilters(v as string[]);
    if (normalized.length !== v.length) {
      return NextResponse.json({ error: 'topic_filters must use only known KY topic labels.' }, { status: 400 });
    }
    patch.topic_filters = normalized;
  }

  const myLegislators = normalizeMyLegislatorsPatch(b);
  if (!myLegislators.ok) {
    return NextResponse.json({ error: myLegislators.error }, { status: 400 });
  }
  const mlPatch = myLegislators.patch;

  if (Object.keys(patch).length === 0 && Object.keys(mlPatch).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });
  }

  const enablingDigest =
    patch.digest_frequency === 'daily' || patch.digest_frequency === 'weekly';
  const enablingMyLegislators = mlPatch.my_legislators_weekly === true;
  if (enablingDigest || enablingMyLegislators) {
    const denied = await requireVerifiedEmail(auth.userId);
    if (denied) return denied;
  }

  const ensured = await ensureKyNotificationPreferencesRow(auth.supabase, auth.userId);
  if (ensured.error) {
    console.error('ensureKyNotificationPreferencesRow:', ensured.error);
    return NextResponse.json({ error: ensured.error.message }, { status: 500 });
  }

  if (Object.keys(mlPatch).length > 0) {
    // The weekly email needs both districts, from this patch or the stored row.
    const { data: stored, error: storedErr } = await auth.supabase
      .from('ky_notification_preferences')
      .select('my_legislators_weekly, house_district, senate_district')
      .eq('user_id', auth.userId)
      .maybeSingle();
    if (storedErr) {
      console.error('ky_notification_preferences select:', storedErr);
      return NextResponse.json({ error: storedErr.message }, { status: 500 });
    }
    const districtsError = myLegislatorsDistrictsError(
      mlPatch,
      (stored as StoredMyLegislators | null) ?? null,
    );
    if (districtsError) {
      return NextResponse.json({ error: districtsError }, { status: 400 });
    }
  }

  const rowPatch: {
    digest_frequency?: string;
    event_types?: string[];
    topic_filters?: string[];
    unsubscribed_all_at?: null;
    digest_user_disabled?: boolean;
    my_legislators_weekly?: boolean;
    house_district?: number | null;
    senate_district?: number | null;
    districts_set_at?: string;
  } = { ...patch, ...mlPatch };
  // Turning the digest on does not change my_legislators_weekly: the two email
  // kinds are separate opt-ins, so only mlPatch (never this branch) sets it.
  if (rowPatch.digest_frequency === 'daily' || rowPatch.digest_frequency === 'weekly') {
    rowPatch.unsubscribed_all_at = null;
    rowPatch.digest_user_disabled = false;
  } else if (rowPatch.digest_frequency === 'off') {
    rowPatch.digest_user_disabled = true;
  }
  if (enablingMyLegislators) {
    // Turning the weekly email on is an explicit re-subscription, so it clears a
    // past all-mail unsubscribe. It leaves digest_frequency and
    // digest_user_disabled alone: the digest stays off until the user turns it on.
    rowPatch.unsubscribed_all_at = null;
  }
  if ('house_district' in mlPatch || 'senate_district' in mlPatch) {
    rowPatch.districts_set_at = new Date().toISOString();
  }

  const { data, error } = await auth.supabase
    .from('ky_notification_preferences')
    .update(rowPatch)
    .eq('user_id', auth.userId)
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    console.error('ky_notification_preferences update:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
