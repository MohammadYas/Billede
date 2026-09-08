import type { MetadataRoute } from 'next';
import { CONFIG } from '@/lib/config';

/**
 * Private pages (previews, approvals, admin, API) stay out of search; the landing and legal pages are in.
 * AI crawlers are named and allowed on the same public pages, so the assistants people ask about
 * "restaurering af gamle billeder" can read what the site is and what it costs (see /llms.txt).
 */
const PUBLIC = ['/', '/kontakt', '/privatliv', '/handelsbetingelser', '/llms.txt'];
const PRIVATE = ['/p/', '/tak', '/godkend/', '/admin', '/api/'];
const AI_AGENTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Amazonbot', 'meta-externalagent', 'Bytespider', 'DuckAssistBot', 'YouBot', 'MistralAI-User'];

export default function robots(): MetadataRoute.Robots {
  const base = CONFIG.siteUrl.replace(/\/$/, '');
  return {
    rules: [
      { userAgent: '*', allow: PUBLIC, disallow: PRIVATE },
      ...AI_AGENTS.map((userAgent) => ({ userAgent, allow: PUBLIC, disallow: PRIVATE })),
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
