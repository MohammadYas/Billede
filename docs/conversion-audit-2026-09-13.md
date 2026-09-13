# Billedearv: købsflow og konvertering, 13. september 2026

Gennemgået med Composio (Meta Ads, Stripe og Supabase), den levende butik i browseren og en lokal produktionsbuild. Baseline er commit `67e7426`, publiceret 12. september kl. 19:37 UTC. Rapportens rettelser er ændringerne i dette commit; publiceringsstatus skal kontrolleres hos Netlify.

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

Det største observerede frafald ligger før upload, og de to nyeste preview-sessioner gik ikke videre til produktvalg. To previews er ikke tilstrækkeligt til at afgøre, om priserne 99/250 kr. virker. De nye hændelser blev først indført 12. september; tidligere `PreviewViewed` og `CheckoutClicked` kan derfor ikke sammenlignes direkte med ældre besøg. Tallene er unikke sessioner pr. hændelse inden for samme kohorte, ikke bevis for, at hver enkelt hændelse skete i den viste rækkefølge. Direkte trafik kan indeholde ejerens egne besøg.

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

**PreviewViewed har fortsat en målebegrænsning.** Koden godkender billedindlæsning, når et af før/efter-billederne er indlæst, og bruger `isIntersecting` frem for at kræve den angivne 50-procents andel i callbacken. Den er derfor et registreret preview-signal, ikke sikkert bevis for, at kunden så mindst halvdelen af det færdige resultat. Den måling bør strammes i en særskilt diagnosticering; den aktive ViewContent-hændelse er ikke omlagt her.

## Verifikation og begrænsninger

- `npm test`: 86 tests bestået. Nye regressionstests fejlede først på de reproducerede fejl og bestod efter rettelserne; en separat Purchase-test kontrollerer produkttype, beløb og deduplikerings-id.
- `npm run build`: bestået. Buildens advarsel om localhost gælder den lokale opsætning. Netlify publicerer selv med produktionens miljøvariabler.
- Viewport-test på forside og resultatside ved 375, 390, 430, 768, 1024 og 1280 pixels: alle 12 kontroller bestået, ingen vandret overflow eller små trykmål i de kontrollerede tilstande. Manuel kontrol ved 360×560 og 390×780 supplerer testen.
- Ægte upload af et allerede offentligt eksempelbillede på live-sitet, restaurering, før/efter, produktskift, Stripe-checkout og retur fra checkout afprøvet. Digital checkout viste 99 kr. uden leveringsadresse. Print-checkout fra den lokale build viste 250 kr., 20×30 uden ramme og dansk leveringsadresse.
- Takkesiderne blev verificeret med isolerede betalte fixtures; der blev ikke gennemført en betaling, sendt kundemails eller ændret kunders eksisterende ordrer. Testordren er markeret `pwtest`. Testsessioner udløber uden betaling.
- Uafhængig kodegennemgang fandt ingen handlingskrævende problemer i rettelserne.
- En fysisk iPhone, Facebooks faktiske app-browser, 3-D Secure, bankbetaling, efterfølgende refundering og fysisk levering er ikke testet. Der er ikke målt et konverteringsløft af de nye rettelser endnu.

Næste evaluering bør sammenligne nye annoncesessioner efter publiceringen med en tydeligt afgrænset tidligere periode: uploadrate, registrerede previews, produkttype ved checkout, faktisk betalt beløb og dækningsbidrag. Bevar testfiltrering og sammenlign ikke gamle og nye hændelser, som om de havde eksisteret lige længe.
