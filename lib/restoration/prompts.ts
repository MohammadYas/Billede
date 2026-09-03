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
