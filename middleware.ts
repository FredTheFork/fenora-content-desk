import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

/**
 * One gate in front of the whole desk: /media and /login are public (Instagram
 * has to be able to fetch the cards, and you have to be able to sign in), the
 * cron endpoint carries its own secret, everything else needs the session.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const password = process.env.DESK_PASSWORD?.trim() || '';

  if (pathname === '/login' || pathname.startsWith('/api/auth')) return NextResponse.next();
  if (pathname.startsWith('/api/cron')) return NextResponse.next();
  if (pathname.startsWith('/media/')) return NextResponse.next();

  const authed = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, password);

  if (!password) {
    // No password configured. In production the desk stays shut and explains
    // itself; locally it just works so you can develop without ceremony.
    if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_PUBLIC_DESK === '1') {
      return NextResponse.next();
    }
    if (pathname === '/setup') return NextResponse.next();
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { ok: false, error: 'Set DESK_PASSWORD before using the desk.' },
        { status: 503 },
      );
    }
    return NextResponse.redirect(new URL('/setup', req.url));
  }

  if (authed) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }

  const url = new URL('/login', req.url);
  if (pathname !== '/') url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|media/).*)'],
};
