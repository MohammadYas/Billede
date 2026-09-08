# Annoncebilleder: scener fra gpt-image-2 / Gemini, fotografierne lægges ind bagefter

**Ingen referencebilleder.** Modellen laver kun scenen og efterlader to helt sorte, matte, frontale
rektangler, hvor fotografierne skal sidde. Bagefter lægger `scripts/ads-composite.mjs` det ægte før- og
efter-billede fra `public/examples/` ind i felterne. Det holder annoncen ærlig (ANTI_SLOP D2: scenen må
genereres, restaureringen må ikke) og fjerner problemet fra testen 2026-09-08, hvor modellen spejlvendte
og beskar referencen.

Regel for alle koncepter: **det øverste felt er EFTER, det nederste felt er FØR.** Scriptet fordeler efter
placering. Felterne skal være frontale (set lige forfra eller lige oppefra), ikke i perspektiv, ellers
kan billedet ikke lægges ind uden forvrængning.

## Arbejdsgang

1. Kør prompten i ChatGPT (gpt-image-2) eller Gemini/AI Studio (Nano Banana Pro). Format 4:5.
   ChatGPT: skriv "1024×1536, portrait" til sidst. Gemini: aspect 4:5, 2K.
2. Kig på resultatet: er begge felter helt sorte og rektangulære, uden refleks, tekst eller kant inde i
   feltet? Ellers "Same scene, same composition. The two placeholder rectangles must be perfectly flat,
   pure black, sharp-edged, no reflections, no content". To forsøg, ellers næste koncept.
3. Gem PNG'en som `work/ads/scenes/<par>-<koncept>.png`.
4. Læg fotografierne ind:

```bash
node scripts/ads-composite.mjs work/ads/scenes/bryllup-1954-koekkenbord.png bryllup-1954
```

   Output: `work/ads/creatives/bryllup-1954-koekkenbord-1080x1350.jpg` og `-1080x1080.jpg`. Scriptet
   finder de to sorte felter selv; finder det ikke præcis to, siger det fra, og du kan give felterne
   manuelt: `--after x,y,w,h --before x,y,w,h` (pixel i scenen).
5. Åbn resultatet. Passer lys og skygge? Ellers vælg den anden variant fra modellen. Sig "billeder klar".

## Fælles prompt-ramme

Hver prompt herunder har samme opbygning, så du kan justere ét afsnit ad gangen uden at miste resten:
ROLE, SCENE, PLACEHOLDERS, CAMERA, LIGHT, MATERIALS & COLOUR, MOOD, NEGATIVE, OUTPUT. Kopiér hele
blokken. Skift ikke placeholder-afsnittet; det er det, scriptet regner med.

Fælles NEGATIVE, gentaget i alle prompts: no text, no letters, no logos, no watermark, no UI, no
faces in focus, no smiling-at-camera, no candles, no bokeh balls, no HDR, no oversaturation, no
lens flare, no depth-of-field on the placeholders, no perspective on the placeholders, no reflections
inside the placeholders, no frames or borders drawn inside the placeholders.

---

## Koncept 1: `koekkenbord` (annonce 1 `gaven`, par bryllup-1954)

