// Locked Danish copy (spec §4–§6). Placeholders render from config and founder.md.
import { CONFIG, currentSeason, deliveryPromise, formatCutoffDate, type Season } from '@/lib/config';
import { formatDkk, PRICING, customerFormat, formatLabel } from '@/lib/pricing';
import { fornavn, getFounder } from '@/lib/founder';

export function copy(season: Season = currentSeason()) {
  const f = getFounder();
  const navn = fornavn();
  const format = customerFormat();
  const price = formatDkk(PRICING[format].priceDkk);
  const dato = formatCutoffDate();
  const X = CONFIG.deliveryDaysMax;
  const levering = deliveryPromise(season);
  const by = f.city;
  const jul = season === 'jul';

  return {
    season,
    price,
    format,
    formatLabel: formatLabel(format),
    hero: {
      h1: jul
        ? 'Det gamle billede af hendes forældre. Skarpt, indrammet og under juletræet.'
        : 'Det gamle billede af hendes forældre. Skarpt, indrammet og hjemme hos hende.',
      sub: `Upload et foto af billedet – se resultatet på under et minut. ${price} inkl. ramme og fri fragt.`,
      cta: 'Se dit billede nu',
      small: 'Du godkender resultatet, før vi printer.',
    },
    tryghed: [
      by ? `Dansk virksomhed, ${by}` : 'Dansk virksomhed',
      'Pengene tilbage, hvis det ikke ligner',
      'Billedet slettes efter 30 dage',
    ],
    saadan: {
      h2: 'Sådan fungerer det',
      steps: [
        'Tag et foto af billedet med telefonen. Dagslys, ingen blitz – det er nok.',
        'Se resultatet på skærmen. Det tager under et minut.',
        `Bestil. ${cap(navn)} finjusterer, du godkender på mail, vi printer og sender. Leveret ${levering}.`,
      ],
    },
    eksempler: { h2: 'Eksempler', placeholderNote: 'Eksemplerne er arkivfotos fra Wikimedia Commons og Library of Congress, restaureret med præcis samme proces som dit billede.' },
    offer: {
      line: `Restaureret + indrammet ${formatLabel(format)}. Digital fil inkluderet. Fri fragt. Leveret ${levering}.`,
      price,
      cta: 'Se dit billede nu',
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
          q: 'Jeg har ikke billedet – det ligger hos min mor.',
          a: 'Tag et foto af det med telefonen, næste gang du er hjemme. Læg det fladt i dagslys, uden blitz. Det er nok i langt de fleste tilfælde.',
        },
        {
          q: 'Hvad sker der med mit billede?',
          a: 'Det bruges kun til din bestilling, deles aldrig og slettes automatisk efter 30 dage – eller straks, hvis du beder om det.',
        },
        {
          q: 'Kan jeg fortryde?',
          a: 'Du godkender det færdige billede, før vi printer. Ligner det ikke, får du pengene tilbage. Selve printet er lavet til dig og kan ikke returneres, men er det beskadiget ved levering, sender vi et nyt.',
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
      note: 'Billedet bruges kun til dit preview og slettes efter 30 dage.',
      cta: 'Vis mig resultatet',
      remove: 'Fjern',
      reupload: 'Vælg et andet',
      tooBig: 'Filen er over 25 MB. Tag et nyt foto, eller vælg et mindre.',
      wrongType: 'Vi kan læse JPEG, PNG, HEIC og WebP. Prøv et andet billede.',
    },
    processing: {
      stages: { uploading: 'Uploader', sending: 'Sender billedet', restoring: 'Restaurerer', preparing: 'Gør preview klar' } as Record<string, string>,
      sentences: {
        uploading: 'Billedet er på vej til os.',
        sending: 'Vi kigger på skader, ridser og falmede toner.',
        restoring: 'Vi retter ridserne og henter kontrasten tilbage. Ansigterne rører vi ikke ved.',
        preparing: 'Gør dit preview klar.',
      } as Record<string, string>,
      wait: 'Det tager normalt 30–45 sekunder.',
      cancel: 'Afbryd',
      networkError: 'Forbindelsen røg undervejs. Billedet er stadig valgt – prøv igen.',
      retry: 'Prøv igen',
    },
    preview: {
      h2: 'Sådan kan dit billede se ud.',
      p: `Vi finjusterer billedet manuelt, printer det i ${formatLabel(format)}, indrammer det og sender det hjem til dig. Du godkender det færdige billede, før vi printer.`,
      colourToggle: 'Vis i farver',
      monoToggle: 'Vis i sort-hvid',
      cta: `Bestil mit billede – ${price}`,
      under: 'Pengene tilbage, hvis det ikke ligner.',
      before: 'Før',
      after: 'Efter',
      cancelled: 'Betalingen blev ikke gennemført. Dit preview er gemt – du kan bestille, når du er klar.',
      mockupCaption: `Sådan hænger det. ${formatLabel(format)}, sort ramme, passepartout.`,
      again: 'Vis et andet billede',
    },
    fallback: {
      p: `Dette billede kræver manuelt arbejde – vi kan ikke lave et automatisk preview. Send det til os, så vurderer ${navn} det og vender tilbage inden 24 timer.`,
      email: 'Din e-mail',
      cta: 'Send til os',
      sent: `Tak. ${cap(navn)} kigger på det og skriver til dig inden 24 timer.`,
    },
    tak: {
      h1: `Tak. ${cap(navn)} kigger på dit billede i dag.`,
      p: 'Du får det færdige billede til godkendelse på mail inden 48 timer. Vi printer først, når du siger ja.',
      timeline: [
        ['I dag', `${cap(navn)} finjusterer billedet i hånden.`],
        ['Inden 48 timer', 'Du får en mail med det færdige billede. Godkend, eller bed om en ændring.'],
        ['Efter dit ja', `Print i ${formatLabel(format)}, ramme og fri fragt. Leveret ${levering}.`],
      ] as [string, string][],
      more: 'Vis et billede mere',
    },
    consent: 'Jeg accepterer, at fortrydelsesretten bortfalder, når den digitale fil leveres, og at printet fremstilles specielt til mig.',
    cookie: {
      text: 'Vi bruger en enkelt cookie fra Meta til at måle, om annoncerne virker. Ingen andre.',
      accept: 'Ok',
      decline: 'Nej tak',
    },
  };
}

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export type Copy = ReturnType<typeof copy>;
