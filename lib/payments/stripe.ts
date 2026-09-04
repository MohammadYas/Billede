import Stripe from 'stripe';
import type { Order } from '@/lib/db/orders';
import { formatLabel, type Quote } from '@/lib/pricing';
import type { CheckoutResult, PaymentProvider, VerifiedSession, WebhookOutcome } from './provider';

/**
 * StripeProvider — hosted Checkout, locale da, DKK, DK shipping only.
 * Payment method order: MobilePay → Apple Pay/Google Pay (wallets ride on "card") → cards.
 * Test mode until §13 wires live keys and confirms MobilePay is activated on the account.
 */
export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe';
  private stripe: Stripe;

  constructor(secretKey = process.env.STRIPE_SECRET_KEY ?? '') {
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY missing');
    this.stripe = new Stripe(secretKey, { typescript: true }); // API version pinned by the SDK package
  }

  /**
   * Stripe has no negative line items, so a discount (the repeat price) comes off the first line.
   * The lines are still the ones the customer saw; only the arithmetic moves.
   */
  private lineItems(q: Quote, previewImageUrl?: string): Stripe.Checkout.SessionCreateParams.LineItem[] {
    const positive = q.lines.filter((l) => l.amountOere > 0);
    const discount = q.lines.filter((l) => l.amountOere < 0).reduce((sum, l) => sum + l.amountOere, 0);
    return positive.map((l, i) => {
      const unit = i === 0 ? Math.max(0, l.unitOere + discount) : l.unitOere;
      return {
        quantity: l.quantity,
        price_data: {
          currency: 'dkk',
          unit_amount: unit,
          product_data: {
            name: l.name,
            description: i === 0
              ? `${l.note ?? ''}${discount ? ` · inkl. ${Math.abs(discount) / 100} kr. rabat på billede nummer to` : ''}. Du godkender det færdige billede, før vi printer.`
              : l.note,
            images: i === 0 && previewImageUrl ? [previewImageUrl] : undefined,
          },
        },
      };
    });
  }

  async createCheckout(order: Order, opts: { quote: Quote; successUrl: string; cancelUrl: string; previewImageUrl?: string }): Promise<CheckoutResult> {
    const mobilePay = process.env.STRIPE_MOBILEPAY_ENABLED === 'true';
    const methods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = mobilePay ? ['mobilepay', 'card'] : ['card'];
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'da',
      currency: 'dkk',
      client_reference_id: order.id,
      payment_method_types: methods,
      line_items: this.lineItems(opts.quote, opts.previewImageUrl),
      shipping_address_collection: { allowed_countries: ['DK'] },
      custom_fields: [{ key: 'gavehilsen', label: { type: 'custom', custom: 'Hilsen på et kort i pakken (valgfri)' }, type: 'text', optional: true, text: { maximum_length: 200 } }],
      phone_number_collection: { enabled: true },
      consent_collection: { terms_of_service: 'required' },
      custom_text: {
        terms_of_service_acceptance: {
          message: 'Jeg accepterer, at fortrydelsesretten bortfalder, når den digitale fil leveres, og at printet fremstilles specielt til mig. [Handelsbetingelser](' + (process.env.NEXT_PUBLIC_SITE_URL ?? '') + '/handelsbetingelser)',
        },
      },
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      metadata: {
        order_id: order.id,
        format: order.format,
        size: formatLabel(opts.quote.format),
        frame: opts.quote.addons.frame,
        extra_prints: String(opts.quote.addons.extraPrints),
        repeat: String(opts.quote.repeat),
        chosen_colour: String(order.chosen_colour),
      },
      payment_intent_data: { description: `Genfundet ordre ${order.id.slice(0, 8)}`, metadata: { order_id: order.id } },
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    });
    if (!session.url) throw new Error('Stripe returned no checkout url');
    return { url: session.url, sessionId: session.id };
  }

  private toVerified(s: Stripe.Checkout.Session): VerifiedSession {
    const addr = s.collected_information?.shipping_details ?? null;
    const pi = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id ?? null;
    return {
      sessionId: s.id,
      paid: s.payment_status === 'paid',
      orderId: s.client_reference_id ?? s.metadata?.order_id ?? null,
      amount: s.amount_total ?? null,
      currency: s.currency ?? null,
      email: s.customer_details?.email ?? null,
      phone: s.customer_details?.phone ?? null,
      name: addr?.name ?? s.customer_details?.name ?? null,
      shippingAddress: addr ? { name: addr.name, ...addr.address } : null,
      paymentIntent: pi,
      giftNote: s.custom_fields?.find((f) => f.key === 'gavehilsen')?.text?.value ?? null,
    };
  }

  async expireSession(sessionId: string): Promise<void> {
    try { await this.stripe.checkout.sessions.expire(sessionId); } catch { /* already paid, expired or unknown: nothing to close */ }
  }

  async verifySession(sessionId: string): Promise<VerifiedSession> {
    const s = await this.stripe.checkout.sessions.retrieve(sessionId);
    return this.toVerified(s);
  }

  async handleWebhook(rawBody: string, signature: string | null): Promise<WebhookOutcome> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || !signature) throw new Error('webhook secret or signature missing');
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const s = event.data.object as Stripe.Checkout.Session;
      const session = this.toVerified(s);
      return { handled: true, type: event.type, orderId: session.orderId, session };
    }
    return { handled: false, type: event.type };
  }

  async refund(paymentIntent: string): Promise<{ id: string; status: string }> {
    const r = await this.stripe.refunds.create({ payment_intent: paymentIntent });
    return { id: r.id, status: r.status ?? 'unknown' };
  }
}

let provider: PaymentProvider | null = null;
export function paymentProvider(): PaymentProvider {
  if (!provider) provider = new StripeProvider();
  return provider;
}
