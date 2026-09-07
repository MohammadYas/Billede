# Prompt til Claude Code

Kopiér teksten i blokken. Den tager højde for, at rettelserne allerede ligger lokalt, men også for at din Claude-session kan være på en anden revision.

```text
Arbejd i C:\Users\mo\Desktop\Billede på Billedarv som senior frontend-udvikler, UX-designer og CRO-specialist. Færdiggør og kvalitetssikr konverteringsrettelserne nedenfor. Stop ikke ved en audit eller generelle forslag.

Læs først AGENTS.md, CLAUDE.md, README.md, HANDOFF.md, DECISIONS.md, DESIGN.md, ANTI_SLOP.md og QA.md. Følg AGENTS.md's krav om relevante Next.js-guider i node_modules/next/dist/docs. Læs derefter docs/audit-2026-09-07/PLAN.md og REPORT.md samt før-/efterindeks.

VIGTIGT: C01–C08 er allerede implementeret og lokalt verificeret af Codex. Start med git status og git diff. Bevar ALLE eksisterende brugerændringer, herunder .claude/launch.json. Kontroller implementeringen og ret mangler; gentag ikke ændringer, der allerede er korrekte. Hvis denne session bruger en revision uden rettelserne, implementér punkterne nedenfor efter en kort, skriftlig plan. Fortsæt uden rutinemæssige godkendelsespauser.

Projekt: dansk fotorestaurering med print og ramme. Købsflow: landing → upload → behandling → preview/konfigurator → Stripe → kvittering → mailgodkendelse → print. Bevar det nordiske design og aktuelle priser/tilvalg fra lib/pricing.ts. Ændr ingen faktiske priser, forretningsvilkår eller betalingsberegning. Opfind ikke anmeldelser, kundetal, garantier, produktpåstande eller forventede konverteringsløft.

START OG BROWSER
- Genbrug http://localhost:3000, hvis processen fortsat tilhører denne projektmappe. Ellers start med npm run dev. Brug npm og eksisterende package-lock. Projektet anbefaler Node 22; den seneste lokale kontrol brugte Node 24.16.0.
- Brug en rigtig browser ved 390×844, 768×900 og 1440×900. Klik på CTA'er, filvælger, FAQ, links, formularer og konfigurator. Tag organiserede screenshots, og skeln mellem screenshots, funktionstest og integrationstest.
- Bevar eksisterende førbilleder. Gem nye verifikationsbilleder separat. Brug kun syntetiske data og testmiljø til requests med eksterne konsekvenser.

ALLE KODERETTELSER, DER SKAL VÆRE OPFYLDT
1. C01: Uploadens kamera/kamerarulle/filvælger og skift-fil skal kunne nås med Tab og aktiveres med Enter. Synlig fokusmarkering; type- og størrelsesvalidering fungerer.
2. C02: Uploaddialogen holder Tab/Shift+Tab indenfor, baggrunden er inaktiv, Escape/luk returnerer fokus til den udløsende CTA. Afprøv også tilstandsskift, mobilscroll og reduced motion.
3. C03: Mailformularerne under behandling, på preview og for kunder uden foto viser validering og netværksfejl, bevarer e-mail og tillader retry. Ingen falsk “sendt” ved HTTP-fejl, manglende mailkonfiguration, providerafvisning eller rate limit. De faktiske API'er skal returnere meningsfulde fejlstatusser. Afvis dobbeltindsendelse. Fejl skal være synlige og tilknyttet feltet.
4. C04: Et autoriseret preview-link, der åbnes under behandling, viser ventetilstand med opdatering og kontakt i stedet for 404. Et succesfuldt gemt link må ikke blive ødelagt ved at lukke dialogen. Den udtrykkelige Afbryd-handling skal fortsat anmode om annullering. Kontrollér overgang fra ventetilstand til færdigt resultat, jobfejl og udløbet/slettet ordre. Kopi skal stemme med, hvornår linket faktisk sendes.
5. C05: Sletning må kun navigere til en succesbekræftelse efter accepteret svar. 409, 503 og netværksfejl skal bevare preview og vise en forståelig fejl med retry/kontakt. Forebyg gentagne requests.
6. C06: Sene svar fra lead, save, start, run og polling må ikke genåbne et lukket flow eller overskrive et nyt forløb. Kontrollér lukning, genåbning og langsomme svar. Bevar foto ved genoprettelige fejl.
7. C07: Én PageView pr. besøg/routeændring, også ved samtykke efter kølagte events og React StrictMode. Ingen pixel ved afslag. Cookiebanneret må ikke crashe ved gendannet scrollposition. Ingen dublet fra både pixelinitialisering og køafspilning.
8. C08: /api/track skal filtrere metadata til kendte produktfelter. E-mail, telefon, tokens, ukendte tekstfelter, nested objekter og ugyldige tal må ikke gemmes som fri eventmetadata. Bevar relevante produkt-/prisfelter.
9. Browser-tests og screenshot-script må ikke afhænge af en hardkodet Linux-Chromiumsti. Brug Playwrights installerede browser eller eksplicit PLAYWRIGHT_CHROMIUM. test:order skal forklare, at PURL kræves, hvis den mangler.

RESTPUNKTER – GÅ VIDERE SÅ LANGT ADGANG OG GRUNDLAG TILLADER
- C09: CVR, adresse og by mangler i assets/founder/founder.md. Juridiske sider er udkast. Brug kun verificerede ejeroplysninger; omgå ikke buildkontrollen. Markér præcist, hvad ejeren skal levere.
- C10: Rigtig restaurering, HEIC på iPhone, Stripe Checkout/webhook, betalt /tak, godkendelsesmail, ændringsønske og download er IKKE integrationstestet i denne audit. Find et tydeligt isoleret testmiljø og gyldige testnøgler, hvis de er tilgængelige; afslør ingen secrets. Ellers dokumentér blokeringen, og fortsæt med lokal kode-/komponenttest.
- C12: Gennemgå eksisterende Meta CAPI: sendServerEvent bruger hash af kontaktdata uden samtykkekontrol. Afklar med projektets faktiske samtykkepolitik og kontroller, at tokens/private URL'er ikke lækker. Gennemgå Purchase: /tak sætter purchase_tracked_at før browser-event og læser/skriver separat. Undersøg atomisk/idempotent registrering, webhook/return-race, gentagne reloads og browser/CAPI-deduplikering i testmiljø. Ingen nye analytics-tjenester.
- Gennemgå sendetællere og idempotens ved parallelle mailrequests og retries. Provideraccept er ikke dokumentation for indbakkelevering.
- Gennemgå godkendelses- og ændringssider med refunderede, annullerede, gamle og allerede godkendte testordrer. Brede statusgrene må ikke påstå “vi printer” for en refunderet ordre.
- C11: Kortere hero ved lav mobilhøjde, CTA-varianter, fotografprisanker 300–600 kr. og løfte om halvandet minuts behandling er hypoteser/ejerdata. Dokumentér faktagrundlag før ændringer. Start ikke et A/B-testløb eller ændr faktiske påstande uden grundlag.

VERIFIKATION
Kør npm test, npm run typecheck, npm run build og git diff --check. Der findes ikke et lint-script. Kør også:
  npx tsx scripts/conversion-audit.mts after --verify
  npx tsx scripts/audit-interactions.mts
  npm run test:viewport med BASE=http://localhost:3000
Kør kun npm run test:order med PURL til en autoriseret TESTORDRE; testen ændrer ordrevalg. Undgå at overskrive den eksisterende audit-evidens ved at tilpasse outputmappen til din nye runde.

Seneste baseline: 19 unit/API-tests, typecheck, build og browserkontroller består. Bygget advarer om manglende NEXT_PUBLIC_SITE_URL og ignoreret package-lock i hjemmemappen. Browseraudit bruger syntetiske API-svar, og preview/consent/pending-fixtures erstatter ikke fuld integrationstest. Ingen målt forbedring i konvertering, omsætning eller faktisk brugerhastighed foreligger.

LEVERANCE
Opdatér planen med rettet/verificeret/blokeret/eksperiment. Giv konkrete fund, ændrede filer, testresultater, før-/efterlinks, resterende beslutninger og lokal URL. Gennemfør alle sikre, afgrænsede rettelser og gentest dem. Deploy ikke, gennemfør ingen rigtige betalinger/kundehenvendelser, og udfør ingen destruktive ændringer.
```
