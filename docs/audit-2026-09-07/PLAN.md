# Billedearv – konverteringsaudit 7. september 2026

Plan skrevet efter før-gennemgang og før ændringer i produktkode. Status opdateres efter verifikation.

Slutstatus: C01–C08 er rettet og verificeret lokalt med regressioner og browserkontrol. C09, C10 og C12 er blokeret som beskrevet. C11 er et foreslået eksperiment/ejerdata. Se [rapporten](REPORT.md) for verifikationsgrænser og restpunkter.

Runde 2 (Claude Code, samme dag): C01–C08 gennemgået i kode og genkørt; én mangel fundet og rettet (fokus landede ikke i dialogen ved åbning under StrictMode). Derudover rettet: CAPI sendes nu kun med Meta-samtykke, Purchase-markøren på `/tak` er atomisk, godkendelsessiderne beskriver refunderede/rettede/sendte ordrer korrekt, fokus vender tilbage til CTA'en også i Safari, og 429 på link-mailen forklares ærligt. Se [Runde 2](#runde-2--claude-code-7-september-2026) nederst.

## Grundlag og afgrænsning

Billedearv restaurerer indsendte familiefotos og sælger print med ramme. Primært konverteringsmål: betalt ordre efter preview. Projektets målgruppe er danske voksne 35–65 år, primært på mobil fra Meta-annoncer. Det er projektets beskrivelse, ikke valideret brugerdata. Aktuel priskilde er `lib/pricing.ts`: 599/799/999 kr., ekstra eksemplar 349 kr. Brand og priser bevares.

Eksisterende prioriteringer i HANDOFF, DECISIONS og QA indgår. Ældre dokumenter modsiger hinanden om antal størrelser, ventetid og analytics; aktuel kode og observeret adfærd er grundlag for denne plan. `.claude/launch.json` var allerede ændret/utracket og røres ikke.

Node 24.16.0 er installeret; projektet anbefaler Node 22. npm/package-lock bruges. Eksisterende udviklingsserver på http://localhost:3000 verificeret via proceskommando med `--prefix C:/Users/mo/Desktop/Billede` og browser. Ingen ny server nødvendig. Indbygget browser fejlede (`sandboxPolicy`); installeret Playwright/Chromium anvendes i stedet.

Alle browserindsendelser og analytics writes er opsnappet lokalt. Produktkonfiguratoren køres med den rigtige React-komponent og syntetiske props på `/audit-preview`, kun tilgængelig via testens request interception. Den route tilføjes ikke til websitet. Fixturebilledet er et eksisterende arkivfoto, ikke et genereret kunderesultat.

## Prioriteret rettelsesplan

