import { cookies } from 'next/headers';
import type { Utm } from '@/lib/analytics/events';

export const SESSION_COOKIE = 'gf_sid';
export const UTM_COOKIE = 'gf_utm';
export const CONSENT_COOKIE = 'gf_consent';

export async function readSessionId(): Promise<string | null> {
  const c = await cookies();
  return c.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Session id for a route handler: the cookie if the proxy set it, otherwise a fresh id the route must
 * set on its response (`setSessionCookie`). Keeps the flow working on a host that never runs proxy.ts.
 */
export async function ensureSessionId(): Promise<{ sid: string; fresh: boolean }> {
  const existing = await readSessionId();
  if (existing) return { sid: existing, fresh: false };
  return { sid: crypto.randomUUID(), fresh: true };
}

export function sessionCookie(sid: string, secure: boolean): string {
  return `${SESSION_COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

export async function readUtm(): Promise<Utm | null> {
  const c = await cookies();
  const raw = c.get(UTM_COOKIE)?.value;
  if (!raw) return null;
  try { return JSON.parse(raw) as Utm; } catch { return null; }
}

export function utmFromSearchParams(sp: URLSearchParams): Utm {
  const out: Utm = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'] as const) {
    const v = sp.get(k);
    if (v) out[k] = v.slice(0, 200);
  }
  return out;
}
