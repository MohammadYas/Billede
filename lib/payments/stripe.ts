import Stripe from 'stripe';
import type { Order } from '@/lib/db/orders';
import { lineItemName, priceOere } from '@/lib/pricing';
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

  async createCheckout(order: Order, opts: { successUrl: string; cancelUrl: string; previewImageUrl?: string }): Promise<CheckoutResult> {
    const mobilePay = process.env.STRIPE_MOBILEPAY_ENABLED === 'true';
    const methods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = mobilePay ? ['mobilepay', 'card'] : ['card'];
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'da',
      currency: 'dkk',
      client_reference_id: order.id,
      payment_method_types: methods,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'dkk',
            unit_amount: priceOere(order.format),
            product_data: {
              name: lineItemName(order.format),
              description: 'Digital fil i høj opløsning inkluderet. Fri fragt. Du godkender det færdige billede, før vi printer.',
              images: opts.previewImageUrl ? [opts.previewImageUrl] : undefined,
            },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: ['DK'] },
      phone_number_collection: { enabled: true },
      consent_collection: { terms_of_service: 'required' },
      custom_text: {
        terms_of_service_acceptance: {
          message: 'Jeg accepterer, at fortrydelsesretten bortfalder, når den digitale fil leveres, og at printet fremstilles specielt til mig. [Handelsbetingelser](' + (process.env.NEXT_PUBLIC_SITE_URL ?? '') + '/handelsbetingelser)',
        },
      },
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      metadata: { order_id: order.id, format: order.format, chosen_colour: String(order.chosen_colour) },
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
    };
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
