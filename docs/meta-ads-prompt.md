# Prompt til Claude i Chrome: lanceringskampagnen i Meta Ads Manager

Sådan bruges den: log ind på business.facebook.com i Chrome, åbn Ads Manager på den rigtige annoncekonto,
åbn Claude-udvidelsen og indsæt alt under stregen som første besked. Billederne ligger i
`work/ads/final/` (lav dem igen med `node scripts/ads-concepts.mjs`, hvis eksemplerne eller teksterne ændrer sig).

Forudsætning, som Claude ikke kan klare for dig: annoncekontoen har en betalingsmetode, Facebook-siden
"Billedearv" findes, og du er admin på Business Manager. Pixel og Conversions API er endnu ikke tændt på
sitet, derfor oprettes alt **pauset** og publiceres først, når Test Events viser eventene.

---

Du er performance marketer og arbejder i min Meta Ads Manager i denne browser. Du skal oprette
lanceringskampagnen for **Billedearv** (billedearv.dk). Alt herunder er fakta om produktet; find ikke selv på
flere, og skriv ikke noget i en annonce, som ikke står på landingssiden.

## Produktet

- Billedearv restaurerer et gammelt familiebillede og sender det hjem i ramme. Kunden tager et foto af
  billedet med telefonen, ser resultatet på skærmen efter et par minutter, og beslutter først derefter.
  Det koster ikke noget at se resultatet. Bestiller kunden ikke, slettes billedet automatisk efter 30 dage.
- Priser i ramme med glas, passepartout, emballage og fri fragt: 30×40 cm 599 kr., 40×50 cm 799 kr.,
  50×70 cm 999 kr. Ekstra eksemplar af samme billede 349 kr. Sort eller egetræsramme.
- Lanceringstilbud til og med 30. september 2026: det første ekstra eksemplar er med i pakken uden
  beregning (værdi 349 kr.). Betingelsen skal altid stå sammen med ordet gratis.
- Levering inden 10 hverdage efter kundens ja. 21 dages fuld fortrydelse.
- Sælger: MIYO Solutions, Vemmelev, CVR 46300831. Kontakt: hej@billedearv.dk. Der er intet telefonnummer.
- Landingsside: https://billedearv.dk/ . Første skridt for kunden er knappen, der åbner upload.
- Målgruppe: danskere 45 til 70 år, som har forældrenes eller bedsteforældrenes billeder liggende i en
  skuffe. Gaveanledningen (mors dag, fødselsdag, bryllupsdag) er stærkere end "restaurering" som ord.
- Eksempelbillederne er restaureringer af generede originaler; restaureringen er ægte, personerne er ikke
  kunder. Skriv derfor aldrig "en kundes billede" eller opdigtede navne.

## Hårde regler

1. **Publicér intet aktivt.** Kampagne, annoncesæt og annoncer oprettes som kladde eller pauset. Stop før
   knappen "Udgiv"/"Publish", tag et screenshot og vent på mit ok. Jeg trykker selv.
2. Rør ikke betalingsmetoder, kontoindstillinger, eksisterende kampagner eller Business Manager-roller.
   Accepter ingen vilkår. Indtast aldrig kort, adgangskoder eller tokens.
3. Skriv **aldrig en access token, secret eller nøgle i chatten**. Pixel-ID og domæne-verifikationsstreng
   er ikke hemmelige og må gerne skrives.
4. Tekstregler: prisen skrives altid "fra 599 kr.", aldrig "599 kr." alene. Ordet "gratis" kun om det
   ekstra eksemplar og altid med betingelsen; om previewet skrives "det koster ikke noget at se".
   Ingen jul eller "inden jul" før 14. november. Ingen opdigtede kunder, citater, stjerner, anmeldelser
   eller tal som "1.000 glade kunder". Ingen nedtælling, "kun i dag" eller "få tilbage". Led ikke med
   ordet AI. Dansk, du-form, korte sætninger, ingen udråbstegn i stribe, ingen emojis.
5. Slå alle **Advantage+ creative-forbedringer fra** (billedforbedring, tekstvarianter, musik, 3D). Billederne
   må ikke ændres af Meta.
6. Læs skærmen, før du udfylder et felt. Viser Meta en advarsel (pixel uden aktivitet, domæne ikke
   verificeret, manglende betalingsmetode), så stop og rapportér i stedet for at klikke videre.