```
ROLE: You are a Danish editorial still-life photographer shooting a quiet advertising image for a
family photo-restoration service. The image must look like a real photograph, not a render.

SCENE: A light oak kitchen table by a window in a Danish home, mid-morning. On the table, seen exactly
from above (true top-down, camera axis perpendicular to the table): an old paper photograph lying flat,
and above it a modern smartphone lying flat on the table with its screen up. A ceramic cup of coffee
with milk at the upper left edge, a pair of reading glasses at the lower left, a folded linen napkin
partly out of frame at the right. A woman's hand in her late fifties, wedding ring, natural nails,
rests at the lower right edge with two fingertips touching the corner of the old photograph. No face.

PLACEHOLDERS (critical): Two flat, perfectly rectangular, pure black (#000000), matte areas with sharp
straight edges, both seen exactly frontally because the camera is top-down.
 - UPPER placeholder = the phone screen. The phone body is visible around it (thin bezel, rounded
   corners of the body), but the screen itself is one solid black rectangle in 3:2 landscape
   proportion, roughly 55 % of the image width, centred horizontally, in the upper half of the frame.
 - LOWER placeholder = the old photograph. A solid black rectangle in 3:2 landscape proportion, about
   52 % of the image width, in the lower half of the frame, rotated at most 3 degrees. Around it only a
   thin cream paper border with worn, slightly torn edges and a faint stain on the border, so it reads as
   an old print, but the picture area itself is pure black.
 The two black rectangles must not overlap, must not touch other objects, and must contain nothing:
 no reflections, no highlights, no gradient, no text, no icons.

CAMERA: Top-down, 50 mm equivalent, f/8, everything in sharp focus, no tilt. Full-frame digital look,
fine natural grain, no vignetting.

LIGHT: One large window from the left, soft, warm, directional. Long soft shadows falling to the right
of the cup and the glasses. Subtle shadow under the phone and the photograph so they sit on the wood.
Slight fall-off towards the right edge.

MATERIALS & COLOUR: Oak with visible grain, matte ceramic, warm off-white wall tone in the shadows.
Palette: oak, cream, warm grey, one muted green from the napkin. Colour grade like a printed Scandinavian
interiors magazine: low contrast, soft highlights, no crushed blacks except the two placeholders.

MOOD: Calm, unposed, private. A Sunday morning at your mother's table.

NEGATIVE: no text, no letters, no logos, no watermark, no UI, no faces, no smiling, no candles, no bokeh
balls, no HDR, no oversaturation, no lens flare, no perspective on the placeholders, no reflections
inside the placeholders, no frames drawn inside the placeholders, no second phone, no laptop.

OUTPUT: 4:5 portrait, photographic, 2K.
```

## Koncept 2: `paa-vaeggen` (annonce 2 `dit-billede`, par have-1976)

```
ROLE: You are an interiors photographer shooting a Danish living room for a quiet product image.

SCENE: A calm wall in warm off-white lime plaster with visible soft texture, photographed exactly
frontally (camera perpendicular to the wall). Below the wall a light oak sideboard, its top edge in the
bottom third of the frame, with one small stoneware bowl at the left. On the wall hangs one black wooden
frame with a wide white mount and glass, portrait orientation, centred in the upper two thirds of the
frame. Leaning against the wall on the sideboard, slightly right of centre, stands a small old paper
photograph, portrait orientation, cream border with worn edges.

PLACEHOLDERS (critical): Two flat, perfectly rectangular, pure black (#000000), matte areas seen exactly
frontally.
 - UPPER placeholder = the picture inside the frame, behind the mount opening: one solid black rectangle
   in 2:3 portrait proportion, about 34 % of the image width. The glass must show no reflection over the
   black area; the only glass reflection allowed is a faint one on the white mount.
 - LOWER placeholder = the picture area of the small leaning photograph: one solid black rectangle in
   2:3 portrait proportion, about 15 % of the image width, with the cream worn border around it.
 Nothing inside either rectangle.

CAMERA: Frontal, 35 mm equivalent, f/8, wall and sideboard parallel to the sensor, no keystoning,
everything sharp.

LIGHT: Daylight from a window at the left, soft, slightly warm. A gentle gradient across the wall from
light at the left to a little darker at the right. Soft shadow under the frame and under the small
photograph. No spotlights.

MATERIALS & COLOUR: Lime plaster, matte black wood, museum-white mount, oak, stoneware. Palette: warm
white, oak, black, one muted green plant leaf entering from the right edge, out of focus. Low contrast,
magazine grade.

MOOD: Finished. The picture has found its place.

NEGATIVE: no text, no letters, no logos, no watermark, no faces, no other frames on the wall, no
gallery wall, no candles, no HDR, no oversaturation, no lens flare, no perspective on the placeholders,
no reflections inside the placeholders, no frame drawn inside the placeholders.

OUTPUT: 4:5 portrait, photographic, 2K.
```

