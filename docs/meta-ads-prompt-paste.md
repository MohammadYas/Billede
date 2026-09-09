
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
- Levering inden 10 hverdage efter kundens ja. Fuld refusion, indtil kunden har godkendt det færdige
  billede; derefter 14 dages fortrydelsesret efter loven. Skriv aldrig "21 dages fortrydelse".
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
4. Tekstregler: prisen skrives altid "fra 599 kr.", aldrig "599 kr." alene. "Gratis" må bruges om
   previewet, men aldrig uden "fra 599 kr." i samme tekst. Om det ekstra eksemplar altid med betingelsen.
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

## Fase 3: annoncerne (kun billeder ved launch)

Filerne ligger på denne computer i `C:\Users\mo\Desktop\Billede\work\ads\final\`. Hver annonce har tre
filer: `<navn>-4x5.jpg` (feed), `<navn>-1x1.jpg` (kvadrat) og `<navn>-9x16.jpg` (Stories/Reels).

**Upload:** brug din egen fil-upload-funktion på Metas upload-felt med den fulde sti, fx
`C:\Users\mo\Desktop\Billede\work\ads\final\memory-4x5.jpg`. Upload 4:5 først, og brug "Rediger pr.
placering"/"Crop" til at give 1:1 til de kvadratiske placeringer og 9:16 til Stories/Reels, så Meta ikke
beskærer selv. **Kan du ikke uploade filer** (fil-dialogen åbner ikke, eller uploaden fejler to gange), så
spring ikke annoncen over og vælg ikke et andet billede: gør alt andet i annoncen færdigt (navn, tekster,
URL, parametre, knap, placeringsindstillinger), gem som kladde hvis Meta tillader det uden billede, og
skriv i slutrapporten præcis hvilke filer jeg selv skal uploade til hvilke annoncer. Kan annoncen slet
ikke gemmes uden billede, så lad den stå åben i editoren, tag et screenshot og skriv alle tekster til
den i rapporten, så jeg kun mangler at klikke Upload.

Fælles for alle annoncer:

- Format: enkelt billede. Identitet: Facebook-siden Billedearv og Instagram-kontoen, hvis den findes.
  Multi-advertiser ads: fra. Alle Advantage+ creative-valg: fra (ingen beskæring, musik, tekst, forbedring).
- Website-URL: `https://billedearv.dk/`
- Feltet **URL-parametre** (ikke selve URL'en):
  `utm_source=facebook&utm_medium=cpc&utm_campaign=lancering-sep26&utm_content={{ad.name}}`
- Knap: "Få mere at vide". Sprog: dansk, ingen automatiske oversættelser.
- Annoncenavn = filnavnets første del (fx `memory`), så `utm_content` matcher.
- Primærteksten begynder med hooket, ikke med brandet. "Gratis" står aldrig uden "fra 599 kr." i samme
  tekst. Ingen refusion, garanti eller "problemer" i annoncesæt A.

### Annoncesæt A (koldt, det brede sæt fra fase 2): fem annoncer

**`memory`** – `memory-4x5.jpg` / `memory-1x1.jpg` / `memory-9x16.jpg`

> Har du også sådan et billede?
>
> Tag et foto af det med mobilen, og se det restaureret gratis. Kan du lide resultatet, sender vi det hjem i ramme fra 599 kr. inkl. fragt.

Overskrift: `Se dit eget restaureret gratis` · Beskrivelse: `I ramme fra 599 kr.`

**`gift`** – `gift-4x5.jpg` / `gift-1x1.jpg` / `gift-9x16.jpg`

> Hvad giver man sine forældre, når de allerede har alt?
>
> Lån bryllupsbilledet et øjeblik, tag et foto med mobilen, og se det restaureret gratis. I ramme fra 599 kr. inkl. fragt – til dig eller direkte til dem.

Overskrift: `Se resultatet gratis først` · Beskrivelse: `I ramme fra 599 kr.`

**`reveal`** – `reveal-4x5.jpg` / `reveal-1x1.jpg` / `reveal-9x16.jpg`

> Så tydeligt har du ikke set hende i 60 år.
>
> Tag et foto af det gamle billede med mobilen, og se det restaureret gratis. Kan du lide resultatet, sender vi det hjem i ramme fra 599 kr. inkl. fragt.

Overskrift: `Se dit eget restaureret gratis` · Beskrivelse: `I ramme fra 599 kr.`

**`original`** – `original-4x5.jpg` / `original-1x1.jpg` / `original-9x16.jpg`

> Du skal ikke sende originalen.
>
> Et foto med mobilen er nok. Se restaureringen gratis på skærmen. I ramme fra 599 kr. inkl. fragt.

Overskrift: `Et foto med mobilen er nok` · Beskrivelse: `I ramme fra 599 kr.`

**`physical`** – `physical-h2-4x5.jpg` / `physical-h2-1x1.jpg` / `physical-h2-9x16.jpg`

> Fra skuffen til væggen.
>
> Restaurering, print på mat fotopapir, ramme med passepartout og glas, og fri fragt – fra 599 kr. Se restaureringen gratis først.

Overskrift: `Print, ramme og fri fragt` · Beskrivelse: `Fra 599 kr.`

### Annoncesæt B (retargeting, oprettes pauset): tre annoncer

Nyt annoncesæt i samme kampagne, navn `META_Sales_DK_Retargeting30_Purchase`. Målgruppe: custom audience
"Website-besøgende 30 dage" (opret den under Målgrupper → Custom audience → Website → pixelen → alle
besøgende, 30 dage; den er tom, indtil pixelen kører, og det er forventet). Ekskludér custom audience
"Købere 180 dage" (event Purchase). Budget 50 kr./dag. Optimering: Conversions, hændelse Purchase.
Placeringer som sæt A. Alder 45–65+, Danmark.

**`offer`** – `offer-4x5.jpg` / `offer-1x1.jpg` / `offer-9x16.jpg` – findes filen ikke, er tilbuddet udløbet: spring over.

> Der er næsten altid én mere, der også husker det.
>
> 2 indrammede eksemplarer fra 599 kr.: ét til dig, ét til den, der også husker det. Det første ekstra eksemplar af samme billede, størrelse og ramme er gratis til og med 30. september. Se restaureringen gratis først.

Overskrift: `2 indrammede eksemplarer fra 599 kr.` · Beskrivelse: `Til og med 30. september`

**`trust`** – `trust-4x5.jpg` / `trust-1x1.jpg` / `trust-9x16.jpg`

> Det skal stadig ligne hende.
>
> Vi gennemgår ansigterne, og du godkender resultatet, før vi printer. Se dit eget restaureret gratis. I ramme fra 599 kr. inkl. fragt.

Overskrift: `Du godkender før print` · Beskrivelse: `I ramme fra 599 kr.`

**`physical-rt`** – samme filer og tekster som `physical` i sæt A.

Ikke med ved launch (ligger klar i samme mappe, rør dem ikke): `*-h2-*` bortset fra physical-h2,
`ugc-*`, `physical-4x5.jpg`, `reveal-h2-*`. Videoerne i `work/ads/video/` bruges ikke i denne omgang.

## Fase 4: gennemgang, og stop

1. Åbn forhåndsvisning af alle annoncer i mobil-feed og i Stories. Screenshot af hver. Tjek, at
   overskriften ikke afkortes, og at billedet ikke beskæres (9:16-filen skal være valgt til Stories/Reels).
2. Klik forhåndsvisningens link til landingssiden. Den åbnede URL skal indeholde
   `utm_source=facebook` og `utm_content=` efterfulgt af annoncenavnet.
3. Rapportér i en tabel: kampagne, annoncesæt og hver annonce med ID, status (kladde/pauset). Derefter en
   nummereret liste **"Det mangler du selv"** med alt, du ikke kunne gøre: billeder, der skal uploades
   (annonce → fuld filsti), felter Meta ikke ville gemme, custom conversion der venter på eventet, domæne
   der venter på deploy, tokens der skal i Netlify. Skriv den, så jeg kan gøre det fra telefonen i
   morgen uden at læse resten.
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
4. **Stop-regel (ejerens):** 0 køb efter 1.500 kr. samlet forbrug → sæt kampagnen på pause og rapportér.
   Sæt derfor kampagnens forbrugsgrænse (Campaign spending limit) til 1.500 kr., før der publiceres, så
   Meta selv stopper. Budgettet er 150 kr./dag i sæt A og 50 kr./dag i sæt B (pauset); tabellen viser
   sættets budget på hver annonce, ikke et budget pr. annonce.
5. **Beslutningsregler.** Rør intet de første 3 dage eller under 2.000 visninger pr. annonce. Derefter:
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
