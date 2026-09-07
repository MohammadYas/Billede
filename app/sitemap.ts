import type { MetadataRoute } from 'next';
import { CONFIG } from '@/lib/config';

/** Only the public pages. Previews, receipts and approval links are per customer and carry tokens. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = CONFIG.siteUrl.replace(/\/$/, '');
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/handelsbetingelser`, lastModified: new Date('2026-09-07'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privatliv`, lastModified: new Date('2026-09-07'), changeFrequency: 'yearly', priority: 0.3 },
  ];
}
