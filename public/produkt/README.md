# Fotos af det fysiske produkt

Alt, siden i dag viser af det, kunden får, er tegnet af kode: `makeMockup` lægger restaureringen ind
på `public/mockup/wall.jpg`, et rum ingen af os har stået i. Det er ærligt som visualisering og
ubrugeligt som bevis. Målgruppen er 45–70 og køber en fysisk ting af et dansk firma, de aldrig har
hørt om. Ét foto af en rigtig pakke gør, hvad ingen rendering kan.

Læg billederne her og skriv dem ind i `produkt.json`. Indtil da vises afsnittet **slet ikke** — der
står ingen pladsholder og lover noget, vi ikke har.

## Hvad du skal tage — fire billeder, telefon i dagslys er nok

1. **`ramme-i-haanden.jpg`** — en færdig indrammet 30×40 holdt i en hånd, så man ser dybden i rammen,
   passepartout'en og at glasset er glas. Ikke på en væg: i en hånd. Det er det, der gør den fysisk.
2. **`pakken-aaben.jpg`** — den åbnede forsendelse med billedet i, som kunden ser den i entréen.
   Papkanterne må gerne være med. Det svarer på "kommer det helt frem?".
3. **`loest-print.jpg`** — det løse 20×30-print mellem sine to stykker pap, halvt trukket ud. Det er
   det eneste billede af 250-kroners-produktet, der findes.
4. **`paa-vaeggen.jpg`** — den samme ramme hængt op hjemme hos dig. Ét rigtigt rum slår det tegnede,
   også selvom rummet er mindre pænt.

Undgå: modeller, hænder med ringe der ligner et bryllupsfoto, arrangerede kaffekopper. Et almindeligt
dansk dagslysbillede er mere troværdigt end et godt reklamefoto.

## Regler

- **Kun billeder af ting, der findes.** Er der ikke sendt en pakke endnu, så tag billedet af den
  første, du selv pakker — og sæt `"demo": true` på den. Så skriver siden «Opstillet foto» hen over.
- **Ingen kundebilleder uden skriftlig tilladelse.** Brug dit eget billede i rammen.
- Landskabsformat eller kvadratisk, mindst 1200 px på den lange led, under 500 kB.

## produkt.json

```json
[
  { "file": "ramme-i-haanden.jpg", "alt": "En indrammet 30×40 holdt i en hånd", "caption": "Sort ramme med passepartout og glas.", "demo": true },
  { "file": "pakken-aaben.jpg",    "alt": "Den åbnede pakke med billedet i",    "caption": "Sådan kommer den frem." },
  { "file": "loest-print.jpg",     "alt": "Et løst print mellem to stykker pap", "caption": "Det løse print, pakket fladt.", "product": "print" },
  { "file": "paa-vaeggen.jpg",     "alt": "Den indrammede restaurering på en væg", "caption": "Hjemme på væggen." }
]
```

`product` kan være `framed`, `print` eller `digital`; uden feltet vises billedet til alle produkter.
Filer, der står i JSON men ikke ligger i mappen, springes over — siden viser aldrig et brudt billede.
