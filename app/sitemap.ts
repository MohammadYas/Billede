import type { MetadataRoute } from 'next';
import { CONFIG } from '@/lib/config';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = CONFIG.siteUrl.replace(/\/$/, '');
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/privatliv`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/handelsbetingelser`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
