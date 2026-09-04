import type { NextConfig } from 'next';

const supabaseHost = (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://x.supabase.co').host; } catch { return '*.supabase.co'; } })();

// CSP: only Meta Pixel as third-party script; images from self + private-bucket signed URLs.
// 'unsafe-inline' for scripts is required by Next's hydration payload; no external script hosts beyond connect.facebook.net.
const csp = [
  "default-src 'self'",
  // 'unsafe-eval' only in development: React dev tooling needs it; production builds never do.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"} https://connect.facebook.net`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://${supabaseHost} https://www.facebook.com`,
  "font-src 'self'",
  `connect-src 'self' https://${supabaseHost} https://www.facebook.com`,
  "frame-src https://checkout.stripe.com",
  "form-action 'self' https://checkout.stripe.com",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
].join('; ');

if (process.env.NETLIFY === 'true' && process.env.CONTEXT === 'production' && !process.env.JOB_SECRET) {
  throw new Error('JOB_SECRET is not set: the background job runner would reject every restoration. Set it in Netlify → Environment variables.');
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['sharp', 'heic-convert'],
  // read with fs at runtime (founder.md, examples.json, mockup wall): trace them into the server function on Netlify
  outputFileTracingIncludes: { '/*': ['./assets/founder/**', './public/examples/examples.json', './public/mockup/**'] },
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(), microphone=()' },
        ],
      },
      { source: '/fonts/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/examples/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }] },
    ];
  },
};

export default nextConfig;
