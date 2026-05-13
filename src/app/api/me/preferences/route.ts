import { NextResponse, type NextRequest } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/route-auth';
import {
  ensureKyNotificationPreferencesRow,
  isDigestFrequency,
  normalizeDigestEventTypes,
  normalizeTopicFilters,
} from '@/lib/ky-notification-preferences';

const SELECT_FIELDS =
  'digest_frequency, event_types, topic_filters, unsubscribed_all_at, updated_at';

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

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

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

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });
  }

  const ensured = await ensureKyNotificationPreferencesRow(auth.supabase, auth.userId);
  if (ensured.error) {
    console.error('ensureKyNotificationPreferencesRow:', ensured.error);
    return NextResponse.json({ error: ensured.error.message }, { status: 500 });
  }

  const rowPatch: {
    digest_frequency?: string;
    event_types?: string[];
    topic_filters?: string[];
    unsubscribed_all_at?: null;
  } = { ...patch };
  if (rowPatch.digest_frequency === 'daily' || rowPatch.digest_frequency === 'weekly') {
    rowPatch.unsubscribed_all_at = null;
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
