import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CONFIG } from '@/lib/config';
import { customerFormat, customerFormats, formatDkk, formatLabel, PRICING } from '@/lib/pricing';
import PixelBoot from '@/components/PixelBoot';

// The link card Meta scrapes must carry the same offer as the page. Both strings are built from
// PRICING, so a price change cannot leave a stale number in the one place nobody thinks to look.
const priceFrom = formatDkk(PRICING[customerFormat()].priceDkk);
const sizes = customerFormats().map((f) => formatLabel(f)).join(', ');

export const metadata: Metadata = {
  metadataBase: new URL(CONFIG.siteUrl),
  title: 'Genfundet – gamle billeder, restaureret og indrammet',
  description: `Tag et foto af det gamle billede med telefonen, se det restaureret på halvandet minut, og få det hjem i ramme. ${sizes}. Fra ${priceFrom} inkl. fri fragt.`,
  openGraph: {
    title: 'Genfundet – gamle billeder, restaureret og indrammet',
    description: `Se dit gamle familiebillede restaureret på halvandet minut. I ramme, ${sizes}, fra ${priceFrom} med fri fragt.`,
    locale: 'da_DK',
    type: 'website',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Før og efter: restaureret familiebillede' }],
  },
  icons: { icon: '/favicon.svg' },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f6f1e8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <head>
        <link rel="preload" href="/fonts/PublicSans-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>{children}<PixelBoot /></body>
    </html>
  );
}
