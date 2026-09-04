import type { MetadataRoute } from 'next';
import { CONFIG } from '@/lib/config';

/** Private pages (previews, approvals, admin, API) stay out of search; the landing and legal pages are in. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: ['/', '/privatliv', '/handelsbetingelser'], disallow: ['/p/', '/tak', '/godkend/', '/admin', '/api/'] }],
    sitemap: `${CONFIG.siteUrl.replace(/\/$/, '')}/sitemap.xml`,
  };
}