| ID | Prioritet | Route/element | Evidens og screenshot | Mulig konsekvens | Rettelse | Berørte filer | Acceptkriterier | Indsats | Status |
|---|---|---|---|---|---|---|---|---|---|
| C01 | P0 for tastaturbrugere | Upload: vælg fil | Observeret: alle file inputs har `hidden`, labels kan ikke tabbes til. [Upload](before/upload-empty-1440.png), findings.json | Kan ikke begynde kernehandlingen uden mus | Native filinput tilgængelig med tastatur og synlig fokusmarkering; kamera/kamerarulle bevaret | components/UploadFlow.tsx | Enter åbner filvælger på mobil/desktop; valgt fil vises | S | Rettet og verificeret lokalt |
| C02 | P1 | Uploaddialog | Observeret: Shift+Tab forlader dialog; Escape returnerer fokus til et link, ikke udløseren | Tastatur/skærmlæser mister kontekst | Fokusfastholdelse, inaktiv baggrund, fokus tilbage ved lukning | components/UploadFlow.tsx | Tab og Shift+Tab forbliver i dialogen; fokus tilbage på CTA | M | Rettet og verificeret lokalt |
| C03 | P1 | Mail-link under behandling og preview; lead uden foto | Kodebekræftet: keepLink ignorerer HTTP-status; mail-API sluger providerfejl og returnerer 200; rate limit returnerer falsk succes. [Eksisterende netværksfejl](before/email-network-error-390.png) | Kunden forlader siden i tro på en mail, der ikke kommer | Validering, tydelige fejl, bevaret e-mail, responsstatus fra provider; ingen succes når mail mangler | UploadFlow.tsx, PreviewPanel.tsx, api/preview/[id]/save, api/lead | 400/429/503 giver fejl; retry muligt; kun accepteret mail giver succes | M | Rettet og verificeret lokalt |
| C04 | P1 | Mail-link til igangværende preview | Kodebekræftet: link sendes straks, men /p kræver færdigt payload; lukning af sheet annullerer selv efter gemt link | Sendt link ender i 404/slettet billede | Ventetilstand på autoriseret preview; luk uden annullering efter gemt link; eksplicit Afbryd annullerer fortsat | app/p/[id]/page.tsx, ny PreviewPending, UploadFlow.tsx, lib/copy.ts | Gemt link under behandling kan vente/genindlæse; fejl har vej videre; cancel fortsat tydelig | M | Rettet og verificeret lokalt |
| C05 | P1 | Slet preview | Observeret: simuleret 503 navigerer til `/?slettet=1`. [Falsk succes](before/delete-error-390.png) | Kunden får forkert besked om eget foto | Kontroller status, vis fejl og behold preview; undgå dobbeltklik | PreviewPanel.tsx | 409/503/netværksfejl viser ingen slettebekræftelse; 200 kan gå til kvittering | S | Rettet og verificeret lokalt |
| C06 | P1 | Asynkrone formularer/dialog | Kodebekræftet: afsluttet lead/save og fejlet polling kan genåbne lukket dialog | Uventet popup, tabt kontrol, forkerte successvar i nyt flow | Ignorer svar fra tidligere forløb; annuller polling sikkert; lås igangværende indsendelser | UploadFlow.tsx | Luk under request; svar genåbner ikke dialog eller ændrer nyt flow | M | Rettet og verificeret lokalt |
| C07 | P1 | Cookies / PageView | Kodebekræftet: loadPixel sender PageView, derefter replayQueue sender samme PageView. Consent læser timer før initialisering ved scroll-restoration | Forkert funneldata og mulig runtimefejl | En ejer af PageView; log ved routeændring; initialisér timer før scroll-check | lib/analytics/client.ts, PixelBoot.tsx, Consent.tsx | Ét PageView ved accepteret samtykke; ingen ved afslag; scroll-restoration uden fejl | S | Rettet og verificeret lokalt |
| C08 | P1 | /api/track metadata | Kodebekræftet: fri metadata gemmes direkte | Utilsigtede personoplysninger kan ende i eventtabellen | Whitelist produktfelter, begræns tal og enum-værdier | api/track/route.ts, ny analytics-metadata helper | E-mail, telefon, token, vilkårlig tekst og nested data filtreres fra | S | Rettet og verificeret lokalt |
| C09 | P1 | Virksomhedsidentitet og salgsvilkår | Observeret TODO for by, CVR og adresse; legal pages indeholder udfyldningsfelter. [Vilkår](before/terms-390.png) | Manglende tillid før betaling | Ejeren skal levere verificerede virksomhedsdata og færdigbehandle eksisterende udkast | assets/founder/founder.md; HANDOFF | Rigtige oplysninger og ejerens godkendte vilkår | Ejer | Blokeret |
| C10 | P1 | Eksterne integrationsflows | Ingen lokal .env.local/adgang til testordrer. Historisk HANDOFF omtaler udløbne credits, ikke verificeret nu | Upload/køb/mail kan ikke garanteres i drift | Testnøgler og isoleret database/Stripe/Resend-miljø; HEIC på rigtig iPhone; købs-, webhook-, godkendelses- og downloadforløb | Miljø; HANDOFF | End-to-end test i testmiljø, ingen rigtige betalinger | Ejer | Blokeret |
| C11 | P2 | Hero, prisanker og forventning | Faglig vurdering: hero CTA synlig ved 390×844 men lavt ved kortere viewport; fotografpris 300–600 kr. mangler dokumentation i repo (kode angiver ejerens tal); absolut ventetidsløfte | Købsindvendinger og forventninger kan være uklare | Test kortere hero og konkret CTA med eksisterende variant; ejer fremlægger kilde til prisanker og faktiske behandlingstider | lib/copy.ts; app/page.tsx | Evidens før ændrede faktapåstande; eksperiment måles uden lovet løft | M | Foreslået eksperiment / ejerdata |
| C12 | P1 | Eksisterende Meta CAPI og Purchase | Kodegennemgang: CAPI sender hash af kontaktdata uden at bruge samtykkestatus; /tak sætter purchase_tracked_at før browser-event, check/update er ikke atomisk | Uklar samtykkepraksis, tab/dubletter i købstælling | Separat gennemgang med testdatabase og besluttet måle-/samtykkepolitik; harmonisér server-event som købskilde | analytics/capi.ts; app/tak; payments/fulfil-paid; schema | Test consent, webhook/return samtidighed og faktisk Events Manager dedup | M | Delvist rettet i runde 2: samtykkegate (efter /privatliv) og atomisk Purchase-markør, begge med unit-tests. Faktisk dedup i Events Manager og webhook/return-samtidighed mod rigtig database fortsat blokeret (C10). Datafelter i CAPI ud over e-mail/telefon er en ejerbeslutning, se runde 2 |

