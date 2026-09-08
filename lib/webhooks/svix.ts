import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifies a Svix-signed webhook (Resend uses Svix): the signed content is `${id}.${timestamp}.${body}`,
 * HMAC-SHA256 with the base64 secret after the `whsec_` prefix, base64-encoded; the header carries one
 * or more `v1,<signature>` entries. Timestamps older or newer than five minutes are refused.
 */
export function verifySvix(secret: string, headers: { id: string | null; timestamp: string | null; signature: string | null }, rawBody: string, now = Date.now()): boolean {
  if (!secret || !headers.id || !headers.timestamp || !headers.signature) return false;
  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${headers.id}.${headers.timestamp}.${rawBody}`).digest();
  for (const part of headers.signature.split(' ')) {
    const [version, sig] = part.split(',');
    if (version !== 'v1' || !sig) continue;
    const given = Buffer.from(sig, 'base64');
    if (given.length === expected.length && timingSafeEqual(given, expected)) return true;
  }
  return false;
}
