# Resultat – Billedearv

8 prioriterede fund er rettet og verificeret lokalt. Priser, betalingsberegning og brand er bevaret. Ingen deploy, betaling, ekstern mail, kundehenvendelse eller upload til en ekstern tjeneste blev udført. Den oprindelige brugerfil `.claude/launch.json` er bevaret.

**Runde 2 (Claude Code, samme dag):** C01–C08 efterprøvet i kode og browser; én mangel rettet (fokus landede ikke i dialogen ved åbning). Fem yderligere rettelser med tests: Meta CAPI sendes kun med samtykke som lovet på /privatliv, browser-Purchase på `/tak` gøres med én atomisk claim, godkendelsessiderne siger ikke længere "vi printer" for refunderede eller rettede ordrer, fokus vender tilbage til CTA'en også i Safari, og sendegrænsen på link-mailen forklares. Detaljer, evidens og restpunkter i [PLAN.md → Runde 2](PLAN.md#runde-2--claude-code-7-september-2026); screenshots i [verify/](verify/index.md).

## Rettelser

- C01–C02: upload kan vælges med tastatur. Enter åbner den native filvælger. Tab/Shift+Tab bliver i dialogen, baggrunden er inaktiv, og Escape returnerer fokus til den udløsende CTA.
- C03: e-mailformularer viser validering og fejl, bevarer input og låser igangværende indsendelser. Mail-API'er returnerer 503 ved manglende konfiguration/providerfejl og 429 ved sendebegrænsning. Fejl under behandling rulles ind i det synlige område.
- C04: et autoriseret link åbnet før preview er færdigt viser en ventetilstand med opdatering og kontakt, frem for 404. Et succesfuldt gemt link overlever lukning af dialogen. Den særskilte Afbryd-handling anmoder fortsat om sletning. Teksten beskriver nu, at linket sendes med det samme.
- C05–C06: slettefejl giver fejlbesked og bevarer previewet. Checkout/sletning har lås mod gentagne klik. Sene formular- og pollingsvar fra et lukket flow ignoreres.
- C07: pixelinitialisering sender ikke længere sin egen PageView ud over det kølagte event. Sidevisninger følger klientnavigation. Cookiebanneret kan initialiseres på en side med gendannet scrollposition uden timerfejl.
- C08: `/api/track` accepterer kun kendte produktfelter og begrænsede tal. Vilkårlig metadata, kontaktoplysninger og tokens filtreres fra. Dette er ikke en garanti for hele det eksisterende Meta/CAPI-system; se C12.

## Verifikation og evidens

| Kontrol | Resultat | Begrænsning |
|---|---|---|
| `npm test` | 19/19 består; runde 2: 28/28 | Provider, session og database isoleret i API-tests; ingen rigtige mails |
| `npm run typecheck` | Består | Installeret Node 24.16.0; projektet anbefaler 22 |
| `npm run build` | Består | Advarer om manglende NEXT_PUBLIC_SITE_URL og ignoreret package-lock i hjemmemappen; intet deploymentmiljø |
| `BASE=http://localhost:3000 npm run test:viewport` | Består ved 375, 390, 430, 768, 1024 og 1280 px | Forsiden; ingen rigtig PURL var tilgængelig |
| `npx tsx scripts/conversion-audit.mts after --verify` | Består: 54 observationer, 69 screenshots; runde 2 genkørt som `verify --verify` | 390×844, 768×900 og 1440×900; preview med syntetiske props |
| `npx tsx scripts/audit-interactions.mts` | Består på mobil/desktop; runde 2 genkørt til `verify/` | Samtykke/route/pending er isolerede komponentfixtures; API'er simuleret |
| `git diff --check` | Består | Ingen lint-konfiguration eller lint-script findes |
| `npm run test:order` | Ikke kørt | Kræver PURL til en autoriseret testordre. Prisberegning og konfigurator er testet separat |

Før rettelserne fejlede 21 browserchecks vedrørende tastatur/fokus, e-mailfeedback, sene svar og slettefejl. Nye unit/API-regressioner reproducerede to PageView-events ved én accept, falsk mailsucces, fri metadata og pending-previewets 404. Efter rettelserne består disse kontroller.

De offentlige routes `/`, `/privatliv`, `/handelsbetingelser` og ubekræftet `/tak` svarer 200. Ugyldige preview-/godkendelseslinks og ukendt route giver 404 med vej tilbage. Ingen vandret overløb eller defekte billeder blev registreret på disse sider og produktfixturen ved de tre auditbredder. Ingen pageerror i de kontrollerede starttilstande eller den supplerende interaktionsrunde. Alle 16 FAQ'er blev åbnet; footerens vilkårs-, privatlivs- og hjemlinks blev klikket. Uploadformat/-størrelse, netværksfejl, indtastningsbevarelse, gemt link, eksplicit annullering og checkoutfejl blev afprøvet med syntetiske data.

Der er ikke udført Lighthouse eller målt forbedring i hastighed. Udviklingsserverens kompilering/cache og desktop-Chromium emuleret som mobil kan ikke bruges som faktiske brugerdata, Safari-validering eller dokumentation for højere konvertering.