## Dækning

- `/`: mobil/tablet/desktop, CTA, upload, typevalidering, retry/netværksfejl, e-mailvalidering, keyboard og Escape. FAQ og links kontrolleres i efter-runden.
- `/privatliv`, `/handelsbetingelser`: hele sider og footer.
- `/tak`: ubekræftet betaling. Betalt kvittering kræver testordre.
- `/p/[id]`: ugyldigt id/404. Produktkomponentens konfigurator, priser, ekstra eksemplar, checkout-fejl og sletning med syntetiske data.
- `/godkend/[token]`, `/godkend/[token]/aendring`: ugyldigt token/404. Gyldig godkendelse, ændring, download `/fil` og beskyttet `/billede` kræver testordre.
- `/admin` er driftsværktøj, ikke kundevendt; ingen admin-mutationer.
- Ingen søgning, filter, konto, separat kurv eller booking findes i denne kunderejse. Checkout ligger hos Stripe.
- Før-screenshots: [indeks](before/index.md), bredder 390, 768 og 1440. Screenshots beviser udseende, ikke integrationers funktion.

## Verifikation

Regressioner på faktisk komponent/API-adfærd med isolerede eksterne afhængigheder; derefter npm test, typecheck, build og eksisterende viewport-test. Repo har intet lint-script. Efter-screenshots ved samme dimensioner og tilstande. Ingen påstand om forbedret omsætning eller konverteringsrate; ingen feltdata/Core Web Vitals er tilgængelige.

Resultat: 19 tests består; typecheck og build består. Før-runden fejlede 21 browserregressionschecks; efter-runden består, inklusive Enter til native filvælger. Viewport-test består på 375/390/430/768/1024/1280 px. 69 matchende screenshots pr. runde samt 10 supplerende efterbilleder. [Efterindeks](after/index.md) og [supplerende kontrol](after/supplementary.md).

En lokal opstartsfejl i de gamle browsertests blev også rettet: deres hardkodede Linux-Chromiumsti er erstattet af Playwrights installerede browser, med mulighed for `PLAYWRIGHT_CHROMIUM`. Berører scripts/screenshots.ts og tests/{viewport,order-state}.browser.mjs. Intet nyt bibliotek eller tjeneste blev installeret.

## Runde 2 – Claude Code, 7. september 2026

Udgangspunkt: Codex' lokale, ucommittede rettelser C01–C08 (git diff) og denne mappe. Alle brugerændringer, inkl. `.claude/launch.json`, er bevaret. Relevante Next.js 16-guider læst i `node_modules/next/dist/docs` (server/client components, `useRouter().refresh`, route handlers).

### Kontrol af C01–C08

