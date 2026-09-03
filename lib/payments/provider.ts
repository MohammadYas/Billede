import type { Order } from '@/lib/db/orders';

export type CheckoutResult = { url: string; sessionId: string };
export type VerifiedSession = {
  sessionId: string;
  paid: boolean;
  orderId: string | null;
  amount: number | null;
  currency: string | null;
  email: string | null;
  phone: string | null;
  name: string | null;
  shippingAddress: Record<string, unknown> | null;
  paymentIntent: string | null;
};
export type WebhookOutcome = { handled: boolean; type: string; orderId?: string | null; session?: VerifiedSession };

export interface PaymentProvider {
  readonly name: string;
  createCheckout(order: Order, opts: { successUrl: string; cancelUrl: string; previewImageUrl?: string }): Promise<CheckoutResult>;
  verifySession(sessionId: string): Promise<VerifiedSession>;
  handleWebhook(rawBody: string, signature: string | null): Promise<WebhookOutcome>;
  refund(paymentIntent: string): Promise<{ id: string; status: string }>;
}
