import { randomBytes } from 'node:crypto';
import { supabaseAdmin } from './supabase';
import type { Format } from '@/lib/pricing';
import type { Utm } from '@/lib/analytics/events';

export type OrderStatus =
  | 'NEW' | 'PREVIEW_READY' | 'PAID' | 'IN_RETOUCH' | 'AWAITING_APPROVAL' | 'CHANGE_REQUESTED'
  | 'APPROVED' | 'IN_PRODUCTION' | 'SHIPPED' | 'COMPLETED' | 'REFUNDED' | 'MANUAL_REVIEW' | 'ABANDONED';

export type Order = {
  id: string;
  created_at: string;
  updated_at: string;
  status: OrderStatus;
  format: Format;
  original_path: string | null;
  preview_path: string | null;
  restored_path: string | null;
  colourised_path: string | null;
  mockup_path: string | null;
  chosen_colour: boolean;
  final_path: string | null;
  preview_meta: Record<string, unknown> | null;
  is_monochrome: boolean | null;
  payment_provider: string | null;
  payment_session_id: string | null;
  payment_intent: string | null;
  amount: number | null;
  currency: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_name: string | null;
  shipping_address: Record<string, unknown> | null;
  approval_status: 'NONE' | 'SENT' | 'APPROVED' | 'CHANGE_REQUESTED';
  approval_token: string | null;
  approval_reminder_sent_at: string | null;
  change_request_text: string | null;
  fulfillment_provider: string | null;
  fulfillment_reference: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  utm: Utm | null;
  internal_notes: string | null;
  preview_ready_at: string | null;
  paid_at: string | null;
  in_retouch_at: string | null;
  awaiting_approval_at: string | null;
  change_requested_at: string | null;
  approved_at: string | null;
  in_production_at: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  refunded_at: string | null;
  manual_review_at: string | null;
  abandoned_at: string | null;
  deleted_at: string | null;
};

export const STATUS_FLOW: OrderStatus[] = [
  'NEW', 'PREVIEW_READY', 'PAID', 'IN_RETOUCH', 'AWAITING_APPROVAL', 'CHANGE_REQUESTED',
  'APPROVED', 'IN_PRODUCTION', 'SHIPPED', 'COMPLETED', 'REFUNDED', 'MANUAL_REVIEW', 'ABANDONED',
];

const TRANSITION_TS: Partial<Record<OrderStatus, keyof Order>> = {
  PREVIEW_READY: 'preview_ready_at', PAID: 'paid_at', IN_RETOUCH: 'in_retouch_at', AWAITING_APPROVAL: 'awaiting_approval_at',
  CHANGE_REQUESTED: 'change_requested_at', APPROVED: 'approved_at', IN_PRODUCTION: 'in_production_at', SHIPPED: 'shipped_at',
  COMPLETED: 'completed_at', REFUNDED: 'refunded_at', MANUAL_REVIEW: 'manual_review_at', ABANDONED: 'abandoned_at',
};

export async function createOrder(fields: Partial<Order> = {}): Promise<Order> {
  const { data, error } = await supabaseAdmin().from('orders').insert({ ...fields }).select('*').single();
  if (error) throw new Error(`createOrder: ${error.message}`);
  return data as Order;
}

export async function getOrder(id: string): Promise<Order | null> {
  const { data, error } = await supabaseAdmin().from('orders').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`getOrder: ${error.message}`);
  return (data as Order) ?? null;
}

export async function getOrderByField(field: 'payment_session_id' | 'approval_token', value: string): Promise<Order | null> {
  const { data, error } = await supabaseAdmin().from('orders').select('*').eq(field, value).maybeSingle();
  if (error) throw new Error(`getOrderByField: ${error.message}`);
  return (data as Order) ?? null;
}

export async function updateOrder(id: string, fields: Partial<Order>): Promise<Order> {
  const { data, error } = await supabaseAdmin().from('orders').update(fields).eq('id', id).select('*').single();
  if (error) throw new Error(`updateOrder: ${error.message}`);
  return data as Order;
}

/** Sets status and stamps the matching transition timestamp. */
export async function setStatus(id: string, status: OrderStatus, extra: Partial<Order> = {}): Promise<Order> {
  const ts = TRANSITION_TS[status];
  const fields: Partial<Order> = { status, ...extra };
  if (ts) (fields as Record<string, unknown>)[ts] = new Date().toISOString();
  return updateOrder(id, fields);
}

export async function listOrders(opts: { status?: OrderStatus; limit?: number } = {}): Promise<Order[]> {
  let q = supabaseAdmin().from('orders').select('*').order('created_at', { ascending: false }).limit(opts.limit ?? 200);
  if (opts.status) q = q.eq('status', opts.status);
  const { data, error } = await q;
  if (error) throw new Error(`listOrders: ${error.message}`);
  return (data as Order[]) ?? [];
}

export function newApprovalToken(): string {
  return randomBytes(24).toString('base64url');
}
