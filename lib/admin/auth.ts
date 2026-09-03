import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE = 'gf_admin';
const attempts = new Map<string, { n: number; until: number }>();

function secret(): string {
  const s = process.env.ADMIN_PASSWORD;
  if (!s) throw new Error('ADMIN_PASSWORD missing');
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function makeSessionCookie(): string {
  const exp = Date.now() + 12 * 3600e3;
  const payload = String(exp);
  return `${payload}.${sign(payload)}`;
}

export function verifySessionCookie(value: string | undefined): boolean {
  if (!value || !process.env.ADMIN_PASSWORD) return false;
  const [payload, sig] = value.split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload);
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return false;
  return Number(payload) > Date.now();
}

export async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return verifySessionCookie(c.get(COOKIE)?.value);
}

/** 5 attempts per 15 minutes per IP. */
export function rateLimited(ip: string): boolean {
  const now = Date.now();
  const a = attempts.get(ip);
  if (a && a.until > now && a.n >= 5) return true;
  return false;
}
export function recordAttempt(ip: string, ok: boolean) {
  const now = Date.now();
  const a = attempts.get(ip);
  if (ok) { attempts.delete(ip); return; }
  if (!a || a.until < now) attempts.set(ip, { n: 1, until: now + 15 * 60e3 });
  else a.n++;
}
export function passwordOk(input: string): boolean {
  const s = process.env.ADMIN_PASSWORD ?? '';
  if (!s || input.length !== s.length) return false;
  return timingSafeEqual(Buffer.from(input), Buffer.from(s));
}
export const ADMIN_COOKIE = COOKIE;