## Screenshots

- [69 førbilleder: route, bredde og tilstand](before/index.md)
- [69 matchende efterbilleder](after/index.md)
- [10 supplerende efterbilleder og interaktionschecks](after/supplementary.md)
- [Før: mobil landing](before/landing-first-390.png) / [efter](after/landing-first-390.png)
- [Før: mislykket mail uden fejlbesked](before/keep-error-390.png) / [efter: synlig fejl og bevaret e-mail](after/keep-error-390.png)
- [Før: slettefejl forlader preview](before/delete-error-390.png) / [efter: preview bevares](after/delete-error-390.png)

Preview-fixturen bruger et eksisterende arkivfoto som billeddata, også på mockup-pladsen. Den er evidens for komponentlayout og adfærd, ikke for et færdigt kundeprodukt eller faktisk restaureringskvalitet. Ventetilstands- og cookie-screenshots er også markeret som isolerede fixtures. Den lokale Next.js-udviklingsindikator kan ses på screenshots; den findes ikke i produktionsbuildet.

## Resterende problemer og beslutninger

1. **C09 – ejerdata:** CVR, adresse og by er TODO i assets/founder/founder.md. Juridiske sider står som udkast. Oplysninger må ikke opfindes; eksisterende produktionskontrol må ikke omgås.
2. **C10 – testmiljø:** ingen lokal `.env.local` og ingen autoriseret testordre. Ægte restaurering, HEIC på iPhone, Stripe Checkout, webhook, betalt `/tak`, godkendelse/ændringsønske, mails og filhentning er uprøvet i integration. Gamle notater om API-credits/levering er ikke genverificeret.
3. **C12 – måling:** *runde 2:* sendServerEvent kræver nu Meta-samtykke stemplet på ordren (som /privatliv lover), og `/tak` claimer Purchase-markøren atomisk. *Tilbage:* privatlivsteksten nævner kun hashet e-mail/telefon ved køb, mens CAPI også sender hashet navn, postnummer, by, session-id, fbc, IP og user-agent for Purchase, InitiateCheckout og PreviewShown – ejer/advokat vælger tekst eller beskæring. Faktisk dedup i Events Manager og samtidige webhook/return-kald kræver testmiljø.
4. **C11 – hypoteser:** kortere hero på lave mobilskærme, dokumentation for fotografprisankeret 300–600 kr., realistisk variation i behandlingstid og eksisterende CTA-varianter. Ingen A/B-test er startet eller effekt på omsætning påstået.
5. **Mailens leveringssikkerhed:** API-succes betyder accepteret af provider, ikke dokumenteret indbakkelevering. De eksisterende sendetællere reserveres før send og er ikke atomiske. Begrænsning/idempotens under parallelle requests og retries skal prøves mod testdatabase; ingen produktionstabeller er ændret.
6. **Godkendelsesstatus:** *runde 2:* rettet i kode med unit-tests – REFUNDED siger "Ordren er refunderet" uden fil-link, IN_RETOUCH/CHANGE_REQUESTED "vi retter det", SHIPPED/COMPLETED "Dit billede er sendt" med fil-link, APPROVED/IN_PRODUCTION uændret, på både `/godkend/[token]` og `/aendring`. Gennemsyn med rigtige testordrer (mails, `/fil`, `/billede`) hører fortsat under C10.

## Ændrede filer

Produkt: components/UploadFlow.tsx, PreviewPanel.tsx, PreviewPending.tsx, Consent.tsx, PixelBoot.tsx; app/globals.css; app/p/[id]/page.tsx; app/api/lead/route.ts; app/api/preview/[id]/save/route.ts; app/api/track/route.ts; lib/copy.ts; lib/analytics/client.ts og client-metadata.ts.

Verifikation: tests/analytics.test.mts, mail-feedback.test.mts; tests/viewport.browser.mjs og order-state.browser.mjs; scripts/screenshots.ts, conversion-audit.mts og audit-interactions.mts. Dokumentation og billeder: denne mappe. Ingen nye afhængigheder.

Runde 2, produkt: lib/analytics/capi.ts, lib/session.ts, lib/preview-service.ts, lib/db/orders.ts; app/api/preview/start/route.ts, app/api/checkout/route.ts, app/tak/page.tsx, app/godkend/[token]/page.tsx, app/godkend/[token]/aendring/page.tsx; components/UploadFlow.tsx, OpenFlowButton.tsx, StickyCta.tsx. Runde 2, verifikation: tests/_bundle.mts (fælles esbuild-stub-hjælper), approval-pages.test.mts, capi-consent.test.mts, purchase-claim.test.mts; scripts/audit-interactions.mts (mappe-argument); verify/ (69 + 10 screenshots, findings, hero-first-*.png). Stadig ingen nye afhængigheder.

Kørende udviklingsserver: **http://localhost:3000**. [Plan med status](PLAN.md). [Claude Code-prompt](CLAUDE_CODE_PROMPT.md).