7. Ét skridt ad gangen. Brug read_page og find frem for screenshots til at bekræfte, hvad der står i et
   felt, og tag et screenshot efter hver færdig fase.

## Fase 0: fundamentet (Events Manager og Business Settings)

Rapportér resultatet af hvert punkt i en tabel, før du går til fase 1.

1. **Pixel.** Events Manager → Data sources. Findes der en pixel/datasæt for Billedearv? Skriv Pixel-ID
   i chatten. Aktivitet er 0 nu, det er ventet: koden på sitet venter på ID'et.
2. **Domæne.** Business Settings → Brand safety and suitability → Domains. Er billedearv.dk verificeret?
   Hvis ikke: tilføj domænet, vælg metoden "Meta-tag", kopier kun `content`-værdien fra tagget og skriv
   den i chatten. Klik ikke "Verify" endnu; sitet skal først bygges med værdien.
3. **Conversions API.** Events Manager → pixelen → Settings → Conversions API → "Generate access token".
   Tokenen skal ind i Netlify uden at passere chatten: åbn en ny fane på app.netlify.com → sitet
   "billedearv" → Site configuration → Environment variables. Sæt `META_CAPI_TOKEN` til tokenen,
   `NEXT_PUBLIC_META_PIXEL_ID` til Pixel-ID og `META_DOMAIN_VERIFICATION` til domæneværdien.
   Spørg mig, før du gemmer. Gem, og bed mig om at udløse en ny deploy.
4. **Test Events.** Events Manager → Test events. Skriv testkoden (TESTxxxxx) i chatten; den skal i
   `META_TEST_EVENT_CODE`, mens vi tester, og fjernes bagefter.
5. **Custom conversion.** Events Manager → Custom conversions → Create. Datakilde: pixelen. Regel:
   custom event `PreviewShown` (sitet sender den fra browser og server med samme event_id). Navn:
   `PreviewShown`. Kategori: View content. Ingen værdi. Er `PreviewShown` ikke på listen endnu, fordi
   pixelen ikke har sendt den, så opret den midlertidigt som "URL contains `/p/`" og notér i rapporten,
   at reglen skal skiftes til eventet, når Test Events har vist det.
6. **Prioritering.** Events Manager → pixelen → Aggregated Event Measurement / Web events configuration:
   Purchase > InitiateCheckout > PreviewShown > ViewContent.
7. **Ads Library.** Søg "billedrestaurering" og "gamle billeder" med land Danmark. Notér i to linjer,
   hvad konkurrenterne lover og til hvilken pris. Brug det ikke i teksterne; det er til min orientering.

## Fase 1: kampagnen

- Køb: Auktion. Formål: **Salg** (Sales).
- Navn: `META_Sales_DK45-70_Lancering_2026-09`
- Advantage+ kampagnebudget: fra. Budgettet sættes på annoncesættet.
- Særlige annoncekategorier: ingen. A/B-test: nej.

## Fase 2: annoncesættet

- Navn: `META_Sales_DK45-70_Broad_PreviewShown`
- Konverteringssted: Website. Pixel: Billedearv. Konverteringshændelse: den brugerdefinerede konvertering
  `PreviewShown`. Findes den ikke, vælg `ViewContent` og skriv i rapporten, at den skal skiftes.
- Budget: **150 kr. om dagen**. Jeg hæver selv, når tallene er der.
- Tidsplan: start kl. 09.00 dagen efter jeg publicerer. Ingen slutdato.
- Målgruppe: Danmark. Alder 45 til 65+. Alle køn. Ingen interesser, ingen lookalikes endnu: billederne
  er målretningen. Bruger Ads Manager Advantage+ audience, så sæt alderen som hård grænse under
  "Audience controls", hvis feltet findes.
- Placeringer: Advantage+ placeringer, men **fravælg Audience Network** og Messenger. Facebook Feed,
  Instagram Feed og Stories/Reels er nok.
- Optimering: Conversions. Budstrategi: Highest volume, ingen omkostningsgrænse. Attribution: 7 dages
  klik, 1 dags visning.

## Fase 3: seks annoncer, seks købsmotiver

Fælles for alle seks:

- Format: enkelt billede. Identitet: Facebook-siden Billedearv, og Instagram-kontoen, hvis den findes.
  Multi-advertiser ads: fra. Alle Advantage+ creative-valg: fra.
