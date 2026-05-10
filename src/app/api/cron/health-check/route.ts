/**
 * GET /api/cron/health-check — lightweight DB reachability check for uptime monitoring.
 * Vercel Cron should hit this path; auth matches sync routes (Bearer CRON_SECRET or SYNC_API_KEY).
 * On failure, posts to Slack when SLACK_WEBHOOK_ALERTS or SLACK_WEBHOOK_URL is set.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';
import { notifyHealthCheckFailureSlack } from '@/lib/slack-webhook';

function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  return token || null;
}

function authenticate(req: NextRequest): boolean {
  const token = getBearerToken(req);
  if (!token) return false;
  const syncKey = process.env.SYNC_API_KEY?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!syncKey && !cronSecret) return false;
  if (syncKey && token === syncKey) return true;
  if (cronSecret && token === cronSecret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    const detail = 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY';
    await notifyHealthCheckFailureSlack(detail).catch((e) =>
      console.error('[health-check] Slack notify failed:', e),
    );
    return NextResponse.json({ ok: false, error: detail }, { status: 503 });
  }

  if (!supabaseAdmin) {
    const detail = 'Supabase admin client not initialized (check service role env)';
    await notifyHealthCheckFailureSlack(detail).catch((e) =>
      console.error('[health-check] Slack notify failed:', e),
    );
    return NextResponse.json({ ok: false, error: detail }, { status: 503 });
  }

  const { error } = await supabaseAdmin.from('ky_sources').select('source_name').limit(1);
  if (error) {
    const detail = `Supabase query failed: ${error.message}`;
    console.error('[health-check]', detail);
    await notifyHealthCheckFailureSlack(detail).catch((e) =>
      console.error('[health-check] Slack notify failed:', e),
    );
    return NextResponse.json({ ok: false, error: detail }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
