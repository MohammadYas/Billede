import type { Order } from '@/lib/db/orders';
import { readAddOns, formatLabel } from '@/lib/pricing';
import type { FulfillmentJob, FulfillmentProvider } from './provider';

/**
 * ManualProvider — the owner orders the print at CEWE ("Billede i ramme") or a Danish
 * photo lab and pastes the reference and tracking into the admin. See README.md.
 * A POD provider (Gelato / Printful / Prodigi) is the intended next implementation of
 * this interface; nothing else in the app changes.
 */
export class ManualProvider implements FulfillmentProvider {
  readonly name = 'manual';

  checklist(order: Order, finalDownloadUrl: string): string[] {
    const fmt = formatLabel(order.format);
    const a = readAddOns(((order.preview_meta ?? {}) as { addons?: unknown }).addons);
    const ramme = a.frame === 'eg' ? 'EG (lys træ)' : 'SORT';
    const antal = 1 + a.extraPrints;
    const addr = order.shipping_address as Record<string, string> | null;
    const address = addr ? [addr.name, addr.line1, addr.line2, `${addr.postal_code ?? ''} ${addr.city ?? ''}`.trim()].filter(Boolean).join(', ') : '(adresse mangler)';
    return [
      `Download den færdige fil i printopløsning: ${finalDownloadUrl}`,
      `Bestil hos CEWE → "Billede i ramme", ${fmt}, ramme: ${ramme}, mat papir, passepartout. Alternativt et dansk fotolaboratorium med ramme i ${fmt}.`,
      antal > 1 ? `ANTAL: ${antal} stk. af samme billede i samme ramme – de skal i SAMME pakke.` : 'Antal: 1 stk.',
      `Leveringsadresse (kopiér præcis): ${address}`,
      order.customer_phone ? `Telefon til fragtfirma: ${order.customer_phone}` : 'Telefon til fragtfirma: (mangler)',
      ...(((order.preview_meta ?? {}) as { gift_note?: string }).gift_note ? [`GAVEKORT – skriv på et kort og læg i pakken: “${((order.preview_meta ?? {}) as { gift_note?: string }).gift_note}”`] : []),
      'Indsæt ordrereference fra CEWE/laboratoriet i feltet "Fulfillment-reference" herunder.',
      'Når pakken er sendt: indsæt tracking-nummer og evt. link, og sæt status til SHIPPED (kunden får mail automatisk).',
    ];
  }

  async createJob(order: Order, finalDownloadUrl: string): Promise<FulfillmentJob> {
    return { provider: this.name, reference: order.fulfillment_reference, status: 'PENDING', checklist: this.checklist(order, finalDownloadUrl) };
  }

  async getStatus(order: Order): Promise<FulfillmentJob> {
    const status = order.status === 'SHIPPED' || order.status === 'COMPLETED' ? 'SHIPPED' : order.status === 'IN_PRODUCTION' ? 'IN_PRODUCTION' : 'PENDING';
    return { provider: this.name, reference: order.fulfillment_reference, status, trackingNumber: order.tracking_number, trackingUrl: order.tracking_url };
  }

  async cancel(order: Order): Promise<FulfillmentJob> {
    return { provider: this.name, reference: order.fulfillment_reference, status: 'CANCELLED' };
  }
}

let provider: FulfillmentProvider | null = null;
export function fulfillmentProvider(): FulfillmentProvider {
  if (!provider) provider = new ManualProvider();
  return provider;
}