## Koncept 3: `skuffen` (annonce 3 `ser-foerst`, par portraet-1962)

```
ROLE: You are a documentary still-life photographer. The image should feel found, not staged.

SCENE: True top-down view into an open drawer of an old teak dresser, the drawer filling the frame
edge to edge. Inside: a loose layer of old family photographs with cream borders, two envelopes with
faded handwriting-like scribbles that are unreadable, a folded letter, a ribbon. On top of the pile,
centred in the lower half, one small old portrait photograph with a scalloped cream border. In the
upper half, a modern smartphone lies flat on the pile, screen up, slightly rotated (up to 4 degrees).
A man's hand in his sixties, wristwatch with leather strap, enters from the bottom edge and rests two
fingers on the drawer's edge. No face.

PLACEHOLDERS (critical): Two flat, perfectly rectangular, pure black (#000000), matte areas seen exactly
frontally (top-down).
 - UPPER placeholder = the phone screen: one solid black rectangle in 9:19.5 portrait proportion inside
   the phone body, about 30 % of the image width, in the upper half.
 - LOWER placeholder = the picture area of the small portrait photograph: one solid black rectangle in
   2:3 portrait proportion, about 26 % of the image width, in the lower half, inside the scalloped cream
   border. All other photographs in the drawer must show only their backs or be turned so their picture
   areas are hidden under other objects, so there are exactly two black rectangles in the image.

CAMERA: Top-down, 50 mm equivalent, f/8, everything sharp, no tilt.

LIGHT: Window light from the left, soft, warm. The drawer's walls cast a soft shadow on the right and
bottom inside edges. Gentle highlights on the teak edge.

MATERIALS & COLOUR: Teak, cream paper with foxing and soft creases, faded blue envelope, black phone
body. Palette: teak, cream, faded blue, warm grey. Low contrast, fine grain.

MOOD: Quiet, honest, a little melancholy. Something found again.

NEGATIVE: no text, no readable handwriting, no logos, no watermark, no faces, no visible pictures on
the other photographs, no candles, no HDR, no oversaturation, no lens flare, no perspective on the
placeholders, no reflections inside the placeholders, no frame drawn inside the placeholders.

OUTPUT: 4:5 portrait, photographic, 2K.
```

## Koncept 4: `gaven-pakkes-op` (annonce 4 `tilbud`, par foedselsdag-1985)

```
ROLE: You are a lifestyle photographer shooting a gift moment for a Danish family brand, restrained
and real.

SCENE: True top-down view of a dining table with a white linen cloth, after coffee: two cups, a small
plate with crumbs, a sprig of eucalyptus. In the centre, brown kraft wrapping paper has been opened
and lies flat with soft folds; a length of natural string and a blank cream card lie beside it. On the
paper lie two identical black wooden frames with wide white mounts, portrait orientation, side by side
and parallel, filling most of the frame's width together. At the top edge, half tucked under the fold
of the paper, the corner of an old paper photograph with a cream worn border peeks out. Two adults'
hands at the left and right edges, one older, one younger, no faces.

PLACEHOLDERS (critical): Two flat, perfectly rectangular, pure black (#000000), matte areas seen exactly
frontally (top-down).
 - UPPER placeholder = the picture inside the LEFT frame behind its mount: one solid black rectangle in
   2:3 portrait proportion, about 30 % of the image width. Its top edge must sit higher in the image
   than the other placeholder's top edge; to achieve this, the left frame lies about 6 % of the image
   height higher than the right frame.
 - LOWER placeholder = the picture inside the RIGHT frame behind its mount: one solid black rectangle in
   2:3 portrait proportion, about 30 % of the image width.
 The old photograph peeking out at the top shows only its border and the back; its picture area is
 hidden under the paper, so there are exactly two black rectangles in the image. The glass in both
 frames shows no reflection over the black areas.

CAMERA: Top-down, 50 mm equivalent, f/8, everything sharp.

LIGHT: Late-afternoon window light from the upper left, warm, soft, one clear shadow direction. Soft
shadows under the frames on the paper.

MATERIALS & COLOUR: Linen, kraft paper, matte black wood, white mount, glass, natural string. Palette:
white, kraft brown, black, one muted green. Low contrast, printed-magazine grade.

MOOD: Just opened. Two of the same, one for each of them.

NEGATIVE: no text, no writing on the card, no logos, no watermark, no faces, no ribbon bows, no
glitter, no candles, no Christmas, no HDR, no oversaturation, no lens flare, no perspective on the
placeholders, no reflections inside the placeholders, no frame drawn inside the placeholders.

OUTPUT: 4:5 portrait, photographic, 2K.
```

