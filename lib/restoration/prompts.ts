// Prompts are used verbatim. Tuning happens here and nowhere else.

export const RESTORATION_PROMPT = `You are a conservation-grade photo restorer working on a real family photograph. Restore this scanned or photographed print so it looks the way it did when it was new, and nothing more.

Do:
- Remove scratches, creases, folds, tears, cracks, dust, spots, mould marks, water stains, tape marks, fingerprints and surface glare.
- Reconstruct small missing areas of background, clothing and hair by continuing the surrounding texture. Reconstruct missing facial areas only when the missing area is small and the rest of the face makes the result unambiguous.
- Correct fading, yellowing, colour cast and low contrast to natural, period-appropriate tones. Recover shadow and highlight detail. Apply gentle, natural sharpening; keep the original film grain and softness of the era.
- Keep the original framing, aspect ratio, pose, expression, gaze, age, body shape, skin texture, hairstyle, clothing, jewellery, background objects and text exactly as they are.
- Keep it monochrome if the original is monochrome or sepia. Do not add colour in this step.

Do not:
- Do not beautify, slim, smooth, whiten teeth, enlarge eyes, change age or alter any facial feature.
- Do not add, remove or move people, objects, text or backgrounds. Do not fill empty space with new content.
- Do not stylise, paint, illustrate, apply filters, add vignettes, borders or watermarks.
- Do not upscale by inventing detail that is not implied by the image; keep uncertain areas soft rather than sharp and wrong.

Output a single photorealistic image at the same aspect ratio as the input.`;

export const COLOURISATION_PROMPT = `Colourise this restored black-and-white (or sepia) family photograph as a careful historical colourist would.

Do:
- Use natural, muted, period-appropriate colours consistent with the apparent decade, region (Denmark / Northern Europe) and setting. Skin tones realistic and varied; fabrics matte unless clearly shiny; foliage and sky natural, not saturated.
- Keep every pixel of structure exactly as it is: no changes to faces, edges, sharpness, contrast, framing or content. Only chroma is added.
- Where the true colour is unknowable (a dress, a wall), choose a restrained, plausible colour rather than a vivid one.

Do not:
- Do not change luminance, detail, expression, age or any feature.
- Do not add, remove or move anything.
- Do not produce a painted, HDR or oversaturated look. Do not colour-shift white shirts, wedding dresses or uniforms into unlikely colours.

Output a single photorealistic colour image at the same aspect ratio as the input.`;

// Customers photograph the print where it hangs or lies: in its frame on the wall, behind glass, on a
// kitchen table, held in a hand, on an album page. The restorer is told to keep the original framing, so
// without this step the frame and the wall survive into the print and the customer is asked to pay 599 kr.
// for a picture of a picture on a wall. One cheap vision call finds the photograph itself first.
export const FRAMING_PROMPT = `A customer uploaded this image to a photo-restoration service. Very often they photographed an old print with a phone, so the upload contains the print plus its surroundings: a picture frame, a mount or passe-partout, glass with reflections, the wall behind it, a table, a hand holding it, an album page, or a scanner lid.

Find the rectangle of the actual photographic image the customer wants restored.

Return strict JSON:
{
 "surround": "none"|"frame"|"table"|"hand"|"album"|"scanner"|"other",
 "confident": true|false,
 "box": { "x": 0.0-1.0, "y": 0.0-1.0, "w": 0.0-1.0, "h": 0.0-1.0 },
 "angled": true|false,
 "notes": "one sentence"
}

Rules:
- "box" describes the photographic image only, as fractions of the uploaded image's full width and height: x and y are its top-left corner, w and h its size.
- Exclude everything around the photograph: frame, mount, passe-partout, white paper border, wall, table, hand, album page, scanner lid.
- Include the whole photograph. Never cut into the picture and never cut off a person, a head or a hand that belongs to it.
- If the upload is already the photograph edge to edge, answer surround "none", confident true, box {"x":0,"y":0,"w":1,"h":1}.
- Answer confident false whenever the edges are unclear, the photograph is small in the frame, or you are unsure. A false here is free; a wrong crop destroys the picture.
- "angled" is true when the print is photographed at a slant rather than straight on.

No prose outside the JSON.`;

// The likeness prompt is the spec's prompt plus two face-count fields (replacing a
// separate face detector) and one clarification of invented_details added in the
// single tuning round (QUALITY_REPORT.md, DECISIONS.md).
export const LIKENESS_PROMPT = `You compare two images of the same family photograph: A is the original scan, B is a restoration. Judge only whether B remains faithful to A.

Return strict JSON:
{
 "same_people": true|false,
 "likeness": 1-5,          // 5 = unmistakably the same faces; 3 = recognisable but altered; 1 = different person
 "invented_details": true|false,   // any object, text, hair, clothing or facial feature in B that is not implied by A. Continuing background, clothing or hair texture into areas that are destroyed in A (tears, emulsion loss, stains) is allowed restoration and does not count; a changed face, an added or removed person or object, or new text does count.
 "removed_content": true|false,    // anything present in A that is missing in B, other than damage, dirt, scratches, scanner borders or archive markings
 "over_processed": true|false,     // plastic skin, painted look, halo sharpening, HDR
 "face_count_a": integer,          // number of clearly visible human faces in A
 "face_count_b": integer,          // number of clearly visible human faces in B
 "notes": "one sentence"
}
No prose outside the JSON.`;
