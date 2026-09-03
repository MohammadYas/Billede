import type { Order } from '@/lib/db/orders';

export type FulfillmentJob = { provider: string; reference: string | null; status: 'PENDING' | 'IN_PRODUCTION' | 'SHIPPED' | 'CANCELLED'; checklist?: string[]; trackingNumber?: string | null; trackingUrl?: string | null };

export interface FulfillmentProvider {
  readonly name: string;
  createJob(order: Order, finalDownloadUrl: string): Promise<FulfillmentJob>;
  getStatus(order: Order): Promise<FulfillmentJob>;
  cancel(order: Order): Promise<FulfillmentJob>;
}
