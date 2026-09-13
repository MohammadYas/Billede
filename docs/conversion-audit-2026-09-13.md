# Billedearv: købsflow og konvertering, 13. september 2026

Gennemgået med Composio (Meta Ads, Stripe og Supabase), den levende butik i browseren og en lokal produktionsbuild. Baseline er commit `67e7426`, publiceret 12. september kl. 19:37 UTC. Første runde blev publiceret som `b2fe41c` den 13. september kl. 09:42 UTC. Fortsættelsen nedenfor retter checkout-lagring og preview-måling; dens publiceringsstatus kontrolleres hos Netlify.

## Hvad tallene faktisk viser

Supabase blev aflæst omkring 09:30 UTC den 13. september. I en 72-timers observationsperiode blev sessioner med `utm_source=pwtest` udelukket som hele sessioner, også hvis enkelte hændelser i samme session manglede testmarkeringen. Annoncesessioner er identificeret med `utm_source=facebook` eller `fbclid`.

| Hændelse | Nye annoncesessioner i seneste 12 timer | Tidligere annoncesessioner i 72-timersperioden |
|---|---:|---:|
| Forside åbnet, PageView | 17 | 115 |
| Upload åbnet, FlowOpened | 2 | 24 |
| Billede valgt, UploadStarted | 2 | 12 |
| Restaurering startet, ProcessingStarted | 2 | 12 |
| Billede genereret, PreviewShown | 2 | 12 |
| PreviewViewed registreret | 2 | 2 |
| Produktvalg registreret | 0 | 1 |
| CheckoutClicked registreret | 0 | 0 |
| InitiateCheckout registreret | 0 | 0 |
| Purchase registreret | 0 | 0 |

De to kolonner indeholder tilsammen **14 kampagnemarkerede sessioner med et genereret billede** (18 genereringer). En efterfølgende kontrol af hele historikken gav 15 sådanne sessioner og 19 genereringer. Kampagnens UTM er grundlaget for tilknytningen; det er ikke Metas tal for landingssidevisninger. Ejeren har oplyst, at mange besøg er tests. De 17 nye PageView-sessioner må derfor ikke omtales som 17 verificerede annoncebesøgende eller bruges til et sikkert estimat af frafald før upload. Markeringen `pwtest` fjerner kendte tests, men identificerer ikke alle umærkede tests.

Der er dokumenterede genereringer at undersøge videre fra, men de nye hændelser blev først indført 12. september; tidligere `PreviewViewed` og `CheckoutClicked` kan derfor ikke sammenlignes direkte med ældre besøg. To nyere previews er ikke tilstrækkeligt til at afgøre, om priserne 99/250 kr. virker. Tallene er unikke sessioner pr. hændelse inden for samme kohorte, ikke bevis for, at hver enkelt hændelse skete i den viste rækkefølge.

Stripe returnerede 54 Checkout-sessioner oprettet siden 9. september ved første aflæsning: alle udløbet og ubetalt, og ingen yderligere sider. De omfatter mange automatiske tests og er **ikke 54 tabte kunder**. De indlæste sessioner havde 99-, 250- og rammeprodukter. Butikken bruger inline `price_data`; en tom liste over faste Stripe-priser er derfor ikke en fejl. Der blev ikke fundet betalte nye ordrer i den seneste 72-timersperiode. Det siger ikke, at butikken aldrig har haft en betalt ordre.

## Rettet i denne ændring

1. **De billigere produkter blev næsten skjult før preview.** Forsiden og upload gentog rammeprisen, mens 99/250 kr. først stod i en lukket FAQ og langt nede på resultatsiden. Begge priser fremgår nu ved forsidens primære handling, i upload og ved næste trin efter preview. Priserne kommer fra samme aktiveringsflag og prisopsætning som resten af butikken. Hovedbudskab, rammepris og lanceringstilbud er bevaret.
2. **Næste trin efter preview viste først endnu et rammebillede.** Reproduceret på 390×780: knappen landede på rammevisualiseringen; de billigere valg lå under den. Genvejen går nu til selve produktvalget, og trinnet hedder produktvalg, når alternativerne er aktive. Alle tre priser var synlige efter genvejen ved 390×780 i den lokale build.
3. **Retur fra løst-print-checkout gav et inkonsistent rammevalg.** En printordre har format 20×30. Ved genåbning og skift til ramme viste regnestykket 599 kr., men ingen rammestørrelse var markeret, og rammevisualiseringen kunne mangle. Den lokale størrelse normaliseres nu til en størrelse, der kan købes med ramme. Printet beholder sine egne 20×30-mål og sin egen pris i prisberegningen. Fejlen blev reproduceret i browseren og med en regressionstest.
4. **Takkesiden beskrev rammelevering til de nye produkter.** Digitale købere fik tekst om print, ramme og fragt. Købere af løst print fik en rammevisualisering og en rammeleveringsplan. Takkesiden bruger nu den gemte produkttype til billedet, tidslinjen, leveringen og tilbuddet om at sende endnu et billede ind. Digitalt køb lover fil efter godkendelse; løst print lover print uden ramme.
5. **Meta fik stadig forkert produkt ved serverhændelser og Purchase.** Tidligere rettelser dækkede produktvalg og checkout i browseren, men CAPI og browserens Purchase beskrev stadig de små produkter som indrammede størrelser. De sender nu `digital` eller `print`; rammeproduktets eksisterende identifikation bevares. Beløb, samtykke og deduplikerings-id er bevaret. Produkttypen læses fra ordren, også hvis et tilbud senere slås fra.
6. **Viewport-testen manglede testmarkering.** Den påfører nu `utm_source=pwtest`, så dens besøg ikke optræder som almindelig trafik.

