import type { Order } from '@/lib/db/orders';
import { readAddOns } from '@/lib/pricing';
import { isLandscape, orderLabel, orderProduct } from '@/lib/order-summary';
import type { FulfillmentJob, FulfillmentProvider } from './provider';

/**
 * ManualProvider — the owner orders the print at CEWE ("Billede i ramme") or a Danish
 * photo lab and pastes the reference and tracking into the admin. See README.md.
 * A POD provider (Gelato / Printful / Prodigi) is the intended next implementation of
 * this interface; nothing else in the app changes.
 */
export class ManualProvider implements FulfillmentProvider {
  readonly name = 'manual';

  /**
   * The bench instruction, per product. This is what the owner works from, so it must describe the
   * parcel in front of him and nothing else: a 99 kr. file that told him to order a framed print at
   * CEWE would cost more than the order was worth, and a loose print ordered as "Billede i ramme"
   * arrives as the wrong product at the customer's door.
   */
  checklist(order: Order, finalDownloadUrl: string): string[] {
    const product = orderProduct(order);
    const fmt = `${orderLabel(order)}${isLandscape(order) ? ' LIGGENDE – rammen vendes' : ' stående'}`;
    const a = readAddOns(((order.preview_meta ?? {}) as { addons?: unknown }).addons);
    const ramme = a.frame === 'eg' ? 'EG (lys træ)' : 'SORT';
    const antal = 1 + a.extraPrints;
    const addr = order.shipping_address as Record<string, string> | null;
    const address = addr ? [addr.name, addr.line1, addr.line2, `${addr.postal_code ?? ''} ${addr.city ?? ''}`.trim()].filter(Boolean).join(', ') : '(adresse mangler)';
    const gift = ((order.preview_meta ?? {}) as { gift_note?: string }).gift_note;

    // The file alone: nothing is ordered, nothing is packed, nothing is posted. The customer already
    // has the download link from the approval page — the only thing to check is that the file is there.
    if (product === 'digital') {
      return [
        `Kun den digitale fil. Der skal ikke bestilles, printes eller sendes noget.`,
        `Tjek at filen kan hentes: ${finalDownloadUrl}`,
        'Kunden henter den selv fra godkendelsessiden, så snart hun har godkendt. Linket kommer ikke i en fragtmail, for der er ingen.',
        'Når du har set at filen er der: sæt status til FULDFØRT. Ordren skal ikke forbi AFSENDT.',
      ];
    }

    const printLines = product === 'print'
      ? [
          `Bestil et LØST PRINT i ${fmt} på mat fotopapir – UDEN ramme, uden glas, uden passepartout.`,
          'Pak det fladt mellem to stykker pap i en stiv kuvert, så det ikke bukker.',
        ]
      : [
          `Bestil hos CEWE → "Billede i ramme", ${fmt}, ramme: ${ramme}, mat papir, passepartout. Alternativt et dansk fotolaboratorium med ramme i ${fmt}.`,
          antal > 1 ? `ANTAL: ${antal} stk. af samme billede i samme ramme – de skal i SAMME pakke.` : 'Antal: 1 stk.',
        ];
    return [
      `Download den færdige fil i printopløsning: ${finalDownloadUrl}`,
      ...printLines,
      `Leveringsadresse (kopiér præcis): ${address}`,
      order.customer_phone ? `Telefon til fragtfirma: ${order.customer_phone}` : 'Telefon til fragtfirma: (mangler)',
      ...(gift ? [`GAVEKORT – skriv på et kort og læg i pakken: “${gift}”`] : []),
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