| ID | Kontrol | Resultat |
|---|---|---|
| C01 | Kode: alle file inputs `visually-hidden` (ikke `hidden`), label får `:focus-within`-ring. Browser: `hidden:false, tabIndex:0` på 390/768/1440; Enter åbner native filvælger | Verificeret |
| C02 | Kode: `inert` på alle body-søskende (main, footer, sticky CTA, cookiebanner), Tab/Shift+Tab fanges, Escape → `previous.focus()`. Browser: fokus inde i dialog efter Shift+Tab; BUTTON efter Escape | **Mangel fundet:** ved åbning landede fokus på `body`/CTA i stedet for dialogen, fordi Sheet'ens mount-effekt køres dobbelt af React StrictMode, og dens cleanup gendanner fokus til CTA'en *efter* forælderens `sheetRef.focus()`. Rettet: dialogen fokuserer sig selv sidst i sin egen effekt. Efter rettelse: fokus på `[role=dialog]` ved 0/100/400 ms, tilbage på CTA ved lukning. Safari fokuserer ikke en klikket knap, så `OpenFlowButton`/`StickyCta` fokuserer knappen før `gf:open` |
| C03 | Kode: keep/save/lead validerer, viser fejl med `aria-describedby`, bevarer e-mail, låser under afsendelse; API 400/429/503. Unit: 10 API-tests | Verificeret. Tilføjet: 429 på "Jeg har ikke billedet lige nu" siger, at linket allerede er sendt flere gange i dag, i stedet for "prøv igen" |
| C04 | Kode: `/p/[id]` viser `PreviewPending` for autoriseret ordre uden payload (NEW + job ikke fejlet → auto-refresh hvert 5. s i 150 s; fejlet job/manuel vurdering → opdater + kontakt; ABANDONED/slettet → 404). Gemt link overlever luk; Afbryd annullerer | Verificeret (browser: gemt link → 0 cancel-kald ved luk; Afbryd → 1) |
| C05 | Kode: `r.ok` før navigation, fejl + kontakt, `eraseBusy` | Verificeret (syntetisk 503 bliver på `/audit-preview`) |
| C06 | Kode: `runRef`-vagt i keepLink, poll, sendLead, start/run; `state.sending`-lås | Verificeret (sent lead-svar genåbner ikke dialogen) |
| C07 | Kode: `loadPixel` sender ikke PageView; `PixelBoot` ejer PageView pr. pathname med ref-vagt mod StrictMode; Consent initialiserer timer før scroll-check. Unit + browser: 1 PageView ved accept, +1 ved klientnavigation, 0 ved afslag | Verificeret |
| C08 | Kode: whitelist med enum/tal/`content_ids`. Alle felter, klienten faktisk sender for tilladte events (`cta`, `content_name`, `content_ids`, `value`, `bytes`, `type`, produktkonstanter), bevares; `monochrome`/`reason` sendes kun for events, serveren i forvejen ignorerer (`CLIENT_ALLOWED`) | Verificeret |
| 9 | Playwright uden hardkodet Linux-sti; `test:order` forklarer PURL | Verificeret (viewport-test kører lokalt) |

### Yderligere rettelser i runde 2

| Punkt | Fund | Rettelse | Filer | Test |
|---|---|---|---|---|
| C12a samtykke | `/privatliv` lover, at server-eventet til Meta kun sendes "hvis du har sagt ja til Meta-cookien"; DECISIONS siger, privatlivsteksten matcher koden. `sendServerEvent` sendte uanset samtykke, også fra webhook/baggrundsjob, der ingen cookie har | `gf_consent` stemples på ordren (`preview_meta.consent`) ved `/api/preview/start` og igen ved `/api/checkout`; `sendServerEvent` returnerer uden `consent === 'yes'` | lib/analytics/capi.ts, lib/session.ts (`readConsent`), lib/preview-service.ts (`beginUpload`), app/api/preview/start, app/api/checkout | tests/capi-consent.test.mts: intet kald uden/ved nej; ét kald med ja; payload uden share-token, rå e-mail, telefon eller by |
| C12b Purchase | `/tak` læste `purchase_tracked_at` og skrev derefter – to samtidige renders/reloads kunne begge affyre browser-Purchase | `claimPurchaseTracking()`: én betinget `update … where purchase_tracked_at is null`; kun vinderen affyrer | lib/db/orders.ts, app/tak/page.tsx | tests/purchase-claim.test.mts |
| Godkendelsesstatus | `/godkend/[token]` sagde "Tak. Vi printer og sender." for alle statusser uden for afventning/ændring, inkl. REFUNDED og IN_RETOUCH; `/aendring` sagde "godkendt og på vej i produktion" | Eksplicitte grene: CHANGE_REQUESTED/IN_RETOUCH → "vi retter det"; REFUNDED → "Ordren er refunderet … vi printer ikke noget" (ingen fil-link); SHIPPED/COMPLETED → "Dit billede er sendt" (fil-link bevaret); APPROVED/IN_PRODUCTION uændret | app/godkend/[token]/page.tsx, app/godkend/[token]/aendring/page.tsx | tests/approval-pages.test.mts (5 tests, begge sider rendret med stubbet ordre) |
| Fokus (C02) | Se ovenfor | Sheet fokuserer sig selv; CTA'er fokuseres før `gf:open` | components/UploadFlow.tsx, OpenFlowButton.tsx, StickyCta.tsx | Browser (JS-instrumenteret focusin/focusout) + conversion-audit |
| 429-tekst (C03) | "Prøv igen" ved sendegrænse | Egen tekst for nophoto+429 | components/UploadFlow.tsx | Kode |
| Auditscripts | `audit-interactions` skrev altid til `after/` | Mappe som argument; denne runde skriver til `verify/` | scripts/audit-interactions.mts | – |

