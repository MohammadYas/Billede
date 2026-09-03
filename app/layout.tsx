import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CONFIG } from '@/lib/config';

export const metadata: Metadata = {
  metadataBase: new URL(CONFIG.siteUrl),
  title: 'Genfundet – gamle billeder, restaureret og indrammet',
  description: 'Upload et foto af det gamle billede fra telefonen, se resultatet på 20 sekunder, og få det leveret restaureret og indrammet i 30×40 cm. 599 kr. inkl. fri fragt.',
  openGraph: {
    title: 'Genfundet – gamle billeder, restaureret og indrammet',
    description: 'Se dit gamle familiebillede restaureret på 20 sekunder. Indrammet 30×40 cm, 599 kr., fri fragt.',
    locale: 'da_DK',
    type: 'website',
    images: ['/og.jpg'],
  },
  icons: { icon: '/favicon.svg' },
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
      <body>{children}</body>
    </html>
  );
}
