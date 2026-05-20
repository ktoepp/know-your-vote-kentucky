import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { shouldRefreshSupabaseSession } from '@/lib/supabase/session-middleware';

export async function middleware(request: NextRequest) {
  const sessionResponse = shouldRefreshSupabaseSession(request)
    ? await updateSession(request)
    : NextResponse.next({ request });

  if (request.nextUrl.pathname.startsWith('/admin')) {
    const adminToken = process.env.ADMIN_TOKEN;
    if (!adminToken) return sessionResponse;

    const provided = request.headers.get('x-admin-token');
    if (provided !== adminToken) {
      return new NextResponse('Unauthorized', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Bearer realm="admin"' },
      });
    }
  }

  return sessionResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and Sentry tunnel.
     * Needed so Supabase can refresh the session cookie on navigation.
     */
    '/((?!_next/static|_next/image|favicon.ico|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
