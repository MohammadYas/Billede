# Annoncebilleder med gpt-image-2 / Gemini (Nano Banana Pro)

Princippet, som holder annoncerne ærlige og ANTI_SLOP D2: **scenen må genereres, restaureringen må ikke.**
Begge billeder i et før/efter-par vedhæftes som reference, og modellen får ordre på at gengive dem
tro. Det gamle print ligger fysisk i scenen, det restaurerede vises på en skærm eller i en ramme.
Så er det, kunden ser som resultat, stadig pipelinens ægte output.

Referencefiler: `public/examples/<id>-before.jpg` og `public/examples/<id>-after.jpg`, eller de samme
på https://billedearv.dk/examples/… (Gemini og ChatGPT tager begge vedhæftede filer; Higgsfield tager
URL'en via import). Brug 4:5 (1080×1350) som hovedformat; Meta beskærer selv til 1:1 i feed, så hold
motivet i midten. Gem resultatet som `work/ads/creatives/<id>-<koncept>-1080x1350.jpg`.

## Sådan gør du det manuelt

**ChatGPT (gpt-image-2):** ny chat → vedhæft `<id>-before.jpg` og `<id>-after.jpg` (i den rækkefølge; prompten
kalder dem FIRST og SECOND) → indsæt prompten → skriv til sidst "Portrait 1024×1536" → download PNG.
Bed om "same scene, new take" for varianter, ikke en ny prompt.

**Gemini (Nano Banana Pro, gemini.google.com eller aistudio.google.com):** vælg billedmodellen → vedhæft de
to filer → indsæt prompten → aspect 4:5, 2K → download. Gemini gengiver referencer mest tro af de to.

**Efter hvert billede, før det bruges:** læg `after.jpg` ved siden af og tjek ansigter, positur, baggrund
og at parret ikke er spejlvendt. Testen 2026-09-08 (koncept 1, Nano Banana Pro) gav en flot scene og en
tro telefonskærm, men printet på bordet var spejlvendt og beskåret. Så: kasser, generér igen, eller
brug tomt-felt-metoden nederst. Skalér til 1080×1350 og gem som JPEG i `work/ads/creatives/`:

```bash
node -e "require('sharp')('input.png').resize(1080,1350,{fit:'cover'}).jpeg({quality:90}).toFile('work/ads/creatives/bryllup-1954-koekkenbord-1080x1350.jpg')"
```

## Fælles regler i hver prompt

- Ingen tekst, logo, UI-elementer eller vandmærke i billedet. Teksten kommer fra annoncen.
- Hænder og personer i scenen: 50 til 65 år, naturlige, ingen ansigter i fokus (så ingen "kunde"
  opfindes). Dansk hjem: lyst træ, hvide vægge, dagslys fra et vindue, ingen stearinlys-klichéer.
- "Editorial, not stock": ingen overdrevent glade smil, ingen kamera-mod-kamera-poser.
- Modellen skal gengive referencerne tro: samme personer, samme baggrund, samme positur. Et resultat,
  hvor ansigterne er ændret, kasseres.
- Efter generering: sammenlign efter-billedet i scenen med `after.jpg`. Er der ændret på ansigter,
  tøj eller baggrund, generér igen eller komposér det ægte efter-billede ind i sharp.

## Koncept 1: `koekkenbord` (annonce 1 `gaven`, par bryllup-1954)

> Photorealistic advertising photograph, 4:5 portrait. A Danish kitchen table in warm morning daylight from a window on the left, light oak wood, a cup of coffee and reading glasses at the edge. In the centre, lying flat on the table, the FIRST reference image: the old damaged wedding photograph exactly as it is (creased, stained, yellowed, torn corner), physical paper print with soft shadow. Above it, a woman's hands in her late fifties (visible wedding ring, natural skin, no manicure) hold a modern smartphone horizontally over the print, screen facing the camera; on the phone screen is the SECOND reference image, the restored, clean, sharp version of the same wedding photograph, filling the screen edge to edge. Camera slightly above, 50 mm look, shallow depth of field, the phone screen and the old print both in focus. No text, no logos, no UI elements on the screen, no watermark. Muted Scandinavian palette, warm off-white walls, calm and honest, editorial not stock. Both reference images must be reproduced faithfully: same people, same church door, same poses.

## Koncept 2: `paa-vaeggen` (annonce 2 `dit-billede`, par have-1976)

> Photorealistic interior photograph, 4:5 portrait. A calm Danish living room wall in soft daylight, warm off-white lime plaster, a light oak sideboard below with one ceramic bowl. On the wall hangs a single black wooden frame with a white mount and glass, 40×50 cm, containing the SECOND reference image: the restored colour photograph, reproduced faithfully. Leaning against the sideboard below, small and slightly out of focus, the FIRST reference image as a faded, creased paper print, so the viewer sees where the framed picture came from. Natural shadows, slight reflection in the glass, nothing else on the wall. No text, no logos, no watermark. Editorial interior photography, not a render.

## Koncept 3: `skuffen` (annonce 3 `ser-foerst`, par portraet-1962)

> Photorealistic photograph, 4:5 portrait, top-down. An open drawer of an old teak dresser, inside a loose pile of old family photographs, envelopes and a folded letter, all faded and worn. On top of the pile, in the exact centre, the FIRST reference image: the small damaged portrait print, reproduced faithfully. A man's hand in his sixties reaches in from the bottom edge and lifts a smartphone that has just taken a photo of it; on the phone screen, slightly tilted, the SECOND reference image: the same portrait restored, sharp and clean. Daylight from the left, soft shadows in the drawer, warm wood tones. No text, no UI, no logos, no watermark. Quiet, documentary, honest.

## Koncept 4: `gaven-pakkes-op` (annonce 4 `tilbud`, par foedselsdag-1985)

> Photorealistic photograph, 4:5 portrait. A dining table after a family dinner, Danish home, evening daylight, white tablecloth pushed aside. Two identical black frames with white mounts lie side by side on brown wrapping paper that has just been opened, string and a plain card beside them, no writing visible. Both frames contain the SECOND reference image: the restored colour photograph, reproduced faithfully and identically in both. In the top corner of the frame, half under the paper, the FIRST reference image as the original faded print. Hands of two adults at the edges of the picture, no faces. Warm, unposed, editorial. No text, no logos, no watermark.

## Koncept 5: `foer-efter-i-haenderne` (reserve, par familie-ved-vandet-1948)

> Photorealistic photograph, 4:5 portrait. Two hands of a woman in her sixties hold two prints of the same photograph side by side towards the camera, against a plain warm off-white wall in daylight. Left hand: the FIRST reference image as an old, faded, creased paper print. Right hand: the SECOND reference image as a fresh, sharp print on matte photo paper with a thin white border. Both reproduced faithfully, same size, aligned. Shallow depth of field on the wall, prints sharp. No text, no logos, no watermark. Simple, honest, documentary.

## Hvis modellen ændrer ansigterne

gpt-image-2 og Gemini kan begge "forbedre" et referenceansigt. Så: generér scenen med et tomt sort
felt, hvor efter-billedet skal sidde ("a blank matte black rectangle where the photo will be placed,
perspective as shown"), og læg det ægte `after.jpg` ind bagefter i sharp (`scripts/ads-creatives.mjs`
har allerede compositing-koden; tilføj en perspektivfri variant, hvor rektanglet er frontalt). Den vej
er altid lovlig.

## Efter billederne

Erstat filnavnene i `docs/meta-ads-prompt.md` (Fase 3), så Claude i Chrome uploader de nye. Behold
den gamle 1:1-collage som reserve til placeringer, der kræver 1:1 uden beskæring.
