# Prompt til Claude i Chrome: lanceringskampagnen i Meta Ads Manager

Sådan bruges den: log ind på business.facebook.com i Chrome, åbn Ads Manager på den rigtige annoncekonto,
åbn Claude-udvidelsen og indsæt alt under stregen som første besked. Billederne ligger i
`work/ads/creatives/` (lav dem igen med `node scripts/ads-creatives.mjs`, hvis eksemplerne ændrer sig).

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

## Fase 3: fire annoncer

Fælles for alle fire:

- Format: enkelt billede. Identitet: Facebook-siden Billedearv, og Instagram-kontoen, hvis den findes.
  Multi-advertiser ads: fra. Alle Advantage+ creative-valg: fra.
- Billederne ligger i `C:\Users\mo\Desktop\Billede\work\ads\creatives\`. Brug den genererede scene
  `<par>-<koncept>-1080x1350.jpg` (lavet efter `docs/meta-ads-creatives.md`) som hovedbillede; findes
  den ikke for et par, brug collagen `<par>-story-1080x1350.jpg`, og `<par>-feed-1080x1080.jpg` til
  1:1-placeringer (vælg "Rediger pr. placering", så Meta ikke beskærer selv).
- Website-URL: `https://billedearv.dk/`
- Feltet **URL-parametre** (ikke selve URL'en):
  `utm_source=facebook&utm_medium=cpc&utm_campaign=lancering-sep26&utm_content={{ad.name}}`
- Knap: "Få mere at vide" (Learn more). Ikke "Køb nu": første skridt koster ikke noget.
- Sprog: dansk. Ingen automatiske oversættelser.

### Annonce 1: `gaven` (billede: bryllup-1954, koncept `koekkenbord`)

Primær tekst:

> Det gamle billede af mor og far. Skarpt igen, i ramme, klar til at give.
>
> Tag et foto af billedet med telefonen. Et par minutter efter ser du det restaureret på skærmen, før du beslutter noget. Det koster ikke noget at se.
>
> Skal det hjem i ramme: fra 599 kr., fri fragt. 30×40, 40×50 eller 50×70 cm, sort ramme eller eg.

Overskrift: `Se det restaureret, før du køber`
Beskrivelse: `Fra 599 kr. i ramme · fri fragt`

### Annonce 2: `dit-billede` (billede: have-1976, koncept `paa-vaeggen`)

Primær tekst:

> Dit gamle billede kan blive sådan her.
>
> Folder, pletter og falmede farver kan rettes. Tag et foto af billedet med telefonen, og se resultatet på skærmen. Det koster ikke noget at se.
>
> Vil du have det hjem: fra 599 kr. i ramme med glas, fri fragt, leveret inden 10 hverdage efter dit ja.

Overskrift: `Dit gamle billede kan blive sådan her`
Beskrivelse: `Se resultatet på skærmen, før du beslutter dig`

### Annonce 3: `ser-foerst` (billede: portraet-1962, koncept `skuffen`)

Primær tekst:

> Et lille portræt fra pungen. Sådan bliver det, når det er restaureret.
>
> Sådan foregår det: Tag et foto af billedet. Se resultatet på skærmen. Sig ja, så printer vi og sender det i ramme. Bestiller du ikke, slettes billedet af sig selv efter 30 dage.
>
> Dansk virksomhed, Vemmelev · CVR 46300831.

Overskrift: `Ingen bestilling, før du har set det`
Beskrivelse: `Fra 599 kr. i ramme · fri fragt`

### Annonce 4: `tilbud` (billede: foedselsdag-1985, koncept `gaven-pakkes-op`)

Primær tekst:

> Lanceringstilbud til og med 30. september: ét ekstra eksemplar af billedet med i pakken, til den, der også husker det. Værdi 349 kr.
>
> Tag et foto af det gamle billede med telefonen, se det restaureret på skærmen, og bestil kun, hvis du vil have det hjem. Fra 599 kr. i ramme, fri fragt.

Overskrift: `Ét ekstra eksemplar med i pakken · til og med 30. september`
Beskrivelse: `Samme billede, samme ramme, til den der også husker det`

Reservebilleder, hvis et af de fire afvises eller skal skiftes: familie-1932, familie-ved-vandet-1948,
cykel-1944. Brug ikke bryllup-1916 (for lille forskel mellem før og efter).

## Fase 4: gennemgang, og stop

1. Åbn forhåndsvisning af alle fire annoncer i mobil-feed og i Stories. Screenshot af hver. Tjek, at
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
