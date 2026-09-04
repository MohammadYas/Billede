// Locked Danish copy (spec §4–§6). Placeholders render from config and founder.md.
// Conversion attack #1 (QA.md) changed: hero, trust row, product label, FAQ, sheet, wait, preview bar, /tak.
import { CONFIG, currentSeason, daysToCutoff, deliveryPromise, formatCutoffDate, type Season } from '@/lib/config';
import { formatDkk, PRICING, customerFormat, customerFormats, formatLabel, formatLabelFor, EXTRA_PRINT_DKK, REPEAT_DISCOUNT_DKK, type Format } from '@/lib/pricing';
import { fornavn, getFounder } from '@/lib/founder';

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
    ['Fil', 'Den restaurerede fil i høj opløsning, din for altid'],
    ['Manuelt tjek', `${cap(navn)} finjusterer hvert billede og tjekker ansigterne`],
    ['Godkendelse', 'Du ser det færdige billede og siger ja, før vi printer'],
    ['Levering', `${cap(levering)}, efter du har sagt ja. Fri fragt i Danmark, pakket så glasset holder`],
    ['Flere eksemplarer', `Et mere af samme billede for ${formatDkk(EXTRA_PRINT_DKK[fmt])}, uanset størrelse, i samme pakke`],
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
      extraPrint: formatDkk(EXTRA_PRINT_DKK[fmt]),
      specTitle: `Det får du for ${pris}`,
      cta: `Bestil mit billede – ${pris}`,
      mockupCaption: `Sådan hænger det. ${lbl}, med passepartout og glas, klar til væggen.`,
      p: `Du får billedet printet i ${lbl} på mat fotopapir, i ramme med passepartout og glas, klar til at hænge op – og den restaurerede fil i høj opløsning. Fri fragt, og du godkender det færdige billede, før vi printer.`,
      rows: rowsFor(fmt, lbl),
    };
  };
  const priceFrom = sizes.length > 1 ? `fra ${price}` : price;

  return {
    season,
    price,
    format,
    formatLabel: formatLabel(format),
    priceFrom,
    email,
    emailHref,
    /** every size, and every price-bearing line for it, portrait and landscape */
    variants: { portrait: sizes.map((fmt) => variant(fmt, false)), landscape: sizes.map((fmt) => variant(fmt, true)) },
    sizes: sizes.map((fmt) => [formatLabel(fmt), formatDkk(PRICING[fmt].priceDkk)] as [string, string]),
    hero: {
      eyebrow: jul ? (days > 0 ? `Julegaven 2026 · bestil senest ${dato}, så er den under træet` : days === 0 ? `Sidste dag for levering inden jul` : 'Julen er nået – vi leverer inden 5 hverdage') : 'Gaven, de ikke selv kan købe',
      h1: 'Mors gamle billede. Skarpt igen, i ramme, hjemme hos dig.',
      sub: 'Tag et foto af billedet med telefonen. Halvandet minut efter ser du det restaureret.',
      cta: 'Se dit billede nu',
      small: `Det koster ikke noget at se resultatet. Skal det hjem til dig: ${priceFrom} for print, ramme og fri fragt.`,
      countdown: jul && days > 0 ? `${days} ${days === 1 ? 'dag' : 'dage'} til sidste bestilling for levering inden jul` : '',
    },
    gave: {
      h2: jul ? 'Den julegave, de ikke selv kan købe' : 'Den gave, de ikke selv kan købe',
      lead: 'Til den runde fødselsdag, jubilæet, guldbrylluppet eller julen: et billede, de troede var gået tabt – skarpt, i ramme, klar til at hænge op. Det er den slags, der bliver stille ved bordet.',
      points: [
        ['Tag billedet i smug', 'Et foto af det gamle billede med telefonen er nok. Læg det tilbage i skuffen, inden nogen ser det.'],
        ['Skriv en hilsen', 'Ved betaling kan du skrive et par linjer. Vi lægger et kort ved med din hilsen.'],
        ['Send det direkte – eller hjem til dig', 'Skriv modtagerens adresse ved betaling, hvis det skal sendes direkte. Ellers kommer det hjem til dig, pakket så glasset holder.'],
        [jul ? 'Under træet til tiden' : 'Til tiden', jul ? `Bestil senest ${dato}, så er det leveret inden jul. Du godkender billedet på mail, før vi printer.` : `Leveret ${levering}, efter du har godkendt billedet på mail.`],
      ] as [string, string][],
    },
    tryghed: [
      `Dansk virksomhed${by ? `, ${by}` : ''}${f.cvr ? ` · CVR ${f.cvr}` : ''}`,
      'Du godkender, før vi printer – ellers pengene tilbage',
      'Billedet slettes efter 30 dage – eller straks, hvis du beder om det',
    ],
    saadan: {
      h2: 'Sådan fungerer det',
      steps: [
        'Tag et foto af billedet med telefonen. Dagslys, ingen blitz – det er nok.',
        'Se resultatet på skærmen. Det tager omkring halvandet minut.',
        `Bestil. ${cap(navn)} finjusterer, du godkender på mail, vi printer og sender. Leveret ${levering}.`,
      ],
      note: 'Papir falmer, og folder bliver ikke glattere med årene. Et foto af billedet, som det er nu, er nok til at redde det.',
    },
    taetPaa: { h2: 'Tæt på', p: 'Det er i detaljerne, man kan se, om det er gjort ordentligt. Øjne, hænder, skrift og stof – ikke udglattet, bare rene.' },
    produkt: {
      h2: `Det får du for ${price}`,
      rows: rowsFor(format, formatLabel(format)),
      sizesTitle: 'Størrelser',
      sizesNote: 'Samme billede og samme håndarbejde i alle tre. Du vælger størrelsen, når du har set resultatet.',
      note: `Restaurering, print, ramme, kort med din hilsen, indpakning og fragt – ét beløb per billede.`,
    },
    eksempler: { h2: 'Eksempler', placeholderNote: 'Vi er nystartede og viser ikke kundebilleder, vi ikke har fået lov til at vise. Eksemplerne her er arkivfotos fra nordiske museer, Wikimedia Commons og Library of Congress – kørt gennem præcis den samme proces som dit. Dit eget resultat ser du om halvandet minut, før du bestiller noget.' },
    offer: {
      line: `Restaureret og indrammet, i den størrelse du vælger. Digital fil inkluderet. Fri fragt. Leveret ${levering}, efter du har godkendt billedet på mail.`,
      deadline: jul && days > 0 ? `Bestil senest ${dato} – så ligger det under træet.` : '',
      priceNote: 'inkl. moms, ramme og fragt · pengene tilbage, hvis det ikke ligner',
      guarantee: [
        'Du ser resultatet, før du bestiller',
        'Du godkender det færdige billede på mail, før vi printer',
        'Ligner det ikke, får du hele beløbet tilbage',
      ] as string[],
      kontakt: email ? `Spørgsmål? ${cap(skrivTil)} på ${email} – vi svarer inden 24 timer.` : '',
      kontaktHref: emailHref,
      price,
      priceFrom: sizes.length > 1 ? `for ${formatLabel(format)} · større: ${sizes.filter((x) => x !== format).map((x) => `${formatLabel(x)} ${formatDkk(PRICING[x].priceDkk)}`).join(' · ')}` : '',
      cta: 'Se dit billede nu',
      under: 'Du bestiller først, når du har set resultatet.',
    },
    hvem: { h2: 'Hvem står bag' },
    spoergsmaal: {
      h2: 'Spørgsmål',
      items: [
        {
          q: 'Ser det kunstigt ud?',
          a: `Det er præcis det, ${navn} tjekker for, før det printes. Hvis AI'en har ændret noget i et ansigt, rettes det tilbage. Og du ser det færdige billede og godkender det, før vi printer.`,
        },
        {
          q: 'Virker det også på farvebilleder fra 70’erne og 80’erne?',
          a: 'Ja. Falmede farver, gulstik, folder og ridser er det, vi ser mest af. Tag et foto af det, og se selv – det koster ikke noget at kigge.',
        },
        {
          q: 'Jeg har ikke billedet – det ligger hos min mor.',
          a: 'Tag et foto af det med telefonen, næste gang du er hjemme. Læg det fladt i dagslys, uden blitz. Det er nok i langt de fleste tilfælde. Du kan også få et link på mail, så du har siden ved hånden.',
          nophoto: true,
        },
        {
          q: 'Skal jeg sende det originale billede til jer?',
          a: 'Nej. Du tager kun et foto af det med telefonen. Originalen bliver liggende i skuffen hos dig – vi rører den aldrig.',
        },
        {
          q: 'Mit billede er meget ødelagt – kan I stadig gøre noget?',
          a: 'Prisen er den samme, uanset hvor beskadiget billedet er. Revner, folder, gulstik, vandskjolder og manglende hjørner er det, vi ser mest af. Tag et foto af det og se selv, hvad der kommer ud af det – det koster ikke noget at kigge.',
        },
        {
          q: 'Hvad sker der med mit billede?',
          a: 'Det bruges kun til din bestilling, deles aldrig og slettes automatisk efter 30 dage – eller straks, hvis du beder om det.',
        },
        {
          q: 'Hvad er forskellen på det her og en app?',
          a: `En app giver dig en fil på telefonen. Her får du et rigtigt print i ramme, som hænger på væggen ${levering} – og et menneske, der har tjekket ansigterne, før det blev printet.`,
        },
        {
          q: 'Hvilke størrelser kan jeg få?',
          a: `${sizes.map((x) => `${formatLabel(x)} for ${formatDkk(PRICING[x].priceDkk)}`).join(', ')} – alle med sort ramme, passepartout, glas og fri fragt. Du vælger størrelsen, når du har set dit billede restaureret. Er billedet liggende, printes det liggende i samme mål.`,
        },
        {
          q: 'Kan jeg fortryde?',
          a: `Du betaler ved bestilling – ${priceFrom}, alt efter størrelse. Indtil du har godkendt det færdige billede, kan du fortryde og få hele beløbet tilbage. Selve printet er lavet til dig og kan ikke returneres, men er det beskadiget ved levering, sender vi et nyt.`,
        },
        jul
          ? { q: 'Når det frem inden jul?', a: `Ja, hvis du bestiller senest ${dato} og godkender billedet, når mailen kommer (inden 48 timer). Efter ${dato} leverer vi inden ${X} hverdage.` }
          : { q: 'Hvornår får jeg det?', a: `Vi leverer inden ${X} hverdage, efter du har godkendt det færdige billede.` },
        {
          q: 'Kan jeg få flere eksemplarer af det samme billede?',
          a: `Ja. Når du har set dit billede, kan du lægge et eller flere ekstra eksemplarer til – ${formatDkk(EXTRA_PRINT_DKK[format])} for et mere, uanset størrelse, med samme ramme, i samme pakke. Restaureringen er jo lavet, så det er kun selve billedet, du betaler for. Er det et helt andet billede, koster det som en almindelig bestilling – minus ${formatDkk(REPEAT_DISCOUNT_DKK)}, hvis du bestiller det fra kvitteringen.`,
        },
        {
          q: 'Kan jeg sende det direkte til modtageren?',
          a: 'Ja. Skriv modtagerens navn og adresse som leveringsadresse ved betaling. Godkendelsesmailen kommer stadig til dig, så du ser det færdige billede først.',
        },
        {
          q: 'Kan jeg lægge en hilsen ved?',
          a: 'Ja. Ved betaling er der et felt til en hilsen på op til 200 tegn. Vi skriver den på et kort og lægger det i pakken.',
        },
        {
          q: 'Hvordan betaler jeg?',
          a: `${pay}. Du betaler ved bestilling og kan fortryde med fuld refusion, indtil du har godkendt det færdige billede.`,
        },
      ],
    },
    slut: { line: jul ? 'Halvandet minut, så har du set det. Julegaven er klaret i aften.' : 'Halvandet minut, så har du set det. Du bestiller først bagefter.', cta: 'Se dit billede nu' },
    sticky: `Se dit billede nu · ${priceFrom}`,
    upload: {
      camera: 'Tag et foto',
      library: 'Vælg fra kamerarulle',
      pick: 'Vælg billede',
      drop: '…eller træk det herind.',
      tips: 'Læg billedet fladt i dagslys, uden blitz. Fyld skærmen med det.',
      check: 'Er det skarpt og uden genskin? Ellers vælg et andet.',
      free: 'Det koster ikke noget at se. Du betaler først, hvis du bestiller – og først efter du har set resultatet.',
      note: 'Billedet bruges kun til din bestilling. Det ligger i EU, sendes kun til dem, der laver restaureringen og printet, og slettes efter 30 dage – eller med det samme, hvis du beder om det.',
      privacy: 'Læs mere under Privatliv',
      cta: 'Vis mig resultatet',
      remove: 'Fjern',
      reupload: 'Vælg et andet',
      tooBig: 'Filen er over 25 MB. Tag et nyt foto, eller vælg et mindre.',
      tooBigNetwork: 'Forbindelsen her kan ikke sende så stor en fil. Prøv på et andet netværk, eller tag et nyt foto af billedet – det behøver ikke være i fuld størrelse.',
      wrongType: 'Vi kan læse JPEG, PNG, HEIC og WebP. Prøv et andet billede.',
      noPhoto: 'Jeg har ikke billedet lige nu',
      noPhotoH: 'Ligger billedet hos mor?',
      noPhotoP: 'Skriv din e-mail, så sender vi et link til siden – og ikke andet. Så har du den ved hånden, når du står med billedet.',
      noPhotoEmail: 'Din e-mail',
      noPhotoCta: 'Send mig linket',
      noPhotoDone: 'Linket er sendt. Tag et foto af billedet i dagslys, når du har det – resten tager halvandet minut.',
      back: 'Tilbage',
      repeat: `Billede nummer to: ${formatDkk(REPEAT_DISCOUNT_DKK)} er trukket fra, når du bestiller.`,
    },
    processing: {
      stages: { uploading: 'Uploader', sending: 'Restaurerer', restoring: 'Restaurerer', preparing: 'Gør preview klar' } as Record<string, string>,
      sentences: {
        uploading: 'Billedet er på vej til os.',
        sending: 'Vi retter ridserne og henter kontrasten tilbage. Ansigterne rører vi ikke ved.',
        restoring: 'Vi retter ridserne og henter kontrasten tilbage. Ansigterne rører vi ikke ved.',
        preparing: 'Gør dit preview klar.',
      } as Record<string, string>,
      more: ['Vi fjerner ridser, pletter og folder – ikke rynker.', 'Bagefter kigger et menneske på ansigterne, før noget bliver printet.'],
      wait: 'Det tager omkring halvandet minut. Bliv på siden – vi siger til, når det er klar.',
      slow: 'Det tager lidt længere i dag – billedet er stadig i gang. Du kan roligt blive stående.',
      cancel: 'Afbryd (billedet slettes)',
      keepTitle: 'Skal vi sende dig linket?',
      keepP: 'Så behøver du ikke vente her. Vi sender dit preview på mail, så snart det er klar – og ikke andet.',
      keepEmail: 'Din e-mail',
      keepCta: 'Send mig linket',
      keepDone: 'Sendt. Du kan roligt lukke siden – linket ligger i din indbakke om lidt.',
      networkTitle: 'Forbindelsen røg.',
      networkError: 'Forbindelsen røg undervejs. Billedet er stadig valgt – prøv igen.',
      timeoutTitle: 'Det tog for lang tid.',
      timeout: 'Det tog længere end normalt i dag. Billedet er stadig valgt – prøv igen, det plejer at virke anden gang.',
      sendInstead: 'Send det til os i stedet',
      retry: 'Prøv igen',
    },
    preview: {
      h2: 'Her er dit billede.',
      next: `Det her er den hurtige første restaurering. Derfra går det i hånden: ${navn} finpudser billedet og går især ansigterne efter. Du får det færdige billede på mail og siger ja, før vi printer noget – og så kommer det hjem til dig, printet og indrammet.`,
      p: `Du får billedet printet på mat fotopapir, i ramme med passepartout og glas, klar til at hænge op – og den restaurerede fil i høj opløsning. Fri fragt, og du godkender det færdige billede, før vi printer.`,
      specTitle: `Det får du for ${price}`,
      headNote: 'Fri fragt · pengene tilbage',
      payWhenPre: 'Du betaler',
      payWhenPost: 'nu. Indtil du har godkendt det færdige billede, kan du fortryde og få hele beløbet tilbage.',
      readyTitle: 'Din bestilling er klar',
      readyNote: `Du behøver ikke vælge noget: ${formatLabel(format)} i sort ramme er sat op for dig. Vil du have den større, en anden ramme eller et eksemplar mere, så ret det her.`,
      sizeTitle: 'Størrelse',
      sizeNote: 'Ramme, glas, kort med din hilsen og fri fragt er med i alle størrelser.',
      frameTitle: 'Ramme',
      frameSort: 'Sort',
      frameSortHint: 'Klassisk. Lader billedet stå alene',
      frameEg: 'Eg',
      frameEgHint: 'Lyst træ. Varmere til gamle billeder',
      frameNote: 'Begge med passepartout og glas. Samme pris.',
      extraTitle: 'Skal en anden i familien også have et?',
      extraLead: 'Restaureringen er lavet én gang. Et eksemplar mere er kun selve billedet, rammen og forsendelsen – og det kommer i samme pakke.',
      extraAdd: 'Tilføj et eksemplar',
      extraOne: 'eksemplar mere',
      extraMany: 'eksemplarer mere',
      extraRemove: 'Fjern',
      summaryTitle: 'Din bestilling',
      shipping: 'Fragt og indpakning',
      shippingFree: 'Inkluderet',
      total: 'I alt',
      vat: 'inkl. moms',
      repeatNote: `Billede nummer to: ${formatDkk(REPEAT_DISCOUNT_DKK)} er trukket fra, fordi du bestilte fra din forrige ordre.`,
      steps: ['Dit billede', 'Størrelse og ramme', 'Betaling'] as string[],
      zoomIn: 'Se tæt på',
      zoomOut: 'Se hele billedet',
      zoomHint: 'Restaurering afgøres i ansigterne — se dem tæt på.',
      colourToggle: 'Vis i farver',
      colourHint: 'De fleste vælger sort-hvid: det er sådan, billedet blev taget. Farver gør det til noget nyt – prøv begge dele.',
      monoToggle: 'Vis i sort-hvid',
      colourLoading: 'Farveversion på vej – ca. ½ minut',
      cta: `Bestil mit billede – ${price}`,
      ctaShort: 'Bestil mit billede',
      under: 'Pengene tilbage, hvis det ikke ligner.',
      payment: `${pay} · Ingen oprettelse`,
      gift: 'Er det en gave? Ved betaling kan du skrive en hilsen, som vi lægger ved på et kort.',
      checkoutError: email
        ? `Vi kunne ikke åbne betalingen lige nu. Prøv igen om et øjeblik – eller ${skrivTil} på ${email}, så sender vi et betalingslink. Dit preview er gemt.`
        : 'Vi kunne ikke åbne betalingen lige nu. Prøv igen om et øjeblik. Dit preview er gemt.',
      saveTitle: 'Gem dit preview',
      saveP: 'Skal du vise det til din søster eller vente til i aften? Vi sender linket – og ikke andet.',
      saveEmail: 'Din e-mail',
      saveCta: 'Send mig linket',
      saveDone: 'Linket er sendt. Det virker, indtil billedet slettes – 30 dage efter upload.',
      saveInvalid: 'Skriv en e-mail, vi kan sende til.',
      saveFailed: 'Linket blev ikke sendt. Prøv igen om et øjeblik – eller tag et skærmbillede af siden, så har du den.',
      before: 'Før',
      after: 'Efter',
      cancelled: 'Betalingen blev ikke gennemført. Dit preview er gemt – du kan bestille, når du er klar.',
      mockupCaption: `Sådan hænger det. ${formatLabel(format)}, sort ramme med passepartout, klar til væggen.`,
      landscape: '(liggende)',
      again: 'Vis et andet billede',
      erase: 'Slet mit billede nu',
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
      p: 'Du får det færdige billede til godkendelse på mail inden 48 timer. Vi printer først, når du siger ja.',
      timeline: [
        ['Inden 24 timer', `${cap(navn)} finjusterer billedet i hånden.`],
        ['Inden 48 timer', 'Du får en mail med det færdige billede. Godkend, eller bed om en ændring.'],
        ['Efter dit ja', `Print i den valgte størrelse, ramme og fri fragt. Leveret ${levering}.`],
      ] as [string, string][],
      more: 'Vis et billede mere',
      againH2: 'Har I flere billeder?',
      againP: `De ligger sjældent alene i skuffen. Bestiller du et mere fra linket her, trækker vi ${formatDkk(REPEAT_DISCOUNT_DKK)} fra – samme arbejde, samme godkendelse, fri fragt.`,
      againCta: 'Se billede nummer to',
      unverifiedH1: 'Vi kunne ikke bekræfte betalingen med det samme.',
      unverifiedP: 'Er pengene trukket, er din bestilling hos os, og du får en mail inden for få minutter. Ellers kan du gå tilbage til dit billede og prøve igen.',
      back: 'Tilbage til dit billede',
      home: 'Til forsiden',
      doubt: email ? `Er du i tvivl, så ${skrivTil} på ${email}. Vi svarer inden 24 timer.` : '',
    },
    consent: 'Jeg accepterer, at fortrydelsesretten bortfalder, når den digitale fil leveres, og at printet fremstilles specielt til mig.',
    cookie: {
      text: 'Vi bruger en enkelt cookie fra Meta til at måle, om annoncerne virker. Ingen andre.',
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
