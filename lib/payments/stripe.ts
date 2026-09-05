import Stripe from 'stripe';
import { CONFIG } from '@/lib/config';
import type { Order } from '@/lib/db/orders';
import type { Quote } from '@/lib/pricing';
import type { CheckoutResult, PaymentProvider, VerifiedSession, WebhookOutcome } from './provider';

/**
 * StripeProvider — hosted Checkout, locale da, DKK, DK shipping only.
 * Payment methods: cards, with Apple Pay and Google Pay riding on "card" — Stripe shows whichever
 * wallet the customer's browser actually supports, so nothing here has to guess.
 */
export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe';
  private stripe: Stripe;

  constructor(secretKey = process.env.STRIPE_SECRET_KEY ?? '') {
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY missing');
    this.stripe = new Stripe(secretKey, { typescript: true }); // API version pinned by the SDK package
  }

  /**
   * A quote has no negative lines: every price on this site is a price, not a price minus something.
   * The fold below stays anyway — it is a no-op on the quotes we build, and it is the guard that would
   * keep a future discount from being multiplied by a line quantity. The assertion after it is the one
   * that matters: what Stripe is asked for must equal what the bill showed.
   */
  private lineItems(q: Quote, previewImageUrl?: string): Stripe.Checkout.SessionCreateParams.LineItem[] {
    const positive = q.lines.filter((l) => l.amountOere > 0);
    if (positive.length === 0) throw new Error('quote has no billable line');
    const discount = q.lines.filter((l) => l.amountOere < 0).reduce((sum, l) => sum + l.amountOere, 0);
    const items = positive.map((l, i) => {
      // the discount reduces the first line's *amount*, then the unit price is derived — so a line with
      // quantity > 1 cannot multiply the discount, and a discount larger than the line cannot go negative
      const amount = i === 0 ? Math.max(0, l.amountOere + discount) : l.amountOere;
      const unit = Math.max(0, Math.round(amount / Math.max(1, l.quantity)));
      return {
        quantity: l.quantity,
        price_data: {
          currency: 'dkk',
          unit_amount: unit,
          product_data: {
            name: l.name,
            description: i === 0
              ? `${l.note ?? ''}. Du godkender det færdige billede, før vi printer.`
              : l.note,
            images: i === 0 && previewImageUrl ? [previewImageUrl] : undefined,
          },
        },
      };
    });
    const sum = items.reduce((t, it) => t + (it.price_data!.unit_amount ?? 0) * (it.quantity ?? 1), 0);
    if (sum !== q.totalOere) throw new Error(`line items ${sum} do not add up to the quoted total ${q.totalOere}`);
    return items;
  }

  async createCheckout(order: Order, opts: { quote: Quote; successUrl: string; cancelUrl: string; previewImageUrl?: string }): Promise<CheckoutResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'da',
      currency: 'dkk',
      client_reference_id: order.id,
      line_items: this.lineItems(opts.quote, opts.previewImageUrl),
      shipping_address_collection: { allowed_countries: ['DK'] },
      custom_fields: [{ key: 'gavehilsen', label: { type: 'custom', custom: 'Hilsen på et kort i pakken (valgfri)' }, type: 'text', optional: true, text: { maximum_length: 200 } }],
      // no phone number: nothing in fulfilment needs it, support runs on e-mail, and a required phone
      // field is the most expensive question on a checkout for a brand the customer has just met
      consent_collection: { terms_of_service: 'required' },
      custom_text: {
        terms_of_service_acceptance: {
          message: `Du kan fortryde og få hele beløbet tilbage, indtil du har godkendt det færdige billede på mail. Jeg accepterer, at fortrydelsesretten bortfalder, når den digitale fil leveres, og at printet fremstilles specielt til mig. [Handelsbetingelser](${CONFIG.siteUrl.replace(/\/$/, '')}/handelsbetingelser)`,
        },
      },
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      metadata: {
        order_id: order.id,
        format: order.format,
        size: opts.quote.label,
        frame: opts.quote.addons.frame,
        extra_prints: String(opts.quote.addons.extraPrints),
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