Bemærk til koncept 4: scriptet lægger EFTER i begge rammer (`--both-after`), fordi tilbuddet er to
eksemplarer af det restaurerede billede; før-billedet er kun hjørnet under papiret.

## Koncept 5: `i-haenderne` (reserve, par familie-ved-vandet-1948)

```
ROLE: You are a documentary portrait photographer, shooting hands only.

SCENE: Against a plain warm off-white plaster wall, photographed frontally, a woman in her sixties
holds two photographs up towards the camera, one in each hand, both held flat and parallel to the
camera, side by side, at chest height, filling most of the width. Her hands, cuffs of a grey wool
sweater, and a thin gold ring are visible; her face is not in the frame. The LEFT photograph is an old
print with a cream border, worn corners, one crease across the border. The RIGHT photograph is a new
print on matte photo paper with a clean thin white border, held slightly higher than the left one.

PLACEHOLDERS (critical): Two flat, perfectly rectangular, pure black (#000000), matte areas seen exactly
frontally.
 - UPPER placeholder = the picture area of the RIGHT, new print: one solid black rectangle in 3:2
   landscape proportion, about 40 % of the image width, its top edge higher than the left one's.
 - LOWER placeholder = the picture area of the LEFT, old print: one solid black rectangle in 3:2
   landscape proportion, about 40 % of the image width, inside the worn cream border.
 Both prints are held perfectly flat, parallel to the sensor, no bending, no perspective.

CAMERA: Frontal, 50 mm equivalent, f/5.6, prints and hands sharp, wall softly out of focus.

LIGHT: Window light from the left, soft, warm, a gentle shadow of the hands on the wall to the right.

MATERIALS & COLOUR: Plaster, cream paper, matte photo paper, grey wool. Palette: warm white, cream,
grey, skin. Low contrast, natural grain.

MOOD: Same picture, sixty years apart. Simple, honest.

NEGATIVE: no text, no logos, no watermark, no face, no smiling, no jewellery beyond one ring, no
candles, no HDR, no oversaturation, no lens flare, no perspective on the placeholders, no reflections
inside the placeholders, no frame drawn inside the placeholders, no bent prints.

OUTPUT: 4:5 portrait, photographic, 2K.
```

## Justering, hvis modellen driller

- Feltet er gråt eller har en glans: tilføj i PLACEHOLDERS "render the two rectangles as if they were
  cut out of the image: RGB 0,0,0 everywhere inside, hard edges, zero gloss".
- Modellen tegner et fotografi i feltet alligevel: "The rectangles are placeholders for images that
  will be added later in post-production. Leave them empty."
- Feltet står i perspektiv: gentag "camera axis perpendicular to the surface, the rectangle's edges are
  parallel to the image edges".
- Tekst dukker op: "There is no writing anywhere in the scene; every card, envelope and label is blank."
- gpt-image-2 laver felterne lidt for små: hæv procenten med 5 point ad gangen.

## Efter billederne

Scriptet giver 1080×1350 og 1080×1080 pr. koncept i `work/ads/creatives/`. Chrome-prompten
(`docs/meta-ads-prompt.md`, Fase 3) peger allerede på `<par>-<koncept>-1080x1350.jpg`.
