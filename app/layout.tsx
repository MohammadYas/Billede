import type { Metadata, Viewport } from 'next';
import './globals.css';
import './landing.css';
import { CONFIG } from '@/lib/config';
import { customerFormat, customerFormats, formatDkk, formatLabel, PRICING } from '@/lib/pricing';
import PixelBoot from '@/components/PixelBoot';

// The link card Meta scrapes must carry the same offer as the page. Both strings are built from
// PRICING, so a price change cannot leave a stale number in the one place nobody thinks to look.
const priceFrom = formatDkk(PRICING[customerFormat()].priceDkk);
const sizes = customerFormats().map((f) => formatLabel(f)).join(', ');

export const metadata: Metadata = {
  metadataBase: new URL(CONFIG.siteUrl),
  title: 'Billedarv – gamle billeder, restaureret og indrammet',
  description: `Tag et foto af det gamle billede med telefonen, se det restaureret på halvandet minut, og få det hjem i ramme. ${sizes}. Fra ${priceFrom} inkl. fri fragt.`,
  openGraph: {
    title: 'Billedarv – gamle billeder, restaureret og indrammet',
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
  themeColor: '#fbfaf7',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <head>
        <link rel="preload" href="/fonts/SchibstedGrotesk-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/PublicSans-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        {/* Direction contract (impeccable, seed f6b6e959): an HTML comment that survives the production build. */}
        <div hidden dangerouslySetInnerHTML={{ __html: `<!--
THESIS: One product, proven before it is bought. The page is a product page for a framed photograph, not a story about memory: the visitor's own picture is the argument, so the first thing on screen is a real damaged print turning sharp under their finger. Refused: the cream photo-book spread with archive strangers.
OWN-WORLD: warm white paper (#fbfaf7), near-black ink, one deep green; Schibsted Grotesk for headings and buttons, Public Sans body, Newsreader only in the wordmark; hairline rows, 4-8 px radii, one object shadow; the framed print photographed on a real-looking wall (one generated backdrop, provenance in the file), the CSS frame only as fallback.
STORY: understands what it is in one line, sees proof, learns the three steps and the price with nothing hidden, trusts the sender, acts.
FIRST VIEWPORT: phone: wordmark and price line; headline, one sentence, the button, the risk reversal; then the wedding print as a before/after slider. Desk: headline and button left (5/11), the slider right (6/11), both centred on the first screen.
FORM: the category standard played straight (the user's standing exit), candidate 3 of 7 assigned by seed f6b6e959 declined in favour of canon by the user; bar: Bolia, Apple product pages, Framebridge.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
-->` }} />
        {children}<PixelBoot />
      </body>
    </html>
  );
}