### Verifikation, runde 2

`npm test` 28/28 (19 + 9 nye). `npm run typecheck`, `npm run build` (samme advarsler som før: NEXT_PUBLIC_SITE_URL, package-lock i hjemmemappen) og `git diff --check` består. `npx tsx scripts/conversion-audit.mts verify --verify`: 54 observationer, 27 regressionschecks, 69 screenshots i [verify/](verify/index.md). `npx tsx scripts/audit-interactions.mts verify`: 12/12 på 390 og 1440, [supplerende](verify/supplementary.md). `BASE=http://localhost:3000 npm run test:viewport`: OK på 375–1280 px. `npm run test:order` ikke kørt (ingen autoriseret testordre). Første kørsel af conversion-audit fejlede på et 3 s `filechooser`-timeout, mens build og interaktionsaudit kørte samtidig mod samme dev-server; kørt alene bestod den. Manuel kontrol i indbygget browser ved 375×812: `main`/`footer`/sticky CTA `inert` mens sheet er åben, `body.overflow=hidden`, fokus i dialog, tilbage på CTA ved luk.

### Blokeret / ejerbeslutninger (status uændret, præciseret)

- **C09 – ejeren skal levere** i `assets/founder/founder.md`: `city`, `cvr`, `address` (gade, postnr, by), tre `why`-linjer, `portrait.jpg`; `LEGAL_DRAFT=false` først efter juridisk gennemgang af `/handelsbetingelser` og `/privatliv`. `next.config.ts` nægter at bygge til produktion uden by/CVR/adresse/e-mail – ikke omgået. Intet er opfundet.
- **C10 – testmiljø:** ingen `.env.local`, ingen Stripe-testnøgle (`sk_test_…`), Resend-nøgle eller isoleret Supabase i repoet; Composio-forbindelsen fra HANDOFF peger på live-Stripe-kontoen, ikke et isoleret testmiljø. Rigtig restaurering, HEIC fra iPhone, Checkout/webhook, betalt `/tak`, godkendelsesmail, ændringsønske og `/fil` er fortsat kun testet på kode-/komponentniveau med stubbede grænser.
- **C12 – resterende:** (1) `/privatliv` nævner hashet e-mail og telefon ved køb; koden sender desuden hashet for-/efternavn, postnummer, by, session-id, `fbc`, IP og user-agent, og sender også InitiateCheckout og PreviewShown. Ejer/advokat vælger: udvid privatlivsteksten eller beskær `user_data` i `lib/analytics/capi.ts`. Ikke ændret, fordi det er en måle-/juridisk beslutning. (2) Samtykke stemples ved upload-start og checkout; et samtykke givet *under* behandlingen når ikke PreviewShown-serverkopien (browserkopien afspilles fra køen). (3) Faktisk dedup i Events Manager og webhook/return-samtidighed kræver testmiljø.
- **Sendetællere:** `share_sent_count` (save) og `overused` (lead) læses før send og er ikke atomiske – parallelle requests kan overskride grænsen med antallet af samtidige kald. Lav risiko, ingen skemaændring uden testdatabase.
- **C11 – faktagrundlag (ingen ændringer foretaget):** CTA'en i hero ligger 673–725 px nede ved 390 px bredde: synlig ved 390×844, under folden ved 390×667 og 375×553 ([hero-first-390x667](verify/hero-first-390x667.png), [375x553](verify/hero-first-375x553.png)). Den faste bjælke viser CTA'en efter 120 px scroll, så knappen findes stadig. "Omkring halvandet minut" ligger over de målte 32–51 s ende-til-ende i QUALITY_REPORT plus upload; tidligere kopi sagde "under et minut" og blev ændret bevidst (DECISIONS). Prisankeret 300–600 kr. er ejerens påstand uden kilde i repoet (HANDOFF §12); `PRICE_ANCHOR=''` fjerner linjen. CTA-varianter A/B/C findes via `NEXT_PUBLIC_CTA_VARIANT` og logges i `FlowOpened.cta`; ingen A/B-test er startet, ingen effekt påstået.
