import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'gf_sid';
const UTM_COOKIE = 'gf_utm';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];

/**
 * Sets an anonymous session id (needed to tie a preview to the browser that made it)
 * and persists utm_* / fbclid for order attribution. Both are session cookies.
 */
export function proxy(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get(SESSION_COOKIE)) {
    res.cookies.set(SESSION_COOKIE, crypto.randomUUID(), { httpOnly: true, sameSite: 'lax', secure: req.nextUrl.protocol === 'https:', path: '/' });
  }
  const utm: Record<string, string> = {};
  for (const k of UTM_KEYS) { const v = req.nextUrl.searchParams.get(k); if (v) utm[k] = v.slice(0, 200); }
  if (Object.keys(utm).length) {
    res.cookies.set(UTM_COOKIE, JSON.stringify(utm), { httpOnly: true, sameSite: 'lax', secure: req.nextUrl.protocol === 'https:', path: '/', maxAge: 60 * 60 * 24 * 7 });
  }
  return res;
}

export const config = { matcher: ['/((?!_next|fonts|examples|favicon.svg|og.jpg|api/webhooks).*)'] };
