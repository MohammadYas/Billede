# Landing-page-brief fra ejeren, 2026-09-08 (PARKERET: "kun billeder, rør ikke hjemmesiden lige nu")

Ejerens brief i kort form, så den kan udføres senere uden at starte forfra. Mål: flere uploads, flere
køb efter preview, tillid, forståelse af prisen fra 599 kr., match mellem Meta-annoncer og landingsside.
Intet visuelt redesign for redesignets skyld. Genbrug design-system, behold funktionalitet og events.

## Facts, verificeret i koden 2026-09-08 (brug dem, opfind ikke mere)

- Menneskelig gennemgang findes: handelsbetingelser ("gennemgås manuelt, før den printes"), admin
  sender godkendelsesmail, kunden godkender før print. **Betaling sker FØR gennemgangen.** Skriv derfor
  aldrig, at kunden betaler efter endelig godkendelse. Brug: "Se en gratis prøve først. Bestil kun, hvis du
  kan lide resultatet." Ikke: "Du betaler først, når du har set det" (tvetydig).
- Refusion: fuld refusion indtil kunden har godkendt; "Ligner det ikke, får du hele beløbet tilbage"
  (vilkår). Lovpligtig fortrydelsesret 14 dage; auto-refusion efter 21 dage uden svar på godkendelsesmail.
  **"21 dages fortrydelse" er IKKE et vilkår** og må ikke bruges.
- Preview-tid: copy siger "omkring halvandet minut"; pipeline ~40 s, timeout 90 s. "ca. 90 sekunder" ok.
- Med i prisen (599/799/999 kr.): restaurering, print på mat fotopapir, ramme sort/eg, passepartout, glas,
  digital fil i høj opløsning efter godkendelse, fri fragt i Danmark. Levering inden 10 hverdage efter ja.
- Originalen sendes aldrig (FAQ findes). Upload slettes efter 30 dage uden bestilling, 90 dage efter levering.
- Dansk virksomhed: MIYO Solutions, Vemmelev, CVR 46300831 (gadenavn mangler i founder.md).
- Lanceringstilbud: `CONFIG.campaignEndDate` = 2026-09-30 (env CAMPAIGN_END_DATE), aktivt pr. 2026-09-08,
  første ekstra eksemplar af samme billede/størrelse/ramme gratis. Datoen kommer fra config, aldrig hårdkodet.
- Eksemplerne er genererede originaler, ægte restaurering, ikke kunder (`eksempler.syntheticNote`).
- Tracking (Meta pixel + CAPI + server-log, `lib/analytics/client.ts`): PageView, ViewContent (hero),
  FlowOpened (= klik på upload-CTA), UploadStarted, ProcessingStarted, UploadCompleted, PreviewShown,
  AddToCart, InitiateCheckout, Purchase. Alle krævede funnel-events findes. Mulig lille tilføjelse:
  `source` (hero/nav/sticky/offer/closing) på FlowOpened via `gf:open`-eventets detail.
- CTA-mekanik: `OpenFlowButton` sender `gf:open`; `UploadFlow` åbner sheetet. Primær CTA-tekst er
  `CTA_VARIANTS` i lib/copy.ts (default C). Hero-slideren er `Compare mode="fade"` (ægte interaktiv: tryk
  skifter). Wipe-slideren (`BeforeAfter`) bruges kun på /p. Ejerens tidligere beslutning: fade på forsiden,
  fordi ældre besøgende ikke forstår et håndtag.
- Tests, der rører forsiden: `tests/e2e-flow.browser.mjs` klikker `.hero-cta button`;
  `tests/viewport.browser.mjs` måler overløb, små tryk og bjælke-dækning ved 375–1280 px.

## Ejerens punkter (prioriteret)

P0: (1) ny hero: eyebrow "SE RESULTATET, FØR DU KØBER", H1 "Få det gamle familiebillede tilbage.",
body "Tag et foto med mobilen. Se det restaureret gratis på ca. 90 sekunder. Kan du lide resultatet,
gennemgår vi det og sender det hjem til dig i ramme fra 599 kr. inkl. fragt.", CTA "Se mit billede
restaureret gratis", trust-linje "Du sender aldrig originalen · Du godkender før print · Fri fragt";
pris synlig over folden; CTA → eksisterende upload-flow; før/efter fortsat heltet. (2) "Originalen bliver
hjemme hos dig." som callout tidligt, i FAQ og tæt på upload-CTA. (3) korrekt betalings-/godkendelsescopy.
(4) mobil 320–430 px: H1 ikke for stor, stor CTA, pris og gratis-preview uden scroll, ingen mikrotekst,
intet dækket af sticky-bar, ingen layout shifts.

P1: (5) sektion "Fra skuffen til væggen." lige efter hero/proces: gammelt foto → restaureret → print →
indrammet; hvad de 599 kr. dækker (kun verificerede punkter). (6) "Sådan foregår det" i 3 trin: "Tag et
foto" / "Se restaureringen gratis" / "Godkend og få det hjem i ramme" med ejerens tekster. (7) "Det skal
stadig ligne dem." med tæt før/efter af SAMME ansigt (examples.json har `detail`-crops pr. par). (8)
trust-blok ved pris/bestilling: dansk virksomhed, CVR, fri fragt, godkendelse før print, refusionsregel,
sletning efter 30 dage. (9) FAQ: original, pris, gratis prøve, hvornår betaler jeg, ansigt ligner ikke,
revner/folder/farver, uskarpt (kan ikke opfindes), hvad får jeg fysisk, digital fil, sletning,
leveringstid, godkendelse før print.

P2: (10) tilbud som "2 indrammede eksemplarer fra 599 kr." + "Ét til dig. Ét til den, der også husker
det." + lille forklaring + udløbsdato fra config. (11) events: evt. `source` på FlowOpened. (12)
performance/accessibility.

Copy-regler: undgå "Som de var", "Skarpt igen" (medmindre originalen var skarp), ingen fake social
proof, ingen opfundne garantier, ingen scarcity, ingen AI-løfter om historisk korrekthed. Én H1, H2 pr.
sektion, alt-tekster. Ét CTA-ordvalg på hele siden ("Se mit billede restaureret gratis" / kort "Se mit
billede gratis"). Design: varmt, dansk, roligt, premium; fotos er helten.

Acceptkriterier: en ny besøgende kan på 5 sekunder svare: hvad er det, hvad skal jeg gøre, kan jeg se
resultatet før køb, hvad koster det, skal jeg sende originalen, hvad får jeg for 599 kr., hvordan ved
jeg at ansigtet ligner. Efter implementering: `npm test`, `npm run build`, viewport-test, alle CTA'er
virker, tilbud/priser/vilkår stemmer, kort rapport.
