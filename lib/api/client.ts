import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/lib/db/supabase';

/**
 * The client's IP as the edge saw it. Netlify puts the real peer in x-nf-client-connection-ip; elsewhere
 * the LAST x-forwarded-for entry is the one our own proxy appended (the first can be anything the
 * client typed). Used only to cap how much free work one network can start.
 */
export function clientIp(h: Headers): string | null {
  const nf = h.get('x-nf-client-connection-ip')?.trim();
  if (nf) return nf;
  const parts = (h.get('x-forwarded-for') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

/** A short salted hash of the IP: enough to count, not enough to read the address back out of a row. */
export function clientKey(h: Headers): string | null {
  const ip = clientIp(h);
  if (!ip) return null;
  const salt = process.env.JOB_SECRET ?? process.env.CRON_SECRET ?? 'billedearv';
  return createHash('sha256').update(`${salt}|${ip}`).digest('base64url').slice(0, 24);
}

/**
 * True when this client already created `max` orders in the window (orders carry `preview_meta.client`).
 * Fails open: a database hiccup must never stop a real customer; the cap is for scripts, not people.
 */
export async function tooManyOrders(client: string | null, opts: { max: number; windowMs: number }): Promise<boolean> {
  if (!client) return false;
  try {
    const since = new Date(Date.now() - opts.windowMs).toISOString();
    const { count } = await supabaseAdmin().from('orders').select('id', { count: 'exact', head: true }).eq('preview_meta->>client', client).gte('created_at', since);
    return (count ?? 0) >= opts.max;
  } catch {
    return false;
  }
}

/** Orders one network may start per hour: a family evening with several photographs fits, a loop does not. */
export const ORDERS_PER_HOUR = 10;
/** Leads (mail-sending) one network may create per hour. */
export const LEADS_PER_HOUR = 5;