## Væsentlige åbne punkter

**Meta optimerer efter en anden hændelse end annoncesættets navn antyder.** Annoncesættet `META_Sales_DK45-70_Broad_PreviewShown` var aktivt, men `promoted_object.custom_event_type` var `CONTENT_VIEW`. `HeroViewContent.tsx` sender ViewContent fra forsiden, og resultatsiden sender også ViewContent. Opsætningen skelner derfor ikke mellem de to steder som optimeringsmål. Kampagne, annoncer, budget og mål er ikke ændret i denne opgave. En ændring bør være et særskilt, kontrolleret kampagneforsøg efter kontrol af hændelsernes levering og volumen. [Annoncesættet i Ads Manager](https://adsmanager.facebook.com/adsmanager/manage/adsets?act=2034135650633821&selected_adset_ids=120249864995960069).

De aktive annoncer var `FINAL_COLD_01` og `FINAL_COLD_03`; de øvrige tre var pauset. Kampagnebudgettet var 150 kr./dag. Den returnerede Meta-rapport med slutdato **12. september** viste 473,30 kr. i forbrug og 164 linkklik. Det er ikke et løfte om det aktuelle forbrug senere den 13. september. Meget få landingssidevisninger blev tilskrevet i Meta; det kan ikke bruges som bevis for, at alle øvrige klik aldrig indlæste sitet, da samtykke og attribution påvirker målingen.

**MobilePay mangler i den kontrollerede betalingsopsætning.** De 54 sessioner havde `card`, `klarna`, `amazon_pay` og `link`; MobilePay var ikke blandt dem. Browseren viste kort, Klarna og Amazon Pay. Tilføjelse er et relevant separat forsøg, men effekten er ikke dokumenteret af disse data. Stripe beskriver aktivering i Dashboard og oplyser en dansk medlemspris på 35 kr./måned samt transaktionsgebyrer; derfor er tjenesten ikke aktiveret som en skjult del af kodeændringen. Apple Pay/Google Pay afhænger af browser og enhed. [Stripe: MobilePay](https://docs.stripe.com/payments/mobilepay).

**Produktbevis og virksomhedsoplysninger er stadig ufuldstændige.** Der mangler rigtige fotos af rammen, pakken og det løse print; siden viser visualiseringer. Pladsen er allerede implementeret i `public/produkt/README.md`. `assets/founder/founder.md` mangler stadig bekræftet gadenavn og husnummer. Der er ikke opfundet billeder, anmeldelser, adresse eller andre tillidssignaler. [Aktuelle handelsbetingelser](https://billedearv.dk/handelsbetingelser).

**Omsætning er ikke dækningsbidrag.** Der er ikke verificerede kostpriser for print, emballage, fragt, billedgenerering og manuelt arbejde i materialet. Prisniveauerne er bevaret. En prisnedsættelse eller større annoncebudget bør ikke bedømmes alene på antal køb.

## Fortsat gennemgang efter ejerens præcisering af testtrafikken

**Begge aktive annoncer er læst i den indloggede Meta-browser.** `FINAL_COLD_01` starter med “Har du også sådan et billede?”, og `FINAL_COLD_03` med “Så tydeligt har du ikke set hende i 60 år.” Begge lover gratis restaureringspreview og indrammet levering fra 599 kr. inkl. fragt. De nye købsmuligheder supplerer derfor det eksisterende annonceløfte; ingen annoncetekster, statusser, budgetter eller optimeringsmål er ændret. Den viste browserrapport sluttede 12. september. Composio-kontrollen for 6.–13. september viste 543,96 kr. og 182 linkklik; dagsdelen for den 13. viste 70,66 kr. og 18 linkklik. De 4 tilskrevne landingssidevisninger er et særskilt Meta-mål og erstatter ikke de dokumenterede genereringer.

**Checkout overskrev produkt og prisgrundlag ved anden lagring.** Før Stripe-oprettelsen blev det valgte produkt og den beregnede pris gemt korrekt. Efter oprettelsen blev `payment_session_id` gemt sammen med en ældre kopi af `preview_meta`, hvilket fjernede den nye prissnapshot og kunne genetablere et tidligere produkt. En isoleret test reproducerede digitalt køb gemt som rammeprodukt og en manglende prissnapshot. Anden lagring bygger nu på den netop opdaterede ordre. Testen læser den endelige ordre efter begge lagringer for alle tre produkter, også uden et forudgående `/choose`-kald. Den tidligere test kontrollerede kun, at en snapshot var skrevet på et tidspunkt, og kunne derfor overse overskrivningen. En læsning af ordrer med checkout oprettet siden 9. september fandt 18 ordrer uden snapshot, alle `PREVIEW_READY`; mange er markerede tests. Ingen historiske kundedata er ændret.

**PreviewViewed kræver nu det indlæste resultat og en aktiv fane.** Originalbilledets indlæsning kunne før udløse hændelsen, selv om resultatet stadig ventede eller fejlede. Målingen venter nu på dekodning af `img.after`, mindst 50 % synlighed af billedfeltet i ét sekund og en synlig fane. Den følger også skift mellem farve og sort-hvid. Nye hændelser får `preview_measurement: 2`, som den begrænsede metadatafiltrering bevarer. Et billede under 50 %, et fejlet resultat eller en skjult fane tæller ikke. Den eksisterende `ViewContent` og halvtimes-deduplikering bevares. Hændelsen måler billedfeltets tilgængelighed, ikke menneskelig opmærksomhed eller hvor meget restaurering slideren aktuelt viser. Den beviser ikke alene købsinteresse.

## Verifikation og begrænsninger

Fortsættelsen er kontrolleret med 88 beståede unit-tests, en bestået produktionsbuild, 10 isolerede browserscenarier fordelt på Chromium og WebKit samt alle 12 viewport-kontroller på forside og preview. Mobilens produktgenvej blev desuden kontrolleret visuelt ved 390×780; alle tre priser var synlige, og browseren viste ingen konsolfejl. Den uafhængige kodegennemgang fandt ingen handlingskrævende problemer. Checkout-testene sender ingen rigtige betalinger, og de isolerede preview-tests foretager ingen eksterne writes.

Verifikationen af første runde:

- `npm test`: 86 tests bestået. Nye regressionstests fejlede først på de reproducerede fejl og bestod efter rettelserne; en separat Purchase-test kontrollerer produkttype, beløb og deduplikerings-id.
- `npm run build`: bestået. Buildens advarsel om localhost gælder den lokale opsætning. Netlify publicerer selv med produktionens miljøvariabler.
- Viewport-test på forside og resultatside ved 375, 390, 430, 768, 1024 og 1280 pixels: alle 12 kontroller bestået, ingen vandret overflow eller små trykmål i de kontrollerede tilstande. Manuel kontrol ved 360×560 og 390×780 supplerer testen.
- Ægte upload af et allerede offentligt eksempelbillede på live-sitet, restaurering, før/efter, produktskift, Stripe-checkout og retur fra checkout afprøvet. Digital checkout viste 99 kr. uden leveringsadresse. Print-checkout fra den lokale build viste 250 kr., 20×30 uden ramme og dansk leveringsadresse.
- Takkesiderne blev verificeret med isolerede betalte fixtures; der blev ikke gennemført en betaling, sendt kundemails eller ændret kunders eksisterende ordrer. Testordren er markeret `pwtest`. Testsessioner udløber uden betaling.
- Uafhængig kodegennemgang fandt ingen handlingskrævende problemer i rettelserne.
- En fysisk iPhone, Facebooks faktiske app-browser, 3-D Secure, bankbetaling, efterfølgende refundering og fysisk levering er ikke testet. Der er ikke målt et konverteringsløft af de nye rettelser endnu.

Næste evaluering bør sammenligne nye annoncesessioner efter publiceringen med en tydeligt afgrænset tidligere periode: uploadrate, registrerede previews, produkttype ved checkout, faktisk betalt beløb og dækningsbidrag. Bevar testfiltrering og sammenlign ikke gamle og nye hændelser, som om de havde eksisteret lige længe.
