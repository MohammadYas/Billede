import { cookies } from 'next/headers';
import type { Utm } from '@/lib/analytics/events';

export const SESSION_COOKIE = 'gf_sid';
export const UTM_COOKIE = 'gf_utm';
export const CONSENT_COOKIE = 'gf_consent';

export async function readSessionId(): Promise<string | null> {
  const c = await cookies();
  return c.get(SESSION_COOKIE)?.value ?? null;
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
