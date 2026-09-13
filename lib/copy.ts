// Locked Danish copy (spec §4–§6). Placeholders render from config and founder.md.
// Conversion attack #1 (QA.md) changed: hero, trust row, product label, FAQ, sheet, wait, preview bar, /tak.
import { CONFIG, campaignActive, currentSeason, daysToCutoff, deliveryPromise, formatCutoffDate, type Season } from '@/lib/config';
import { formatDkk, PRICING, customerFormat, customerFormats, formatLabel, formatLabelFor, EXTRA_PRINT_DKK, RECOMMENDED_FORMAT, PRINT_FORMAT, productOffers, type Format } from '@/lib/pricing';
import { fornavn, getFounder } from '@/lib/founder';

/**
 * The primary call to action, everywhere it appears on the landing page (hero, price, closing line,
 * the sticky bar). One string, one switch: NEXT_PUBLIC_CTA_VARIANT=A|B|C picks the wording at build
 * time, and FlowOpened logs the letter, so two deploys can be compared in the events table without
 * any testing infrastructure. C is the default: first person, like "Bestil mit billede" and "Vis mig
 * resultatet" further down the same funnel — one voice from the first tap to the last.
 */
export const CTA_VARIANTS = {
  A: 'Se hvad dit billede kan blive til',
  B: 'Genskab mit billede',
  C: 'Se mit billede restaureret gratis',
} as const;
export type CtaVariant = keyof typeof CTA_VARIANTS;
export function ctaVariant(): CtaVariant {
  const v = process.env.NEXT_PUBLIC_CTA_VARIANT;
  return v && v in CTA_VARIANTS ? (v as CtaVariant) : 'C';
}
export const primaryCta = () => CTA_VARIANTS[ctaVariant()];
/** The same call to action where a whole sentence does not fit: the header on a phone, the sticky bar. */
export const PRIMARY_CTA_SHORT = 'Se mit billede gratis';

/** "Til sammenligning …" under the price. The owner's own market figure; the owner keeps the evidence for it. */
export const PRICE_ANCHOR = 'Til sammenligning: hos en fotograf koster restaureringen alene typisk 300–600 kr. – uden ramme og levering.';

