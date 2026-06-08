import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';
import { getAuthedUser } from '@/lib/supabase/route-auth';

/**
 * DELETE — permanently delete the authenticated user (Auth + cascaded profile rows).
 * Requires `Authorization: Bearer <access_token>` from the browser session.
 */
export async function DELETE(request: NextRequest) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Server authentication is not configured.' },
      { status: 503 },
    );
  }

  const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(auth.userId);
  if (delErr) {
    console.error('admin.deleteUser:', delErr);
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
