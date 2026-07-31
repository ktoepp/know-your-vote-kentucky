/**
 * GET /api/cron/health-check — infrastructure reachability **and** sync-pipeline
 * health. Vercel Cron hits this path; auth matches sync routes (Bearer
 * CRON_SECRET or SYNC_API_KEY).
 *
 * Two independent verdicts, because they need different consequences:
 *
 *   - **Infrastructure** (env missing, Supabase unreachable) → `503 {ok:false}`
 *     plus Slack. An uptime monitor should treat this as down.
 *   - **Data pipeline** (a source stale past its SLO, errored, or stuck in
 *     `running`) → `200 {ok:true, degraded:true}` plus an *edge-triggered* Slack
 *     alert. A late weekly sync is not the site being down, so it must not flip
 *     an uptime monitor red — but it is exactly the class of failure that used
 *     to go unnoticed, so it does page once per distinct breach set.
 *
 * Set `HEALTH_CHECK_FAIL_ON_DEGRADED=true` to return 503 for pipeline breaches
 * too (useful if this endpoint is wired to a pager rather than a status page).
 *
 * Before this route evaluated `ky_sources`, it ran one `select(...).limit(1)`
 * and discarded the row: sources sitting in `error` for days, or stuck in
 * `running` for weeks, all answered `{ok:true}`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';
import { notifyHealthCheckFailureSlack, notifySourceHealthSlack } from '@/lib/slack-webhook';
import {
  evaluateSourceHealth,
  fetchSourceRows,
  formatSourceHealth,
  shouldAlertOnHealth,
} from '@/lib/source-health';

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

  // Infrastructure verdict: the read both proves Supabase is reachable and
  // supplies the rows the pipeline verdict needs.
  let rows;
  try {
    rows = await fetchSourceRows();
  } catch (e) {
    const detail = `Supabase query failed: ${e instanceof Error ? e.message : String(e)}`;
    console.error('[health-check]', detail);
    await notifyHealthCheckFailureSlack(detail).catch((err) =>
      console.error('[health-check] Slack notify failed:', err),
    );
    return NextResponse.json({ ok: false, error: detail }, { status: 503 });
  }

  // Pipeline verdict.
  const health = evaluateSourceHealth(rows);
  const degraded = health.breaches.length > 0;

  if (degraded) {
    const body = formatSourceHealth(health);
    console.error('[health-check]', body);
    if (await shouldAlertOnHealth(health)) {
      await notifySourceHealthSlack(body).catch((e) =>
        console.error('[health-check] Slack notify failed:', e),
      );
    }
  } else {
    // Clear the alert fingerprint on recovery so the next breach re-alerts.
    await shouldAlertOnHealth(health).catch(() => {});
  }

  const failOnDegraded = process.env.HEALTH_CHECK_FAIL_ON_DEGRADED?.trim() === 'true';
  return NextResponse.json(
    {
      ok: true,
      degraded,
      sourcesChecked: health.checked,
      breaches: health.breaches,
      unknownSources: health.unknownSources,
    },
    { status: degraded && failOnDegraded ? 503 : 200 },
  );
}
