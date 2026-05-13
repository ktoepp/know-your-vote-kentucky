import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';

function page(title: string, body: string, ok: boolean) {
  const color = ok ? '#166534' : '#991b1b';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head><body style="font-family:system-ui,sans-serif;max-width:520px;margin:48px auto;padding:0 16px;color:#0f172a"><h1 style="color:${color};font-size:1.35rem">${title}</h1><p style="line-height:1.5">${body}</p><p style="margin-top:24px;font-size:14px"><a href="/">Back to Know Your Vote Kentucky</a></p></body></html>`;
}

type Ctx = { params: Promise<{ token: string }> };

/**
 * One-click unsubscribe from digest emails (no login). Sets digest to off and marks unsubscribed_all_at.
 */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { token: raw } = await params;
  const token = decodeURIComponent(raw || '').trim();
  if (!token || !supabaseAdmin) {
    return new NextResponse(page('Unsubscribe', 'This link is invalid or the server is not configured.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const { data: row, error: selErr } = await supabaseAdmin
    .from('ky_notification_preferences')
    .select('user_id')
    .eq('unsubscribe_token', token)
    .maybeSingle();

  if (selErr || !row?.user_id) {
    return new NextResponse(page('Unsubscribe', 'We could not find a subscription for this link.', false), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const { error: upErr } = await supabaseAdmin
    .from('ky_notification_preferences')
    .update({
      digest_frequency: 'off',
      unsubscribed_all_at: new Date().toISOString(),
    })
    .eq('unsubscribe_token', token);

  if (upErr) {
    return new NextResponse(page('Something went wrong', 'Please try again later or update preferences in your profile.', false), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new NextResponse(
    page(
      'You are unsubscribed',
      'You will not receive further bill digest emails. You can turn digests back on anytime from your profile.',
      true,
    ),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}
