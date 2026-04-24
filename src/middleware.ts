import { NextRequest, NextResponse } from 'next/server';

/**
 * Protect /admin/* routes with a shared secret.
 *
 * Pass the secret as the `x-admin-token` request header.
 * If ADMIN_TOKEN is unset the route is open (dev convenience).
 * Returns a proper 401 (not a 404) so tools know to authenticate.
 */
export function middleware(request: NextRequest) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return NextResponse.next(); // unset = open in dev

  const provided = request.headers.get('x-admin-token');
  if (provided !== adminToken) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer realm="admin"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