- Billederne ligger i `C:\Users\mo\Desktop\Billede\work\ads\final\` (lavet af `node scripts/ads-concepts.mjs`).
  Pr. annonce: `<koncept>-1080x1350.jpg` til feed og Stories (4:5) og `<koncept>-1080x1080.jpg` til
  1:1-placeringer. Overskrift, tekst, knap og "I ramme fra 599 kr. inkl. fragt" sidder allerede i billedet.
  Upload 4:5-filen først, og vælg "Rediger pr. placering" for at give 1:1-filen til de placeringer, der
  kræver kvadrat, så Meta ikke beskærer selv.
- Website-URL: `https://billedearv.dk/`
- Feltet **URL-parametre** (ikke selve URL'en):
  `utm_source=facebook&utm_medium=cpc&utm_campaign=lancering-sep26&utm_content={{ad.name}}`
- Knap: "Få mere at vide" (Learn more). Ikke "Køb nu": første skridt koster ikke noget.
- Sprog: dansk. Ingen automatiske oversættelser.
- Hver annoncetekst har tre led i den rækkefølge: følelsen, den gratis prøve, det fysiske produkt med pris.
  Skriv aldrig "gratis" uden prisen i samme tekst.

### Annonce 1: `a-emotion` (billede: `a-emotion-1080x1350.jpg`)

Primær tekst:

> Så tydeligt har du ikke set hende i 60 år.
>
> Tag et foto af det gamle billede med mobilen, og se det restaureret gratis. Originalen bliver hjemme hos dig.
>
> Kan du lide resultatet, gennemgår vi ansigterne og sender det hjem i ramme med passepartout og glas – fra 599 kr. inkl. fragt. Du godkender, før vi printer.

Overskrift: `Se det restaureret gratis. I ramme fra 599 kr.`
Beskrivelse: `Du godkender ansigterne før print`

### Annonce 2: `b-produkt` (billede: `b-produkt-1080x1350.jpg`)

Primær tekst:

> Fra skuffen til væggen.
>
> Se restaureringen gratis. Kan du lide resultatet, får du det færdigt som print på mat fotopapir, i ramme med passepartout og glas – fra 599 kr. inkl. fragt.
>
> Restaurering, gennemgang af ansigterne, print, ramme, den digitale fil og levering er med. Ingen tillæg.

Overskrift: `Fra skuffen til væggen`
Beskrivelse: `Print, ramme, glas og fri fragt fra 599 kr.`

### Annonce 3: `c-gave` (billede: `c-gave-1080x1350.jpg`)

Primær tekst:

> Gaven, de ikke selv kan købe sig til.
>
> Tag et foto af mors og fars bryllupsbillede i smug, og se det restaureret gratis.
>
> Bestiller du, kommer det hjem i ramme fra 599 kr. inkl. fragt – til dig eller direkte til dem. Du godkender det færdige billede, før vi printer.

Overskrift: `Mors og fars bryllupsbillede. Tilbage på væggen.`
Beskrivelse: `I ramme fra 599 kr. inkl. fragt`

### Annonce 4: `d-ligne` (billede: `d-ligne-1080x1350.jpg`)

Primær tekst:

> Det skal stadig ligne hende.
>
> Restaureringen må ikke gøre bedstemor til en anden person. Derfor gennemgår vi ansigterne, før billedet går til print, og du godkender resultatet.
>
> Se restaureringen gratis først. I ramme fra 599 kr. inkl. fragt.

Overskrift: `Det skal stadig ligne hende`
Beskrivelse: `Du godkender ansigterne før print · fra 599 kr.`

### Annonce 5: `e-original` (billede: `e-original-1080x1350.jpg`)

Primær tekst:

> Du sender aldrig originalen.
>
> Tag blot et foto med mobilen. Dit gamle familiebillede bliver hjemme hos dig, og du ser restaureringen gratis på skærmen, før du beslutter noget.
>
> Vil du have det hjem i ramme, koster det fra 599 kr. inkl. fragt. Du godkender, før vi printer.

Overskrift: `Originalen bliver hjemme hos dig`
Beskrivelse: `Se restaureringen gratis · i ramme fra 599 kr.`

### Annonce 6: `f-tilbud` (billede: `f-tilbud-1080x1350.jpg`) – kun mens tilbuddet er aktivt

Scriptet laver kun denne fil, mens lanceringstilbuddet er aktivt i `lib/config.ts` (til og med 30. september
2026). Findes filen ikke, springes annoncen over.

Primær tekst:

> Lanceringstilbud til og med 30. september: 2 indrammede eksemplarer fra 599 kr.
>
> Ét til dig. Ét til den, der også husker det. Det første ekstra eksemplar af samme billede, størrelse og ramme er gratis.
>
> Se restaureringen gratis først, og bestil kun, hvis du kan lide resultatet. Fri fragt. Du godkender, før vi printer.

Overskrift: `2 indrammede eksemplarer fra 599 kr.`
Beskrivelse: `Til og med 30. september · fri fragt`

## Fase 4: gennemgang, og stop

1. Åbn forhåndsvisning af alle annoncer i mobil-feed og i Stories. Screenshot af hver. Tjek, at
   overskriften ikke afkortes, at billedet ikke beskæres, og at "FØR"/"EFTER" begge kan læses.
2. Klik forhåndsvisningens link til landingssiden. Den åbnede URL skal indeholde
   `utm_source=facebook` og `utm_content=` efterfulgt af annoncenavnet.
3. Rapportér i en tabel: kampagne, annoncesæt og hver annonce med ID, status (kladde/pauset), og en
   liste over alt, der stadig mangler (typisk: custom conversion venter på eventet, domæne venter på
   deploy).
4. **Stop her. Publicér ikke.**

## Efter jeg har publiceret (send som ny besked, når jeg siger til)

1. **Test Events.** Åbn `https://billedearv.dk/?utm_source=facebook&utm_medium=cpc&utm_campaign=test`
   i en fane, accepter cookiebanneret, og se i Events Manager → Test events, at `PageView` og
   `ViewContent` kommer. Upload et testbillede via knappen og vent på previewet: `PreviewShown` skal
   komme fra både Browser og Server med samme event_id og markeres "Deduplicated". Kør ikke en
   betaling; det gør jeg selv.
2. **Custom conversion.** Skift reglen til eventet `PreviewShown`, hvis den blev oprettet som URL-regel.
3. **Daglig tjekliste, dag 1 til 7**, rapporteret som én tabel pr. dag: forbrug mod budget, CPM, CTR
   (link), pris pr. `PreviewShown`, frekvens, og hvad tabellen "Kilder · 30 dage" i billedearv.dk/admin
   viser pr. `utm_content` (jeg logger ind selv og giver dig skærmen).
4. **Beslutningsregler.** Rør intet de første 3 dage eller under 2.000 visninger pr. annonce. Derefter:
   en annonce med link-CTR under halvdelen af den bedste sættes på pause. Efter 7 dage med stabil pris pr.
   `PreviewShown`: hæv budgettet 20 %, og vent 3 dage før næste forhøjelse. Foreslå altid, gør det aldrig
   uden mit ok.

---

## Værktøjer, Claude i Chrome skal bruge

| Til | Værktøj |
| --- | --- |
| Se hvilke faner der er åbne, skifte mellem Ads Manager, Events Manager og Netlify | `tabs_context`, `tabs_create`, `navigate` |
| Læse et skærmbillede som tekst, finde et felt ved navn | `read_page`, `find` (foretrækkes over screenshots til at bekræfte feltværdier) |
| Udfylde tekstfelter, vælge i dropdowns, sætte flueben | `form_input` |
| Klikke, skrive, scrolle, tage screenshots | `computer` |
| Uploade annoncebillederne fra disken | `file_upload` med stien til `work/ads/creatives/…` |
| Fejlsøge, hvis Meta hænger eller afviser en upload | `read_console_messages`, `read_network_requests` |
| Bekræfte UTM på landingssiden | `navigate` til forhåndsvisningens link, derefter `read_page` |

Meta-flader, der indgår: Ads Manager (kampagne, annoncesæt, annoncer), Events Manager (pixel, Conversions
API, Test events, Custom conversions, Aggregated Event Measurement), Business Settings → Domains, Ads
Library (research). Uden for Meta: Netlify → Environment variables.

Det, Claude ikke må gøre, og som du gør selv: tilføje betalingsmetode, acceptere vilkår, løse CAPTCHA,
trykke Udgiv, gennemføre testkøbet og lægge `META_TEST_EVENT_CODE` i og ud af Netlify.
