import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { shouldRefreshSupabaseSession } from '@/lib/supabase/session-middleware';
import { checkAdminAccess } from '@/lib/auth/shared-secret';

export async function middleware(request: NextRequest) {
  const sessionResponse = shouldRefreshSupabaseSession(request)
    ? await updateSession(request)
    : NextResponse.next({ request });

  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Only an exact 'ok' continues. src/app/admin/layout.tsx repeats this check.
    const access = await checkAdminAccess(request.headers);
    switch (access) {
      case 'ok':
        break;
      case 'denied':
        return new NextResponse('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Bearer realm="admin"' },
        });
      case 'not-configured':
      default:
        return new NextResponse('Not Found', { status: 404 });
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
