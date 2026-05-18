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
    return new NextResponse(page('Invalid link', 'This unsubscribe link is not valid. If you received it in an email, try selecting the link again or contact us at hello@kyvky.com.', false), {
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
    return new NextResponse(page('Link not found', 'No subscription was found for this link. You may have already unsubscribed, or the link may have expired.', false), {
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
    return new NextResponse(page('Something went wrong', 'Your preference could not be saved. Please try again, or update your digest settings from your profile page.', false), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new NextResponse(
    page(
      'Digest emails stopped',
      'You will not receive further bill digest emails from Know Your Vote Kentucky. You can re-enable digests at any time from your profile.',
      true,
    ),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}
