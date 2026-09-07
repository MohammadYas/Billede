import { CONFIG } from '@/lib/config';
import { copy } from '@/lib/copy';
import { getFounder } from '@/lib/founder';
import { customerFormats, formatLabel, PRICING } from '@/lib/pricing';

/**
 * Structured data for the landing page: the organization, the one product with an offer per size, and the FAQ.
 * Built from the same copy and pricing as the page, so search engines and assistants read the real numbers.
 */
export default function JsonLd() {
  const c = copy();
  const f = getFounder();
  const base = CONFIG.siteUrl.replace(/\/$/, '');
  const org = {
    '@type': 'Organization',
    '@id': `${base}/#org`,
    name: 'Billedarv',
    legalName: f.company || undefined,
    url: base,
    logo: `${base}/logo.png`,
    email: f.email || undefined,
    vatID: f.cvr ? `DK${f.cvr}` : undefined,
    address: f.city ? { '@type': 'PostalAddress', addressLocality: f.city, addressCountry: 'DK' } : undefined,
    areaServed: 'DK',
  };
  const product = {
    '@type': 'Product',
    '@id': `${base}/#product`,
    name: 'Restaureret og indrammet familiebillede',
    description: c.produkt.lead,
    image: `${base}/og.jpg`,
    brand: { '@id': `${base}/#org` },
    offers: customerFormats().map((fm) => ({
      '@type': 'Offer',
      name: `${formatLabel(fm)} i ramme`,
      price: PRICING[fm].priceDkk,
      priceCurrency: 'DKK',
      availability: 'https://schema.org/InStock',
      url: base,
      shippingDetails: { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'DKK' }, shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'DK' } },
      hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', applicableCountry: 'DK', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: 21, refundType: 'https://schema.org/FullRefund' },
    })),
  };
  const faq = {
    '@type': 'FAQPage',
    mainEntity: c.spoergsmaal.items.map((it) => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } })),
  };
  const site = { '@type': 'WebSite', '@id': `${base}/#website`, url: base, name: 'Billedarv', inLanguage: 'da-DK', publisher: { '@id': `${base}/#org` } };
  const howto = {
    '@type': 'HowTo',
    name: c.saadan.h2,
    step: c.saadan.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: c.saadan.titles[i], text: s })),
  };
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': [org, site, product, howto, faq] });
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json.replace(/</g, '\\u003c') }} />;
}
