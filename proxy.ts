import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verifySessionToken } from '@/lib/auth';

// Everything requires a session except the login page and its API route.
// File convention is `proxy.ts` (Next.js 16 renamed `middleware.ts` — same
// mechanism, new name). jose is used for the JWT since Proxy can still run
// on either runtime depending on config.
const PUBLIC_PATHS = ['/login', '/api/auth/login'];

// Routes that authenticate themselves and must NOT be gated here.
//
// /api/orders/session is called by the Steam Session Bridge extension. That is
// a cross-site fetch from a chrome-extension:// origin, and the dashboard
// session cookie is SameSite=Lax, so it is never sent on such a request — the
// cookie check below would reject it no matter what. The route therefore does
// its own check, accepting EITHER the normal session cookie OR a bearer
// BRIDGE_SECRET. Do not add anything here that does not authenticate itself.
const SELF_AUTHED_PATHS = ['/api/orders/session'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    PUBLIC_PATHS.some((p) => pathname === p) ||
    SELF_AUTHED_PATHS.some((p) => pathname === p) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const valid = token ? await verifySessionToken(token) : false;

  if (!valid) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
