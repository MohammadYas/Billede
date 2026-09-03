import type { Order } from '@/lib/db/orders';
import { formatLabel } from '@/lib/pricing';
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
    const addr = order.shipping_address as Record<string, string> | null;
    const address = addr ? [addr.name, addr.line1, addr.line2, `${addr.postal_code ?? ''} ${addr.city ?? ''}`.trim()].filter(Boolean).join(', ') : '(adresse mangler)';
    return [
      `Download den færdige fil i printopløsning: ${finalDownloadUrl}`,
      `Bestil hos CEWE → "Billede i ramme", ${fmt}, sort eller eg ramme, mat papir. Alternativt et dansk fotolaboratorium med ramme i ${fmt}.`,
      `Leveringsadresse (kopiér præcis): ${address}`,
      order.customer_phone ? `Telefon til fragtfirma: ${order.customer_phone}` : 'Telefon til fragtfirma: (mangler)',
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