export function copy(season: Season = currentSeason()) {
  const f = getFounder();
  const navn = fornavn(); // the first name once the founder is on the page, otherwise "vi"
  const personal = navn !== 'vi';
  const format = customerFormat();
  const price = formatDkk(PRICING[format].priceDkk);
  const dato = formatCutoffDate();
  const X = CONFIG.deliveryDaysMax;
  const levering = deliveryPromise(season);
  const by = f.city;
  const jul = season === 'jul';
  const email = f.email ?? '';
  const emailHref = email ? `mailto:${email}` : '';
  const skrivTil = personal ? `skriv til ${cap(navn)}` : 'skriv til os';
  const days = daysToCutoff();
  const pay = 'Apple Pay, Google Pay eller kort';
  const cta = primaryCta();
  // Launch offer (lib/config.ts campaignEndDate): a dated, real offer, worded the same everywhere it appears
  const kampagne = campaignActive();
  const kampagneDato = formatCutoffDate(CONFIG.campaignEndDate || '2000-01-01');
  const kampagneFaq = kampagne ? ` Til og med ${kampagneDato} er det første ekstra eksemplar med i pakken uden beregning – det er vores lanceringstilbud.` : '';

  // Sizes. The landing page quotes the cheapest ("fra 599 kr."); the customer picks on the preview page,
  // and every price-bearing line exists once per size so nothing has to be patched together in the browser.
  const sizes = customerFormats();
  const hint: Record<string, string> = {
    '20x30': 'Til reolen eller natbordet',
    '30x40': 'Som en almindelig fotoramme',
    '40x50': 'Fylder på væggen',
    '50x70': 'Det store, man ser fra døren',
  };
  const rowsFor = (fmt: Format, lbl: string): [string, string][] => [
    ['Print', `${lbl} på mat fotopapir, farveægte`],
    ['Ramme', 'Sort eller eg, med passepartout og glas, klar til at hænge op'],
    ['Fil', 'Den restaurerede fil i høj opløsning – din at hente, så snart du har godkendt'],
    ['Godkendelse', `${cap(navn)} gennemgår billedet og tjekker ansigterne. Du ser det færdige billede og siger ja, før vi printer`],
    ['Levering', `${cap(levering)}, efter du har sagt ja. Fri fragt i Danmark, pakket så glasset holder`],
    ['Garanti', 'Ligner det ikke, får du pengene tilbage'],
  ];
  const variant = (fmt: Format, landscape = false) => {
    const lbl = formatLabelFor(fmt, landscape);
    const pris = formatDkk(PRICING[fmt].priceDkk);
    return {
      format: fmt,
      label: lbl,
      price: pris,
      priceDkk: PRICING[fmt].priceDkk,
      hint: hint[fmt] ?? '',
      recommended: fmt === RECOMMENDED_FORMAT,
      extraPrint: formatDkk(EXTRA_PRINT_DKK[fmt]),
      specTitle: `Det får du for ${pris}`,
      cta: `Bestil mit billede – ${pris}`,
      p: `Du får billedet printet i ${lbl} på mat fotopapir, i ramme med passepartout og glas, klar til at hænge op – og den restaurerede fil i høj opløsning. Fri fragt, og du godkender det færdige billede, før vi printer.`,
      rows: rowsFor(fmt, lbl),
    };
  };
  const priceFrom = sizes.length > 1 ? `fra ${price}` : price;
  // The two small products: the loose print and the file alone. Off until the owner sets a price
  // (lib/pricing.ts productOffers). Every line that mentions either is built here, so switching one
  // on or off is an environment variable and no code change.
  const offers = productOffers();
  const digitalPrice = formatDkk(offers.digital.priceDkk);
  const printPrice = formatDkk(offers.print.priceDkk);
  const printLabel = formatLabel(PRINT_FORMAT);
  const alternatives = [offers.print.enabled ? `Print uden ramme ${printPrice} inkl. fragt` : '', offers.digital.enabled ? `Digital fil ${digitalPrice}` : ''].filter(Boolean).join(' · ');
  // The first screen keeps the framed offer as the anchor, while making every paid outcome explicit
  // before the visitor uploads. The cheapest price is never presented without its object or timing.
  const priceLadder = [
    { key: 'framed', label: 'Indrammet', price: priceFrom, detail: 'inkl. fragt' },
    ...(offers.print.enabled ? [{ key: 'print', label: 'Print uden ramme', price: printPrice, detail: 'inkl. fragt' }] : []),
    ...(offers.digital.enabled ? [{ key: 'digital', label: 'Digital fil', price: digitalPrice, detail: 'ingen levering' }] : []),
  ];

  return {
    season,
    price,
    format,
    formatLabel: formatLabel(format),
    priceFrom,
    alternatives,
    email,
    emailHref,
    /** every size, and every price-bearing line for it, portrait and landscape */
    variants: { portrait: sizes.map((fmt) => variant(fmt, false)), landscape: sizes.map((fmt) => variant(fmt, true)) },
    sizes: sizes.map((fmt) => [formatLabel(fmt), formatDkk(PRICING[fmt].priceDkk)] as [string, string]),
    hero: {
      /** one line above the headline: the free look, then the paid object — never "gratis" on its own */
      eyebrow: 'Se resultatet, før du køber',
      deadline: jul ? (days > 0 ? `Julegaven 2026 · bestil senest ${dato}, så er den under træet` : days === 0 ? `Sidste dag for levering inden jul` : `Julen er nået – vi leverer inden ${X} hverdage`) : '',
      h1: 'Få det gamle familiebillede tilbage.',
      sub: `Tag et foto med mobilen og se restaureringen gratis. Kan du lide resultatet, gennemgår vi det og sender det hjem til dig i ramme ${priceFrom} inkl. fragt.`,
      cta,
      ctaShort: PRIMARY_CTA_SHORT,
      priceLadderLead: 'Efter dit gratis preview vælger du selv:',
      priceLadder,
      /** under the button: the two objections a cold visitor has, and the price so "gratis" never stands alone */
      trust: ['Originalen bliver hjemme', 'Du godkender før print', `${cap(priceFrom)} inkl. fragt`],
      /** the value line beside any repeated button */
      valueLine: `I ramme ${priceFrom} inkl. fragt`,
      smallStrong: 'Se resultatet gratis, før du bestiller.',
      small: `I ramme ${priceFrom} inkl. fragt.`,
      mockCaption: `${formatLabel(format)} i sort ramme med passepartout og glas. Sådan kommer det.`,
      beforeCaption: 'Sådan så det ud, før.',
      /** under the fading pair: what the picture is doing, and the one thing a finger can do */
      fadeHint: 'Billedet skifter selv mellem før og efter. Tryk på det, hvis du selv vil skifte.',
      /** the whole path in one line, right under the button */
      countdown: jul && days > 0 ? `${days} ${days === 1 ? 'dag' : 'dage'} til sidste bestilling for levering inden jul` : '',
    },
    gave: {
      h2: jul ? 'Den julegave, de ikke selv kan købe' : 'Den gave, de ikke selv kan købe',
      lead: 'Til den runde fødselsdag, jubilæet, guldbrylluppet eller julen: et billede, de troede var gået tabt – restaureret, i ramme, klar til at hænge op. Det er den slags, der bliver stille ved bordet.',
      points: [
        ['Tag billedet i smug', 'Et foto af det gamle billede med telefonen er nok. Læg det tilbage i skuffen, inden nogen ser det.'],
        ['Send det direkte – eller hjem til dig', 'Skriv modtagerens adresse ved betaling, hvis det skal sendes direkte. Ellers kommer det hjem til dig, pakket så glasset holder.'],
        [jul ? 'Under træet til tiden' : 'Til tiden', jul ? `Bestil senest ${dato}, så er det leveret inden jul. Du godkender billedet på mail, før vi printer.` : `Leveret ${levering}, efter du har godkendt billedet på mail.`],
      ] as [string, string][],
    },
    /** the hairline row under the hero: positive facts only; what happens if something goes wrong lives by the price and in the FAQ */
    tryghed: [
      'Du godkender ansigterne, før vi printer',
      'Se resultatet gratis, før du bestiller',
      `Dansk virksomhed${by ? `, ${by}` : ''}${f.cvr ? ` · CVR ${f.cvr}` : ''}`,
    ],
    /** the object, early: the same photograph as a print, a frame and a parcel — why the price is not an app's price */
    skuffen: {
      h2: 'Fra skuffen til væggen.',
      lead: `Se restaureringen gratis. Kan du lide resultatet, får du det færdigt som print i ramme ${priceFrom} inkl. fragt.`,
      chain: ['Dit gamle billede', 'Restaureret og gennemgået', 'Printet på mat fotopapir', 'I ramme, sendt hjem'],
      valueH: `Det får du ${priceFrom}`,
      value: [
        'Restaurering, gennemgået af et menneske før print',
        'Print på mat fotopapir',
        'Ramme i sort eller eg, med passepartout og glas',
        'Den restaurerede fil i høj opløsning',
        'Fri fragt i Danmark',
      ],
    },
    saadan: {
      h2: 'Sådan foregår det',
      titles: ['Tag et foto', 'Se restaureringen gratis', 'Godkend og få det hjem i ramme'],
      steps: [
        'Du sender aldrig originalen. Et godt mobilfoto i dagslys er nok.',
        'På omkring halvandet minut kan du se, hvad billedet kan blive til. Kan du ikke lide det, bestiller du ingenting.',
        `Bestiller du – i ramme ${priceFrom} inkl. fragt – bliver resultatet gennemgået. Du godkender det færdige billede på mail, før vi printer. Leveret ${levering}.`,
      ],
      note: 'Papir falmer, og folder bliver ikke glattere med årene. Et foto af billedet, som det er nu, er nok til at redde det.',
    },
    /** the objection that decides the purchase: will it still be them */
    ligne: {
      h2: 'Det skal stadig ligne dem.',
      p: 'Restaureringen må ikke gøre mor, far eller bedstefar til en anden person. Bestiller du, gennemgår vi ansigterne, og du godkender resultatet, før vi printer.',
      hint: 'Træk i midten. Samme ansigt, før og efter.',
    },
    original: {
      h2: 'Du sender aldrig originalen.',
      p: 'Tag blot et foto med mobilen. Dit gamle familiebillede bliver hjemme hos dig.',
    },
    taetPaa: { h2: 'Tæt på', p: 'Det er i detaljerne, man kan se, om det er gjort ordentligt. Øjne, hænder, skrift og stof – ikke udglattet, bare rene.' },
    produkt: {
      h2: `Vælg størrelse og ramme`,
      lead: `Restaureret foto, print, ramme og levering. Ét beløb ${priceFrom} – ingen tillæg.`,
      rows: rowsFor(format, formatLabel(format)),
      sizesTitle: 'Størrelser',
      sizeCards: sizes.map((fmt) => ({ format: fmt, label: formatLabel(fmt), price: formatDkk(PRICING[fmt].priceDkk), hint: hint[fmt] ?? '', recommended: fmt === RECOMMENDED_FORMAT })),
      recommended: 'Anbefalet',
      sizesNote: 'Samme billede og samme kvalitet i alle tre. Tryk på den, du vil have.',
      carry: 'Dit valg følger med til bestillingssiden. Du kan skifte igen, når du har set dit billede.',
      note: `Restaurering, print, ramme, indpakning og fragt – ét beløb per billede.`,
    },
    eksempler: { h2: 'Det kunne være jeres.', how: 'Billederne skifter selv mellem før og efter. Tryk på et billede, hvis du selv vil skifte.', colourOn: 'Se den i farver', colourOff: 'Se den i sort-hvid', detail: 'Nærbillede', lead: 'Bryllupsbilledet, barnet på trappen, bedsteforældrene i haven. Gulnet, ridset eller falmet – tag et foto af det, og se selv, hvad der kan gøres.', // Owner's correction, 2026-09-12: the "before" pictures are real old photographs with real damage,
// not originals made up to demonstrate the repair. The note said the opposite and undersold the
// proof. It still does not claim they are customers' photographs — that is a separate permission.
syntheticNote: 'Eksemplerne er ægte gamle fotografier med ægte skader – folder, ridser, gulstik og falmede farver. Hver restaurering her er kørt gennem præcis den samme proces som dit billede.', placeholderNote: 'Vi er nystartede og viser ikke kundebilleder, vi ikke har fået lov til at vise. Eksemplerne her er arkivfotos fra nordiske museer, Wikimedia Commons og Library of Congress – kørt gennem præcis den samme proces som dit. Dit eget resultat ser du om halvandet minut, før du bestiller noget.' },
    offer: {
      line: `Restaureret og indrammet, i den størrelse du vælger. Digital fil inkluderet. Fri fragt. Leveret ${levering}, efter du har godkendt billedet på mail.`,
      deadline: jul && days > 0 ? `Bestil senest ${dato} – så ligger det under træet.` : '',
      priceNote: 'inkl. moms, ramme og fragt',
      allIn: 'Det er hele prisen. Restaurering, ramme, glas, den digitale fil og levering er med. Ingen tillæg.',
      /** Comparative price claim supplied by the owner (markedsføringsloven: keep the documentation behind it). Empty string removes the line. */
      anchor: PRICE_ANCHOR,
      /** by the price, where the decision is made: the positive facts first, the refund rule last */
      guarantee: [
        'Se resultatet gratis, før du bestiller',
        'Du godkender det færdige billede på mail, før vi printer',
        'Originalen bliver hjemme hos dig',
        `Dansk virksomhed${by ? `, ${by}` : ''}${f.cvr ? ` · CVR ${f.cvr}` : ''} · fri fragt`,
        `Bestiller du ikke, slettes billedet efter ${CONFIG.retentionUnpaidDays} dage`,
        'Ligner det ikke, får du hele beløbet tilbage',
      ] as string[],
      kontakt: email ? `Spørgsmål? ${cap(skrivTil)} på ${email} – vi svarer inden 24 timer.` : '',
      kontaktHref: emailHref,
      price,
      priceFrom: `for ${formatLabel(format)}`,
      cta,
    },
    kontakt: {
      h1: 'Skriv til os.',
      lead: 'Spørgsmål om et gammelt billede, en bestilling eller en gave? Skriv her – vi svarer på mail inden 24 timer, som regel meget hurtigere. Har du en bestilling, så brug den e-mail, du bestilte med.',
      mailInstead: 'Du kan også bare skrive direkte til',
      form: {
        name: 'Dit navn', email: 'Din e-mail', message: 'Din besked', send: 'Send besked', sending: 'Sender…',
        done: 'Tak – vi har fået din besked.', doneP: 'Vi svarer på {email} inden 24 timer. Tjek også spam, hvis svaret lader vente på sig.',
        invalidEmail: 'Skriv en e-mail, vi kan svare på.', tooShort: 'Skriv lidt mere, så vi ved, hvad det drejer sig om.',
        rate: 'Der er sendt mange beskeder fra dit netværk lige nu. Vent lidt, og prøv igen.', failed: 'Beskeden blev ikke sendt. Prøv igen, eller skriv direkte til os på mail.',
      },
    },
    resume: {
      working: 'Vi arbejder stadig på dit billede. Det er klar om lidt – du kan blive her eller komme tilbage.',
      ready: 'Dit billede er klar.',
      cta: 'Se dit billede',
      again: 'Din upload blev afbrudt, før billedet nåede frem. Vælg det igen – det tager et øjeblik.',
      retry: 'Prøv igen',
    },
    /** The two small products. `enabled: false` means no surface may offer that one (lib/pricing.ts). */
    offers: {
      print: { ...offers.print, price: printPrice, label: printLabel },
      digital: { ...offers.digital, price: digitalPrice },
      any: offers.print.enabled || offers.digital.enabled,
    },
    campaign: {
      active: kampagne,
      until: kampagneDato,
      line: `Lanceringstilbud til og med ${kampagneDato}: ét ekstra eksemplar af billedet med i pakken – til den, der også husker det. Værdi ${formatDkk(EXTRA_PRINT_DKK[format])}`,
      short: `Lanceringstilbud: ekstra eksemplar med i pakken til og med ${kampagneDato}.`,
      bar: `Lanceringstilbud: 2 indrammede eksemplarer ${priceFrom} · til og med ${kampagneDato}`,
      tag: 'Lanceringstilbud',
      /** the offer as the object it is: two framed prints, one price — not a "gratis" without a price beside it */
      title: `2 indrammede eksemplarer ${priceFrom}`,
      untilLine: `Gælder til og med ${kampagneDato}`,
      body: 'Ét til dig. Ét til den, der også husker det.',
      terms: `Det første ekstra eksemplar af samme billede, størrelse og ramme er gratis (værdi ${formatDkk(EXTRA_PRINT_DKK[format])}). Tilføjes med ét tryk på bestillingssiden.`,
      extra: `Lanceringstilbud til og med ${kampagneDato}: det første ekstra eksemplar er med i pakken uden beregning.`,
    },
    hvem: { h2: 'Hvem står bag' },
    spoergsmaal: {
      h2: 'Ofte stillede spørgsmål',
      items: [
        {
          q: 'Skal jeg sende det originale billede til jer?',
          a: 'Nej. Du tager kun et foto af det med telefonen. Originalen bliver liggende i skuffen hos dig – vi rører den aldrig.',
        },
        {
          q: 'Koster det noget at se resultatet?',
          a: `Nej. Du tager et foto af billedet, ser det restaureret på skærmen, og først derefter beslutter du, om det skal hjem til dig i ramme – det koster ${priceFrom} inkl. fragt. Bestiller du ikke, slettes billedet af sig selv efter ${CONFIG.retentionUnpaidDays} dage.`,
        },
        {
          q: 'Hvad koster det, og hvad får jeg?',
          a: `${sizes.map((x) => `${formatLabel(x)} for ${formatDkk(PRICING[x].priceDkk)}`).join(', ')}. Beløbet dækker restaureringen, et menneskes gennemgang af ansigterne, print på mat fotopapir, ramme i sort eller eg med passepartout og glas, den restaurerede fil i høj opløsning og fri fragt i Danmark. Ingen tillæg.${
            offers.print.enabled || offers.digital.enabled
              ? ` Vil du have det billigere, kan du vælge ${[offers.print.enabled ? `et løst print i ${printLabel} uden ramme for ${printPrice}` : '', offers.digital.enabled ? `kun den digitale fil for ${digitalPrice}` : ''].filter(Boolean).join(' eller ')} – det vælger du, når du har set dit billede.`
              : ''
          }`,
        },
        ...(offers.print.enabled || offers.digital.enabled
          ? [{
              q: 'Kan jeg nøjes med noget billigere end rammen?',
              a: `Ja.${offers.print.enabled ? ` Et løst print i ${printLabel} på mat fotopapir, uden ramme og glas, koster ${printPrice} med fri fragt – den digitale fil er med. Det sendes fladt mellem pap, så du kan sætte det i din egen ramme.` : ''}${offers.digital.enabled ? ` Vil du kun have filen, koster den ${digitalPrice}; så bliver der ikke sendt noget, og du skal ikke oplyse en adresse.` : ''} Arbejdet er det samme: restaureringen, gennemgangen af ansigterne og din godkendelse, før noget bliver printet eller udleveret. Du vælger, når du har set dit billede.`,
            }]
          : []),
        {
          q: 'Hvornår betaler jeg?',
          a: `Ved bestilling, efter du har set previewet på skærmen. Vi printer først, når du har set det færdige billede på mail og sagt ja – og indtil da kan du fortryde og få hele beløbet tilbage.`,
        },
        {
          q: 'Hvad hvis ansigtet ikke ligner?',
          a: `Det er præcis det, ${navn} tjekker for, før det printes. Hvis restaureringen har ændret noget i et ansigt, rettes det tilbage. Du ser det færdige billede og godkender det, før vi printer – og ligner det stadig ikke, får du hele beløbet tilbage.`,
        },
        {
          q: 'Hvordan fungerer godkendelse før print?',
          a: 'Inden 48 timer efter din bestilling får du en mail med det færdige billede. Du kan godkende det eller bede om en ændring. Vi printer først, når du har sagt ja.',
        },
        {
          q: 'Kan I reparere revner, folder og falmede farver?',
          a: 'Ja. Revner, folder, gulstik, vandskjolder og falmede farver er det, restaureringen er bedst til. Prisen er den samme, uanset hvor beskadiget billedet er.',
        },
        {
          q: 'Kan I gøre et uskarpt billede skarpt?',
          a: 'Kun til en vis grad. Skarphed, der aldrig var i billedet, kan vi ikke opfinde. Men det koster ikke noget at prøve – tag et foto af det og se selv, før du beslutter noget.',
        },
        {
          q: 'Kan jeg fortryde?',
          a: `Du betaler ved bestilling – ${priceFrom}, alt efter størrelse. Indtil du har godkendt det færdige billede, kan du fortryde og få hele beløbet tilbage. Selve printet er lavet til dig og kan ikke returneres, men er det beskadiget ved levering, sender vi et nyt.`,
        },
        jul
          ? { q: 'Når det frem inden jul?', a: `Ja, hvis du bestiller senest ${dato} og godkender billedet, når mailen kommer (inden 48 timer). Efter ${dato} leverer vi inden ${X} hverdage.` }
          : { q: 'Hvornår får jeg det?', a: `Vi leverer inden ${X} hverdage, efter du har godkendt det færdige billede.` },
        {
          q: 'Hvad sker der med mit billede?',
          a: `Det bruges kun til din bestilling: gemt i EU, behandlet af vores AI-leverandør og – hvis du bestiller – sendt til printpartneren. Aldrig brugt til andet. Bestiller du ikke, slettes det automatisk efter ${CONFIG.retentionUnpaidDays} dage; bestiller du, ${CONFIG.retentionCompletedDays} dage efter leveringen. Eller straks, hvis du beder om det.`,
        },
        {
          q: 'Jeg har ikke billedet – det ligger hos min mor.',
          a: 'Tag et foto af det med telefonen, næste gang du er hjemme. Læg det fladt i dagslys, uden blitz. Det er nok i langt de fleste tilfælde. Du kan også få et link på mail, så du har siden ved hånden.',
          nophoto: true,
        },
        {
          q: 'Virker det også på farvebilleder fra 70’erne og 80’erne?',
          a: 'Ja. Falmede farver, gulstik, folder og ridser er det, restaureringen er bedst til. Tag et foto af det, og se selv – det koster ikke noget at kigge.',
        },
        {
          q: 'Hvilke størrelser kan jeg få?',
          a: `${sizes.map((x) => `${formatLabel(x)} for ${formatDkk(PRICING[x].priceDkk)}`).join(', ')} – alle i sort eller egetræsramme, med passepartout, glas og fri fragt. Du vælger størrelsen, når du har set dit billede restaureret. Er billedet liggende, printes det liggende i samme mål.`,
        },
        {
          q: 'Kan jeg få flere eksemplarer af det samme billede?',
          a: `Ja. Når du har set dit billede, kan du lægge et eller flere ekstra eksemplarer til – ${formatDkk(EXTRA_PRINT_DKK[format])} for et mere, uanset størrelse, med samme ramme, i samme pakke. Restaureringen er jo lavet, så det er kun selve billedet, du betaler for.${kampagneFaq} Er det et helt andet billede, koster det som en almindelig bestilling.`,
        },
        {
          q: 'Får jeg også den digitale fil?',
          a: `Ja. Når du har godkendt det færdige billede, kan du hente filen i høj opløsning fra godkendelsessiden – og linket kommer igen i mailen, når pakken er sendt. Filen er din. Vores kopi sletter vi ${CONFIG.retentionCompletedDays} dage efter levering.`,
        },
        {
          q: 'Kan jeg sende det direkte til modtageren?',
          a: 'Ja. Skriv modtagerens navn og adresse som leveringsadresse ved betaling. Godkendelsesmailen kommer stadig til dig, så du ser det færdige billede først.',
        },
        {
          q: 'Hvordan betaler jeg?',
          a: `${pay}. Du betaler ved bestilling og kan fortryde med fuld refusion, indtil du har godkendt det færdige billede.`,
        },
        {
          q: 'Hvad er forskellen på det her og en app?',
          a: `En app giver dig en fil på telefonen. Her får du et rigtigt print i ramme, som hænger på væggen ${levering} – og et menneske, der har tjekket ansigterne, før det blev printet.`,
        },
      ],
    },
    slut: { line: jul ? 'Halvandet minut, så har du set det. Julegaven er klaret i aften.' : `Halvandet minut, så har du set det. I ramme ${priceFrom} inkl. fragt, hvis du vil have det hjem.`, cta },
    sticky: PRIMARY_CTA_SHORT,
    upload: {
      how: 'Læg det gamle billede på bordet i dagslys, og tag et foto af det med telefonen. Eller vælg et foto, du allerede har taget. Originalen bliver hjemme hos dig – vi skal kun bruge fotoet. Om cirka halvandet minut viser vi resultatet.',
      camera: 'Tag et foto',
      library: 'Vælg fra kamerarulle',
      pick: 'Vælg billede',
      drop: '…eller træk det herind.',
      tips: 'Læg billedet fladt i dagslys, uden blitz. Fyld skærmen med det.',
      check: 'Er det skarpt og uden genskin? Ellers vælg et andet.',
      free: `Det koster ikke noget at se resultatet. I ramme ${priceFrom} inkl. fragt.${alternatives ? ` ${alternatives.replace(/\.$/, '')}.` : ''} Du vælger først, når du har set dit billede.`,
      note: `Billedet bruges kun til din bestilling. Det gemmes i EU og behandles af vores AI-leverandør, og det slettes efter ${CONFIG.retentionUnpaidDays} dage, hvis du ikke bestiller – eller med det samme, hvis du beder om det.`,
      privacy: 'Læs mere under Privatliv',
      cta: 'Vis mig resultatet',
      remove: 'Fjern',
      reupload: 'Vælg et andet',
      tooBig: 'Filen er over 25 MB. Tag et nyt foto, eller vælg et mindre.',
      tooBigNetwork: 'Forbindelsen her kan ikke sende så stor en fil. Prøv på et andet netværk, eller tag et nyt foto af billedet – det behøver ikke være i fuld størrelse.',
      wrongType: 'Vi kan læse JPEG, PNG, HEIC og WebP. Prøv et andet billede.',
      tooMany: 'Der er sendt mange billeder fra dit netværk lige nu. Vent en time, og prøv igen.',
      noPhoto: 'Jeg har ikke billedet lige nu',
      noPhotoH: 'Ligger billedet hos mor?',
      noPhotoP: 'Skriv din e-mail, så sender vi et link til siden – og ikke andet. Så har du den ved hånden, når du står med billedet.',
      noPhotoEmail: 'Din e-mail',
      noPhotoCta: 'Send mig linket',
      noPhotoDone: 'Linket er sendt. Tag et foto af billedet i dagslys, når du har det – resten tager halvandet minut.',
      back: 'Tilbage',
      repeat: 'Billede nummer to fra din forrige ordre. Prisen er den samme som første gang.',
    },
    processing: {
      stages: { uploading: 'Uploader', sending: 'Restaurerer', restoring: 'Restaurerer', preparing: 'Gør preview klar' } as Record<string, string>,
      // "Ansigterne rører vi ikke ved" was not true and contradicted the FAQ two screens down, which
      // explains that a changed face is corrected before print. What we can promise is the aim and the
      // check, not that the model leaves faces alone.
      sentences: {
        uploading: 'Billedet er på vej til os.',
        sending: 'Vi retter ridserne og henter kontrasten tilbage. Ansigterne skal stadig ligne dem.',
        restoring: 'Vi retter ridserne og henter kontrasten tilbage. Ansigterne skal stadig ligne dem.',
        preparing: 'Gør dit preview klar.',
      } as Record<string, string>,
      more: ['Vi fjerner ridser, pletter og folder – ikke rynker.', 'Bestiller du, kigger et menneske på ansigterne, før noget bliver printet.'],
      wait: 'Det tager omkring halvandet minut. Du kan roligt lukke siden – billedet ligger klar på forsiden, når du kommer tilbage.',
      slow: 'Det tager lidt længere i dag – billedet er stadig i gang. Du kan roligt lukke siden og komme tilbage om lidt.',
      steps: ['Modtager billedet', 'Restaurerer', 'Gør klar'],
      cancel: 'Afbryd (billedet slettes)',
      keepTitle: 'Skal vi sende dig linket?',
      keepP: 'Vi sender et link til billedet på mail – og ikke andet. Linket viser resultatet, når det er klar.',
      keepEmail: 'Din e-mail',
      keepCta: 'Send mig linket',
      keepDone: 'Linket er sendt. Du kan lukke siden; vi arbejder videre på billedet. Tjek også spam, hvis mailen ikke dukker op.',
      keepFailed: 'Linket blev ikke sendt. Din e-mail er stadig i feltet. Prøv igen, eller vent på resultatet her.',
      networkTitle: 'Forbindelsen røg.',
      networkError: 'Forbindelsen røg undervejs. Billedet er stadig valgt – prøv igen.',
      timeoutTitle: 'Det tog for lang tid.',
      timeout: 'Det tog længere end normalt i dag. Billedet er stadig valgt – prøv igen, det plejer at virke anden gang.',
      sendInstead: 'Send det til os i stedet',
      retry: 'Prøv igen',
    },
    preview: {
      h2: 'Her er dit billede.',
      howTo: 'Tryk på Før og Efter for at sammenligne.',
      nextStep: alternatives ? 'Vælg, hvordan du vil have billedet' : 'Se det i ramme og vælg størrelse',
      nextStepDigital: 'Videre til bestilling',
      watermarkNote: 'Skriften hen over billedet er et vandmærke. Det er kun på skærmen – printet og din fil er uden.',
      hang: 'Sådan ser det ud i ramme.',
      specTail: 'ramme med passepartout og glas · digital fil · fri fragt',
      specMore: 'Se alt, der er med',
      specLess: 'Vis mindre',

      /**
       * What the customer is looking at, said once and said straight. Three facts, none of them
       * flattering by omission: this is the real restoration but at screen size and with a watermark;
       * ordering makes the print-quality file, which is a second, better run rather than an upscale of
       * this one; and a person looks at that file before anything is printed. The old line ("AI'ens
       * første forslag") made the picture they had just fallen for sound like a draft.
       */
      next: `Sådan ser din restaurering ud. Bestiller du, laver vi den færdige fil i trykkvalitet, og ${navn} gennemgår den – især ansigterne. Du ser det færdige billede på mail og siger ja, før vi printer.`,
      nextDigital: `Sådan ser din restaurering ud. Bestiller du, laver vi den færdige fil i trykkvalitet uden vandmærke, og ${navn} gennemgår den – især ansigterne. Du ser det færdige billede på mail og siger ja, før filen bliver din.`,
      headNote: 'Fri fragt · du godkender før print',
      payWhenPre: 'Du betaler',
      payWhenPost: 'nu. Vi printer først, når du har set det færdige billede og sagt ja.',
      payWhenPostDigital: 'nu. Du får filen, når du har set det færdige billede og sagt ja.',
      /**
       * The whole path from this page to the thing in their hands, in the order it happens. One list,
       * one voice: every other surface (the order mail, /tak, the approval page) says the same four
       * things in the same order.
       */
      afterTitle: 'Sådan foregår det herfra',
      afterSteps: [
        ['Du betaler nu', `${pay} via Stripe. Beløbet trækkes ved bestillingen.`],
        ['Inden 24 timer', `${cap(navn)} laver den færdige fil i trykkvalitet og gennemgår den – især ansigterne.`],
        ['Inden 48 timer', 'Du får det færdige billede på mail. Godkend det, eller bed om en ændring – så mange gange det skal være.'],
        ['Efter dit ja', `Vi printer, rammer ind og sender – leveret ${levering}. Den digitale fil i høj opløsning kan du hente med det samme.`],
      ] as [string, string][],
      afterStepsDigital: [
        ['Du betaler nu', `${pay} via Stripe. Beløbet trækkes ved bestillingen.`],
        ['Inden 24 timer', `${cap(navn)} laver den færdige fil i trykkvalitet og gennemgår den – især ansigterne.`],
        ['Inden 48 timer', 'Du får det færdige billede på mail. Godkend det, eller bed om en ændring – så mange gange det skal være.'],
        ['Efter dit ja', 'Filen i høj opløsning uden vandmærke er klar til download med det samme. Intet bliver sendt med posten.'],
      ] as [string, string][],
      afterHelp: email ? `Går noget galt, så ${skrivTil} på ${email}. Vi svarer inden 24 timer, og indtil du har godkendt, kan du få hele beløbet tilbage.` : 'Indtil du har godkendt det færdige billede, kan du fortryde og få hele beløbet tilbage.',
      /** The product choice, shown only while at least one small product is on. */
      productTitle: 'Hvad skal du have?',
      // the price is its own line on the card, never the tail of a grey sentence: it is the second
      // thing the eye needs and the first thing a 60-year-old goes looking for
      productFramed: 'I ramme, hjem til dig',
      productFramedPrice: cap(priceFrom),
      productFramedHint: 'Printet i ramme med glas, klar til at hænge op. Fri fragt, og den digitale fil er med.',
      productPrint: 'Print uden ramme',
      productPrintPrice: printPrice,
      productPrintHint: `${printLabel} på mat fotopapir til din egen ramme. Fri fragt, og den digitale fil er med.`,
      productDigital: 'Kun billedet på skærmen',
      productDigitalPrice: digitalPrice,
      productDigitalHint: 'Filen i høj opløsning, til telefon, computer eller dit eget trykkeri. Der bliver ikke sendt noget.',
      productNote: 'Du kan skifte, så længe du ikke har betalt.',
      digitalSummary: 'Digital fil i høj opløsning',
      digitalNote: 'Filen er klar til download, når du har godkendt det færdige billede – ikke med det samme.',
      ctaDigital: 'Køb den digitale fil',
      printSummary: `Print ${printLabel}, uden ramme`,
      printTitle: 'Sådan kommer printet.',
      printNote: `${printLabel} på mat fotopapir, uden ramme og glas. Det sendes fladt mellem pap, så det ikke bukker – klar til din egen ramme eller opslagstavlen.`,
      printSpecTitle: `Det får du for ${printPrice}`,
      printRows: [
        ['Print', `${printLabel} på mat fotopapir, farveægte`],
        ['Ramme', 'Ingen – printet er løst, så du kan sætte det i din egen'],
        ['Fil', 'Den restaurerede fil i høj opløsning – din at hente, så snart du har godkendt'],
        ['Godkendelse', `${cap(navn)} gennemgår billedet og tjekker ansigterne. Du ser det færdige billede og siger ja, før vi printer`],
        ['Levering', `${cap(levering)}, efter du har sagt ja. Fri fragt i Danmark, sendt fladt mellem pap`],
        ['Garanti', 'Ligner det ikke, får du pengene tilbage'],
      ] as [string, string][],
      ctaPrint: 'Bestil mit print',
      afterStepsPrint: [
        ['Du betaler nu', `${pay} via Stripe. Beløbet trækkes ved bestillingen.`],
        ['Inden 24 timer', `${cap(navn)} laver den færdige fil i trykkvalitet og gennemgår den – især ansigterne.`],
        ['Inden 48 timer', 'Du får det færdige billede på mail. Godkend det, eller bed om en ændring – så mange gange det skal være.'],
        ['Efter dit ja', `Vi printer og sender det fladt mellem pap – leveret ${levering}. Den digitale fil i høj opløsning kan du hente med det samme.`],
      ] as [string, string][],
      sizeTitle: 'Størrelse',
      recommended: 'Anbefalet',
      copiesOne: 'eksemplar',
      copiesMany: 'eksemplarer',
      yourPhoto: 'Dit billede',
      sizeNote: 'Ramme, glas og fri fragt er med i alle størrelser.',
      frameTitle: 'Ramme',
      frameSort: 'Sort',
      frameSortHint: 'Klassisk. Lader billedet stå alene',
      frameEg: 'Eg',
      frameEgHint: 'Lyst træ. Varmere til gamle billeder',
      frameNote: 'Begge med passepartout og glas. Samme pris.',
      extraTitle: 'Én til dig. Én til familien.',
      extraLead: 'Samme billede, samme størrelse og ramme, i samme pakke – til den, der også husker det.',
      extraLabel: 'Ekstra eksemplar',
      extraAdd: 'Tilføj et eksemplar',
      extraAddFree: 'Tilføj et ekstra eksemplar – gratis',
      extraOne: 'eksemplar mere',
      extraMany: 'eksemplarer mere',
      extraRemove: 'Fjern',
      summaryTitle: 'Din bestilling',
      trust: [
        'Du godkender det færdige billede på mail, før vi printer',
        'Ligner det ikke, får du hele beløbet tilbage',
        `Billedet bruges kun til din bestilling – og slettes efter ${CONFIG.retentionUnpaidDays} dage, hvis du ikke bestiller`,
      ] as string[],
      trustDigital: [
        'Du godkender det færdige billede på mail, før filen bliver din',
        'Ligner det ikke, får du hele beløbet tilbage',
        `Billedet bruges kun til din bestilling – og slettes efter ${CONFIG.retentionUnpaidDays} dage, hvis du ikke bestiller`,
      ] as string[],
      shipping: 'Fragt og indpakning',
      shippingFree: 'Inkluderet',
      deliveryDigital: 'Levering',
      deliveryDigitalValue: 'Download efter din godkendelse',
      total: 'I alt',
      vat: 'inkl. moms',
      steps: ['Dit billede', alternatives ? 'Vælg produkt' : 'Størrelse og ramme', 'Betaling'] as string[],
      zoomIn: 'Se tæt på',
      zoomOut: 'Se hele billedet',
      colourCta: 'Se det i farver',
      colourBack: 'Se det i sort-hvid',
      colourBusy: 'Farvelægger…',
      colourWait: 'Vi farvelægger dit billede. Det tager omkring et halvt minut – bliv på siden.',
      summaryColour: 'i farver',
      summaryMono: 'sort-hvid',
      colourFailed: 'Farverne kunne ikke laves lige nu. Prøv igen om lidt – dit billede ligger her.',
      colourNote: 'Farverne er et kvalificeret gæt. Vi kan ikke vide, hvilken farve kjolen havde, så se det som et forslag. Du kan skifte tilbage til sort-hvid når som helst, og prisen er den samme.',
      ctaShort: 'Bestil mit billede',
      under: 'Pengene tilbage, hvis det ikke ligner.',
      payment: `${pay} via Stripe · Ingen oprettelse`,
      gift: 'Er det en gave? Skriv modtagerens adresse som leveringsadresse ved betaling – så sendes det direkte.',
      checkoutError: email
        ? `Vi kunne ikke åbne betalingen lige nu. Prøv igen om et øjeblik – eller ${skrivTil} på ${email}, så sender vi et betalingslink. Dit preview er gemt.`
        : 'Vi kunne ikke åbne betalingen lige nu. Prøv igen om et øjeblik. Dit preview er gemt.',
      saveTitle: 'Gem dit preview',
      saveP: 'Skal du vise det til din søster eller vente til i aften? Vi sender linket – og ikke andet.',
      saveEmail: 'Din e-mail',
      saveCta: 'Send mig linket',
      saveDone: `Linket er sendt. Det virker, indtil billedet slettes – ${CONFIG.retentionUnpaidDays} dage efter upload, hvis du ikke bestiller.`,
      saveInvalid: 'Skriv en e-mail, vi kan sende til.',
      saveFailed: 'Linket blev ikke sendt. Prøv igen om et øjeblik – eller tag et skærmbillede af siden, så har du den.',
      before: 'Før',
      after: 'Efter',
      cancelled: 'Betalingen blev ikke gennemført. Dit preview er gemt – du kan bestille, når du er klar.',
      landscape: '(liggende)',
      again: 'Vis et andet billede',
      erase: 'Slet mit billede nu',
      erased: 'Dit billede og dit preview er slettet.',
      eraseConfirm: 'Så sletter vi billedet og dit preview med det samme. Det kan ikke fortrydes.',
    },
    fallback: {
      p: `Vi vil gerne have et menneske til at kigge på det her, før du ser et resultat. Skriv din e-mail, så vender ${navn} tilbage inden 24 timer – det koster stadig ikke noget.`,
      email: 'Din e-mail',
      cta: 'Send til os',
      sent: `Tak. ${cap(navn)} kigger på det og skriver til dig inden 24 timer.`,
    },
    tak: {
      h1: `Tak. ${cap(navn)} kigger på dit billede inden 24 timer.`,
      p: 'Du får det færdige billede til godkendelse på mail inden 48 timer. Vi printer først, når du siger ja. Tjek også spam – og hører vi ikke fra dig, ringer eller skriver vi til det nummer, du gav ved betalingen.',
      pDigital: 'Du får det færdige billede til godkendelse på mail inden 48 timer. Når du siger ja, kan du hente filen i høj opløsning uden vandmærke. Tjek også spam – og hører vi ikke fra dig, ringer eller skriver vi til det nummer, du gav ved betalingen.',
      afterDigital: 'Din fil i høj opløsning er klar til download. Der bliver ikke sendt en pakke.',
      afterPrint: `Vi printer dit billede uden ramme og sender det fladt mellem pap med fri fragt. Leveret ${levering}. Din fil i høj opløsning er også klar til download.`,
      timeline: [
        ['Inden 24 timer', `${cap(navn)} gennemgår billedet og tjekker ansigterne.`],
        ['Inden 48 timer', 'Du får en mail med det færdige billede. Godkend, eller bed om en ændring.'],
        ['Efter dit ja', `Print i den valgte størrelse, ramme og fri fragt – og din fil i høj opløsning til download. Leveret ${levering}.`],
      ] as [string, string][],
      more: 'Vis et billede mere',
      againH2: 'Har I flere billeder?',
      againP: 'De ligger sjældent alene i skuffen. Har du et mere, kan du sende det ind herfra – samme arbejde, samme godkendelse, fri fragt.',
      againPDigital: 'Har du et billede mere, kan du sende det ind herfra – samme restaurering og gennemgang, og du godkender, før du henter filen.',
      againCta: 'Se billede nummer to',
      unverifiedH1: 'Vi kunne ikke bekræfte betalingen med det samme.',
      unverifiedP: 'Er pengene trukket, er din bestilling hos os, og du får en mail inden for få minutter. Ellers kan du gå tilbage til dit billede og prøve igen.',
      back: 'Tilbage til dit billede',
      home: 'Til forsiden',
      doubt: email ? `Er du i tvivl, så ${skrivTil} på ${email}. Vi svarer inden 24 timer.` : '',
    },
    consent: 'Jeg accepterer, at fortrydelsesretten bortfalder, når den digitale fil leveres, og at printet fremstilles specielt til mig.',
    cookie: {
      text: 'Ud over de tekniske cookies, siden ikke kan undvære, bruger vi én cookie fra Meta til at måle, om annoncerne virker – kun hvis du siger ok.',
      accept: 'Ok',
      decline: 'Nej tak',
    },
    notFound: {
      h1: 'Den side findes ikke her.',
      p: 'Et preview-link virker kun på den telefon, billedet blev uploadet fra – medmindre du har fået linket tilsendt fra "Gem dit preview". Det link kan åbnes overalt.',
      cta: 'Til forsiden',
    },
  };
}

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export type Copy = ReturnType<typeof copy>;
