// Locked Danish copy (spec §4–§6). Placeholders render from config and founder.md.
// Conversion attack #1 (QA.md) changed: hero, trust row, product label, FAQ, sheet, wait, preview bar, /tak.
import { CONFIG, currentSeason, deliveryPromise, formatCutoffDate, type Season } from '@/lib/config';
import { formatDkk, PRICING, customerFormat, formatLabel } from '@/lib/pricing';
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
  const phone = f.phone ? f.phone : '';
  const phoneHref = f.phone ? `tel:${f.phone.replace(/\s/g, '')}` : '';
  const ringTil = personal ? `ring til ${cap(navn)}` : 'ring til os';

  return {
    season,
    price,
    format,
    formatLabel: formatLabel(format),
    phone,
    phoneHref,
    hero: {
      h1: jul
        ? 'Mors gamle billede. Skarpt igen, i ramme, under juletræet.'
        : 'Mors gamle billede. Skarpt igen, i ramme, hjemme hos dig.',
      sub: 'Tag et foto af billedet med telefonen – se det restaureret på under et minut.',
      cta: 'Se dit billede nu',
      small: `${price} alt inkl. – print i ${formatLabel(format)}, ramme og fragt. Det koster ikke noget at se.`,
    },
    tryghed: [
      `Dansk virksomhed${by ? `, ${by}` : ''}${f.cvr ? ` · CVR ${f.cvr}` : ''}`,
      'Du godkender, før vi printer – ellers pengene tilbage',
      'Billedet slettes efter 30 dage',
    ],
    saadan: {
      h2: 'Sådan fungerer det',
      steps: [
        'Tag et foto af billedet med telefonen. Dagslys, ingen blitz – det er nok.',
        'Se resultatet på skærmen. Det tager under et minut og koster ikke noget.',
        `Bestil. ${cap(navn)} finjusterer, du godkender på mail, vi printer og sender. Leveret ${levering}.`,
      ],
    },
    taetPaa: { h2: 'Tæt på', p: 'Det er i detaljerne, man kan se, om det er gjort ordentligt. Øjne, hænder, skrift og stof – ikke udglattet, bare rene.' },
    produkt: {
      h2: `Det får du for ${price}`,
      rows: [
        ['Print', `${formatLabel(format)} på mat fotopapir, farveægte`],
        ['Ramme', 'Sort ramme med passepartout, klar til at hænge op'],
        ['Fil', 'Den restaurerede fil i høj opløsning, din for altid'],
        ['Manuelt tjek', `${cap(navn)} finjusterer hvert billede og tjekker ansigterne`],
        ['Godkendelse', 'Du ser det færdige billede og siger ja, før vi printer'],
        ['Levering', `${cap(levering)}, efter du har sagt ja. Fri fragt i Danmark, pakket så glasset holder`],
        ['Garanti', 'Ligner det ikke, får du pengene tilbage'],
      ] as [string, string][],
      note: `Restaurering, print i ${formatLabel(format)}, ramme, indpakning og fragt – ét beløb, ingen tillæg.`,
    },
    eksempler: { h2: 'Eksempler', placeholderNote: 'Eksemplerne er arkivfotos fra nordiske museer, Wikimedia Commons og Library of Congress, restaureret med præcis samme proces som dit billede.' },
    offer: {
      line: `Restaureret + indrammet ${formatLabel(format)}. Digital fil inkluderet. Fri fragt. Leveret ${levering}.`,
      priceNote: 'inkl. moms, ramme og fragt · pengene tilbage, hvis det ikke ligner',
      phone: phone ? `Spørgsmål? ${cap(ringTil)} på ${phone}.` : '',
      phoneHref,
      price,
      cta: 'Se dit billede nu',
      under: 'Det koster ikke noget at se. Du bestiller først, når du har set resultatet.',
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
          q: 'Hvad sker der med mit billede?',
          a: 'Det bruges kun til din bestilling, deles aldrig og slettes automatisk efter 30 dage – eller straks, hvis du beder om det.',
        },
        {
          q: 'Hvad er forskellen på det her og en app?',
          a: `En app giver dig en fil på telefonen. Her får du et print i ${formatLabel(format)} i ramme, som hænger på væggen ${levering} – og et menneske, der har tjekket ansigterne, før det blev printet.`,
        },
        {
          q: 'Kan jeg fortryde?',
          a: `Du betaler ${price} ved bestilling. Indtil du har godkendt det færdige billede, kan du fortryde og få hele beløbet tilbage. Selve printet er lavet til dig og kan ikke returneres, men er det beskadiget ved levering, sender vi et nyt.`,
        },
        jul
          ? { q: 'Når det frem inden jul?', a: `Bestillinger inden ${dato} leveres inden jul. Efter ${dato} leverer vi inden ${X} hverdage.` }
          : { q: 'Hvornår får jeg det?', a: `Vi leverer inden ${X} hverdage, efter du har godkendt det færdige billede.` },
      ],
    },
    slut: { line: 'Det tager to minutter at se. Bestil først, når du har set det.', cta: 'Se dit billede nu' },
    sticky: `Se dit billede nu · ${price}`,
    upload: {
      camera: 'Tag et foto',
      library: 'Vælg fra kamerarulle',
      pick: 'Vælg billede',
      drop: '…eller træk det herind.',
      tips: 'Læg billedet fladt i dagslys, uden blitz. Fyld skærmen med det.',
      check: 'Er det skarpt og uden genskin? Ellers vælg et andet.',
      free: 'Det koster ikke noget at se. Du betaler først, hvis du bestiller – og først efter du har set resultatet.',
      note: 'Billedet bruges kun til dit preview, deles aldrig og slettes efter 30 dage.',
      privacy: 'Læs mere under Privatliv',
      cta: 'Vis mig resultatet',
      remove: 'Fjern',
      reupload: 'Vælg et andet',
      tooBig: 'Filen er over 25 MB. Tag et nyt foto, eller vælg et mindre.',
      wrongType: 'Vi kan læse JPEG, PNG, HEIC og WebP. Prøv et andet billede.',
      noPhoto: 'Jeg har ikke billedet lige nu',
      noPhotoH: 'Ligger billedet hos mor?',
      noPhotoP: 'Skriv din e-mail, så sender vi et link til siden – og ikke andet. Så har du den ved hånden, når du står med billedet.',
      noPhotoEmail: 'Din e-mail',
      noPhotoCta: 'Send mig linket',
      noPhotoDone: 'Linket er sendt. Tag et foto af billedet i dagslys, når du har det – resten tager under et minut.',
      back: 'Tilbage',
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
      wait: 'Det tager normalt 30–45 sekunder.',
      slow: 'Det tager lidt længere i dag – billedet er stadig i gang.',
      cancel: 'Afbryd (billedet slettes)',
      networkTitle: 'Forbindelsen røg.',
      networkError: 'Forbindelsen røg undervejs. Billedet er stadig valgt – prøv igen.',
      timeoutTitle: 'Det tog for lang tid.',
      timeout: 'Det tog længere end normalt i dag. Billedet er stadig valgt – prøv igen, det plejer at virke anden gang.',
      sendInstead: 'Send det til os i stedet',
      retry: 'Prøv igen',
    },
    preview: {
      h2: 'Sådan kan dit billede se ud.',
      next: `Det her er det automatiske første udkast. Bestiller du, retter ${navn} det til i hånden, og du godkender det på mail, før vi printer.`,
      p: `Vi finjusterer billedet manuelt, printer det i ${formatLabel(format)}, indrammer det og sender det hjem til dig. Du godkender det færdige billede, før vi printer.`,
      specTitle: `Det får du for ${price}`,
      colourToggle: 'Vis i farver',
      monoToggle: 'Vis i sort-hvid',
      colourLoading: 'Farveversion på vej – ca. ½ minut',
      cta: `Bestil mit billede – ${price}`,
      under: 'Pengene tilbage, hvis det ikke ligner.',
      payment: 'MobilePay, Apple Pay eller kort · Ingen oprettelse',
      payWhen: `Du betaler ${price} nu. Indtil du har godkendt det færdige billede, kan du fortryde og få hele beløbet tilbage.`,
      checkoutError: phone
        ? `Vi kunne ikke åbne betalingen lige nu. Prøv igen om et øjeblik – eller ${ringTil} på ${phone}, så klarer vi bestillingen over telefonen. Dit preview er gemt.`
        : 'Vi kunne ikke åbne betalingen lige nu. Prøv igen om et øjeblik. Dit preview er gemt.',
      saveTitle: 'Gem dit preview',
      saveP: 'Skal du vise det til din søster eller vente til i aften? Vi sender linket – og ikke andet.',
      saveEmail: 'Din e-mail',
      saveCta: 'Send mig linket',
      saveDone: 'Linket er sendt. Det virker i 30 dage.',
      saveInvalid: 'Skriv en e-mail, vi kan sende til.',
      saveFailed: 'Linket blev ikke sendt. Prøv igen om et øjeblik – eller tag et skærmbillede af siden, så har du den.',
      before: 'Før',
      after: 'Efter',
      cancelled: 'Betalingen blev ikke gennemført. Dit preview er gemt – du kan bestille, når du er klar.',
      mockupCaption: `Sådan hænger det. ${formatLabel(format)}, sort ramme med passepartout, klar til væggen.`,
      landscape: '(liggende)',
      again: 'Vis et andet billede',
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
        ['Efter dit ja', `Print i ${formatLabel(format)}, ramme og fri fragt. Leveret ${levering}.`],
      ] as [string, string][],
      more: 'Vis et billede mere',
      unverifiedH1: 'Vi kunne ikke bekræfte betalingen med det samme.',
      unverifiedP: 'Er pengene trukket, er din bestilling hos os, og du får en mail inden for få minutter. Ellers kan du gå tilbage til dit billede og prøve igen.',
      back: 'Tilbage til dit billede',
      home: 'Til forsiden',
      doubt: phone ? `Er du i tvivl, så ${ringTil} på ${phone}${f.email ? ` eller skriv til ${f.email}` : ''}.` : (f.email ? `Er du i tvivl, så skriv til ${f.email}.` : ''),
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
