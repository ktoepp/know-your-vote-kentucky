/**
 * POST /api/webhooks/resend — Resend → Svix-signed delivery events.
 *
 * Verifies the signature using RESEND_WEBHOOK_SECRET (Resend dashboard →
 * Webhooks). Raises `ky_notifications_log.delivery_status` (never lowers it)
 * keyed by `resend_message_id` and flips `ky_notification_preferences` into a
 * suppressed state for hard bounces and complaints.
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import * as Sentry from '@sentry/nextjs';
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';
import {
  allowedPredecessors,
  classifyEvent,
  type ResendWebhookEvent,
} from '@/lib/email/resend-delivery';

export const runtime = 'nodejs';

const TOLERANCE_SECONDS = 5 * 60;

function verifySignature(rawBody: string, headers: Headers, secret: string): boolean {
  const svixId = headers.get('svix-id');
  const svixTimestamp = headers.get('svix-timestamp');
  const svixSignature = headers.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const ts = Number(svixTimestamp);
  if (!Number.isFinite(ts)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > TOLERANCE_SECONDS) return false;

  const secretBytes = secret.startsWith('whsec_')
    ? Buffer.from(secret.slice('whsec_'.length), 'base64')
    : Buffer.from(secret, 'utf8');

  const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secretBytes).update(signedPayload).digest('base64');

  // svix-signature: "v1,<sig1> v1,<sig2>" — match any v1 signature in constant time.
  const presented = svixSignature.split(' ');
  for (const part of presented) {
    const [version, sig] = part.split(',');
    if (version !== 'v1' || !sig) continue;
    if (sig.length !== expected.length) continue;
    try {
      if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return true;
    } catch {
      // length mismatch, ignore
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    Sentry.captureMessage('Resend webhook called but RESEND_WEBHOOK_SECRET is not set', {
      level: 'error',
      tags: { route: 'webhooks/resend' },
    });
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'supabaseAdmin not configured' }, { status: 503 });
  }

  const rawBody = await req.text();
  if (!verifySignature(rawBody, req.headers, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(rawBody) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const messageId = event.data?.email_id;
  const { logStatus, bounceState, suppress, reason } = classifyEvent(event);

  if (!logStatus && !bounceState) {
    return NextResponse.json({ ok: true, ignored: event.type }, { status: 200 });
  }

  let userId: string | null = null;
  if (messageId) {
    const { data: logRow } = await supabaseAdmin
      .from('ky_notifications_log')
      .select('id, user_id')
      .eq('resend_message_id', messageId)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    userId = (logRow?.user_id as string | undefined) ?? null;

    if (logRow && logStatus) {
      // One conditional UPDATE: the precedence check runs in the database, so a
      // late or concurrent event can never downgrade a row (e.g. complained -> bounced).
      await supabaseAdmin
        .from('ky_notifications_log')
        .update({ delivery_status: logStatus })
        .eq('id', logRow.id)
        .in('delivery_status', allowedPredecessors(logStatus));
    }
  }

  // Fall back to recipient lookup if we couldn't match by message id.
  if (!userId && bounceState) {
    const recipient = Array.isArray(event.data?.to) ? event.data?.to[0] : event.data?.to;
    if (recipient) {
      const { data: prof } = await supabaseAdmin
        .from('ky_user_profiles')
        .select('user_id')
        .eq('email', String(recipient).toLowerCase())
        .maybeSingle();
      userId = (prof?.user_id as string | undefined) ?? null;
    }
  }

  if (userId && bounceState) {
    const { data: existing } = await supabaseAdmin
      .from('ky_notification_preferences')
      .select('bounce_count')
      .eq('user_id', userId)
      .maybeSingle();
    const nextCount = (existing?.bounce_count ?? 0) + 1;

    const update: Record<string, unknown> = {
      bounce_state: bounceState,
      bounce_count: nextCount,
      last_bounced_at: new Date().toISOString(),
    };
    if (suppress) {
      update.suppressed_at = new Date().toISOString();
      update.suppressed_reason = reason;
    }
    await supabaseAdmin.from('ky_notification_preferences').update(update).eq('user_id', userId);
  }

    return NextResponse.json({ ok: true, type: event.type, suppressed: suppress }, { status: 200 });
  } catch (e) {
    console.error('[webhooks/resend]', e);
    Sentry.captureException(e, { tags: { route: 'webhooks/resend' } });
    // Return 500 so Resend retries (the operation is idempotent enough to
    // tolerate replay — log row update by message_id, prefs update by user_id).
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
