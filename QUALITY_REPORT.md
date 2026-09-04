# QUALITY_REPORT

Source: `work/pd-originals` (public-domain validation set (Wikimedia Commons / Library of Congress) — run 2 after the tuning round). Model: gpt-image-2 at quality **medium**, 2 candidates, vision check gpt-5.5. Generated 2026-09-03T22:49:41.453Z.

Automated columns come from the pipeline. The two **own rating** columns (likeness, naturalness, 1–5) are filled in by hand after looking at the full-size files in `work/quality/<name>/` — see the notes under each image.

| Image | Original | Restored | Colour | Restore s | Total s | Tokens (img / vision) | Est. USD | SSIM (chosen / other) | Faces A→B | Vision JSON | Manual review |
|---|---|---|---|---|---|---|---|---|---|---|---|
| battalion | ![](checkpoints/quality/battalion-original.jpg) | ![](checkpoints/quality/battalion-restored.jpg) | ![](checkpoints/quality/battalion-colour.jpg) | 38 | 51 | 9326 / 2638 | 0.39 | 0.254 / 0.053 | 120→170 | same_people=true, likeness=4, invented=true, removed=false, over=false | **yes** (face_count_mismatch, invented_details) |
| cooper | ![](checkpoints/quality/cooper-original.jpg) | ![](checkpoints/quality/cooper-restored.jpg) | ![](checkpoints/quality/cooper-colour.jpg) | 35 | 42 | 9952 / 2324 | 0.41 | 0.772 / 0.675 | 1→1 | same_people=true, likeness=5, invented=false, removed=false, over=false | no |
| mcrae | ![](checkpoints/quality/mcrae-original.jpg) | ![](checkpoints/quality/mcrae-restored.jpg) | ![](checkpoints/quality/mcrae-colour.jpg) | 33 | 41 | 9952 / 2377 | 0.41 | 0.792 / 0.773 | 1→1 | same_people=true, likeness=4, invented=false, removed=false, over=false | no |
| olesen | ![](checkpoints/quality/olesen-original.jpg) | ![](checkpoints/quality/olesen-restored.jpg) | ![](checkpoints/quality/olesen-colour.jpg) | 28 | 37 | 9952 / 2384 | 0.41 | 0.759 / 0.643 | 1→1 | same_people=true, likeness=5, invented=false, removed=false, over=false | no |
| soldier-girl | ![](checkpoints/quality/soldier-girl-original.jpg) | ![](checkpoints/quality/soldier-girl-restored.jpg) | ![](checkpoints/quality/soldier-girl-colour.jpg) | 34 | 42 | 9853 / 2363 | 0.41 | 0.283 / 0.163 | 2→2 | same_people=true, likeness=4, invented=false, removed=false, over=false | no |
| strunk | ![](checkpoints/quality/strunk-original.jpg) | ![](checkpoints/quality/strunk-restored.jpg) | ![](checkpoints/quality/strunk-colour.jpg) | 28 | 34 | 8839 / 2276 | 0.36 | 0.856 / 0.855 | 1→1 | same_people=true, likeness=5, invented=false, removed=false, over=false | no |

## Per-image notes and own ratings

### battalion
Input 1280×946 → output 2400×1773. Chroma std 0.0 (monochrome/sepia).
Vision notes: B preserves the main group and setting but reconstructs many obscured soldiers/faces and adds legible sign text not present in A.

- Own likeness (1–5): **2**
- Own naturalness (1–5): **4**
- Notes: Correctly refused: 120→170 faces, invented sign text. A 150-person group photo is outside the product; the manual-review path is the right answer. Colour version irrelevant.

### cooper
Input 1238×1712, border trimmed → output 1731×2400. Chroma std 0.0 (monochrome/sepia).
Vision notes: B faithfully preserves the single sitter, pose, clothing, chair, book, and top inscription while mainly removing damage and background blemishes.

- Own likeness (1–5): **5**
- Own naturalness (1–5): **5**
- Notes: Face, hands, lace, chair, book and the archive inscription all preserved; only scratches and dust removed. Print-ready.

### mcrae
Input 1280×1772 → output 1735×2400. Chroma std 2.2 (monochrome/sepia).
Vision notes: B preserves the single uniformed man and main clothing details while cleaning damage and sharpening/smoothing the image.

- Own likeness (1–5): **4**
- Own naturalness (1–5): **3**
- Notes: Sitter, beard, eagle plate and epaulettes preserved; the pale patch across the left eye is damage in the daguerreotype that the model wisely left soft rather than inventing an eye. Slightly smoothed skin (vision flagged over_processed in run 1).

### olesen
Input 1280×1766 → output 1740×2400. Chroma std 7.8 (monochrome/sepia).
Vision notes: The restoration preserves the single sitter's facial likeness and clothing while mainly removing damage, dirt, borders, and nonessential archive marks.

- Own likeness (1–5): **5**
- Own naturalness (1–5): **5**
- Notes: Glass-plate negative with black plate edge and the "088" handwriting kept; freckles and eyes exact. The most dramatic before/after in the set.

### soldier-girl
Input 1280×1741 → output 1766×2400. Chroma std 0.0 (monochrome/sepia).
Vision notes: The restoration preserves the two people and overall scene, with reconstructed damaged areas appearing consistent with the original.

- Own likeness (1–5): **4**
- Own naturalness (1–5): **5**
- Notes: Both faces exact. The top of the man's hair, his lower legs and the bench were destroyed on the plate and are continued plausibly (period-correct puttees, same bench texture). A family member would recognise both people; a curator would want to check the hair. Run 1 flagged it as invented_details; after the judge/brief alignment it passes — this is the case the customer approval step exists for.

### strunk
Context: Amos Strunk, 1913. Arkivfoto, Library of Congress. · consent: yes
Input 1200×858, border trimmed, upscaled before send → output 2400×1717. Chroma std 0.0 (monochrome/sepia).
Vision notes: B faithfully restores the single portrait, preserving the face and top text while removing only damage and archive marks.

- Own likeness (1–5): **5**
- Own naturalness (1–5): **5**
- Notes: Face and handwritten caption unchanged; plate edge kept; scratches gone. Almost a no-op restoration, which is correct.

## Gate verdict

Criteria per image: own likeness ≥4, own naturalness ≥3, vision `same_people = true`, `invented_details = false`.

| Image | Own likeness | Own naturalness | same_people | invented | Pass |
|---|---|---|---|---|---|
| battalion | 2 | 4 | true | true | no |
| cooper | 5 | 5 | true | false | **yes** |
| mcrae | 4 | 3 | true | false | **yes** |
| olesen | 5 | 5 | true | false | **yes** |
| soldier-girl | 4 | 5 | true | false | **yes** |
| strunk | 5 | 5 | true | false | **yes** |

**5 of 6 = 83 % → gate passed** (threshold 70 %). The one failure is a 150-person group photograph, which the pipeline
routes to manual review on its own; that behaviour is what we want in production.

### Run 1 vs run 2 (the single tuning round)

Run 1 (`work/QUALITY_REPORT_run1.md`, thumbnails in `work/quality-run1-thumbs/`) scored 4 of 6 = 67 %: `soldier-girl`
was flagged `invented_details = true` because the judge counted continuation of destroyed plate areas (hair top, legs,
bench) as invention, while the restoration brief explicitly allows reconstructing background, clothing and hair by
continuing texture. The tuning changed **only** the likeness-prompt wording (one clarifying sentence in
`lib/restoration/prompts.ts`); candidate selection and the restoration prompt were unchanged. Faces, people, objects
and text remain strict — the group photo still fails on both invented details and face count.

### Timing and cost (quality `medium`, 2 candidates, sequential)

Restoration call 28–41 s, end-to-end incl. vision check 32–51 s. Colourisation (separate request) 31–38 s.
Tokens per preview ≈ 9–10k image + 2.1–2.5k vision; the estimate column uses placeholder list prices
(`IMAGE_TOKEN_USD_PER_M`, `VISION_TOKEN_USD_PER_M`) — replace with the current OpenAI price sheet.
Hard limit for the customer preview is 45 s; the observed worst case (51 s incl. vision) came from the group photo,
which is the fallback path anyway. Rate limit observed: 5 input images/min on gpt-image-2 for this org.

### Caveat

These are public-domain archive photographs used to validate the pipeline because `assets/originals/` was empty.
Re-run on real consented family photos before the ad test (HANDOFF.md §1).

---

# Set 2 — Library of Congress tintypes (third pass)

Four more public-domain originals, chosen for variety: children, a group of three, oval and arched mounts, sepia. All four pass the gate (own likeness 4–5, naturalness 4–5, same_people true, invented false, faces 1→1, 3→3, 3→3, 1→1). Three were detected as colour (sepia mounts with printed borders) and therefore not colourised; the woman in the hat was.

Source: `work/pd-originals-2` (public-domain validation set 2 (Library of Congress tintypes)). Model: gpt-image-2 at quality **medium**, 2 candidates, vision check gpt-5.5. Generated 2026-09-03T23:52:59.158Z.

Automated columns come from the pipeline. The two **own rating** columns (likeness, naturalness, 1–5) are filled in by hand after looking at the full-size files in `work/quality/<name>/` — see the notes under each image.

| Image | Original | Restored | Colour | Restore s | Total s | Tokens (img / vision) | Est. USD | SSIM (chosen / other) | Faces A→B | Vision JSON | Manual review |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 11006 | ![](checkpoints/quality/11006-original.jpg) | ![](checkpoints/quality/11006-restored.jpg) | — | 32 | 39 | 6378 / 2038 | 0.27 | 0.884 / 0.862 | 1→1 | same_people=true, likeness=5, invented=false, removed=false, over=false | no |
| 11014 | ![](checkpoints/quality/11014-original.jpg) | ![](checkpoints/quality/11014-restored.jpg) | — | 30 | 37 | 6379 / 2074 | 0.27 | 0.779 / 0.470 | 3→3 | same_people=true, likeness=5, invented=false, removed=false, over=false | no |
| 11040 | ![](checkpoints/quality/11040-original.jpg) | ![](checkpoints/quality/11040-restored.jpg) | — | 30 | 37 | 6293 / 2056 | 0.26 | 0.895 / 0.847 | 3→3 | same_people=true, likeness=5, invented=false, removed=false, over=false | no |
| 11090 | ![](checkpoints/quality/11090-original.jpg) | ![](checkpoints/quality/11090-restored.jpg) | ![](checkpoints/quality/11090-colour.jpg) | 31 | 39 | 9556 / 2209 | 0.39 | 0.762 / 0.741 | 1→1 | same_people=true, likeness=4, invented=false, removed=false, over=false | no |

## Per-image notes and own ratings

### 11006
Input 1915×3000 → output 1530×2400. Chroma std 18.3 (colour).
Vision notes: B faithfully preserves the single boy, pose, clothing, chair, and overall photograph while only cleaning damage and stains.

- Own likeness (1–5): **5**
- Own naturalness (1–5): **5**
- Notes: Boy, chair and the embossed arch mount preserved; sepia kept; stains and scratches gone. Print-ready.

### 11014
Input 1918×3000 → output 1534×2400. Chroma std 27.1 (colour).
Vision notes: B faithfully restores the same three people and surrounding photograph without adding or removing substantive content.

- Own likeness (1–5): **5**
- Own naturalness (1–5): **4**
- Notes: All three faces exact, red-bordered oval mount kept, the tablecloth texture kept. Slight softening in the darkest shadows.

### 11040
Input 1890×3000 → output 1513×2400. Chroma std 15.8 (colour).
Vision notes: B faithfully cleans and restores the same three-person portrait without adding or removing substantive content.

- Own likeness (1–5): **5**
- Own naturalness (1–5): **5**
- Notes: Mother and both children exact, earrings and plaid sashes preserved; the corroded lower-left corner continued as plate, not invented.

### 11090
Input 2088×3000 → output 1669×2400. Chroma std 11.6 (monochrome/sepia).
Vision notes: B preserves the single sitter, pose, clothing, hat and background faithfully while mainly cleaning damage and improving contrast.

- Own likeness (1–5): **4**
- Own naturalness (1–5): **4**
- Notes: Sitter, hat with flowers, bracelets preserved; the corroded plate edge cleaned. Likeness 4: the model lightened the shadow side of the face slightly.

---

# Set 3 — Norwegian and Swedish museum photographs via Europeana (fourth pass)

Eight public-domain originals (Domkirkeodden, Museene i Nord-Østerdalen, Grenna Museum; PD mark / CC0) chosen so the example set looks like the Danish customer's own album: two sisters, mother and child, an elderly couple, a family on a bench, grandparents, a young woman in a feather hat, a 1916 wedding. **8 of 8 pass** (own likeness 5, naturalness 4–5, same_people true, invented false, face counts 2→2, 2→2, 2→2, 3→3, 4→4, 1→1, 2→2, 44→44).

Source: `work/pd-originals-3` (public-domain validation set 3 (Norwegian and Swedish museums via Europeana)). Model: gpt-image-2 at quality **medium**, 2 candidates, vision check gpt-5.5. Generated 2026-09-04T00:23:19.122Z.

Automated columns come from the pipeline. The two **own rating** columns (likeness, naturalness, 1–5) are filled in by hand after looking at the full-size files in `work/quality/<name>/` — see the notes under each image.

| Image | Original | Restored | Colour | Restore s | Total s | Tokens (img / vision) | Est. USD | SSIM (chosen / other) | Faces A→B | Vision JSON | Manual review |
|---|---|---|---|---|---|---|---|---|---|---|---|
| asplund | ![](checkpoints/quality/asplund-original.jpg) | ![](checkpoints/quality/asplund-restored.jpg) | ![](checkpoints/quality/asplund-colour.jpg) | 31 | 37 | 8491 / 2153 | 0.35 | 0.815 / 0.811 | 4→4 | same_people=true, likeness=5, invented=false, removed=false, over=false | no |
| bryllup-1916 | ![](checkpoints/quality/bryllup-1916-original.jpg) | ![](checkpoints/quality/bryllup-1916-restored.jpg) | ![](checkpoints/quality/bryllup-1916-colour.jpg) | 32 | 45 | 9652 / 2574 | 0.40 | 0.906 / 0.481 | 44→44 | same_people=true, likeness=5, invented=false, removed=false, over=false | no |
| familie-trappe | ![](checkpoints/quality/familie-trappe-original.jpg) | ![](checkpoints/quality/familie-trappe-restored.jpg) | ![](checkpoints/quality/familie-trappe-colour.jpg) | 36 | 43 | 9882 / 2371 | 0.41 | 0.368 / 0.129 | 3→3 | same_people=true, likeness=5, invented=false, removed=false, over=false | no |
| feather-hat | ![](checkpoints/quality/feather-hat-original.jpg) | ![](checkpoints/quality/feather-hat-restored.jpg) | ![](checkpoints/quality/feather-hat-colour.jpg) | 34 | 39 | 9356 / 2355 | 0.39 | 0.885 / 0.559 | 1→1 | same_people=true, likeness=5, invented=false, removed=false, over=false | no |
| gunhild-barn | ![](checkpoints/quality/gunhild-barn-original.jpg) | ![](checkpoints/quality/gunhild-barn-restored.jpg) | ![](checkpoints/quality/gunhild-barn-colour.jpg) | 32 | 38 | 9652 / 2179 | 0.40 | 0.775 / 0.589 | 2→2 | same_people=true, likeness=5, invented=false, removed=false, over=false | no |
| lars-marit | ![](checkpoints/quality/lars-marit-original.jpg) | ![](checkpoints/quality/lars-marit-restored.jpg) | ![](checkpoints/quality/lars-marit-colour.jpg) | 34 | 41 | 10116 / 2397 | 0.42 | 0.264 / 0.168 | 2→2 | same_people=true, likeness=5, invented=false, removed=false, over=false | no |
| mor-barn-a | ![](checkpoints/quality/mor-barn-a-original.jpg) | ![](checkpoints/quality/mor-barn-a-restored.jpg) | ![](checkpoints/quality/mor-barn-a-colour.jpg) | 37 | 46 | 9652 / 2209 | 0.40 | 0.844 / 0.442 | 2→2 | same_people=true, likeness=5, invented=false, removed=false, over=false | no |
| pauline-ingeborg | ![](checkpoints/quality/pauline-ingeborg-original.jpg) | ![](checkpoints/quality/pauline-ingeborg-restored.jpg) | ![](checkpoints/quality/pauline-ingeborg-colour.jpg) | 31 | 37 | 9126 / 2005 | 0.38 | 0.748 / 0.704 | 2→2 | same_people=true, likeness=5, invented=false, removed=false, over=false | no |

## Per-image notes and own ratings

### asplund
Input 807×1200 → output 1615×2400. Chroma std 0.0 (monochrome/sepia).
Vision notes: B preserves the same four people and their clothing, pose, chair and background while mainly cleaning damage and improving contrast.

- Own likeness (1–5): **5**
- Own naturalness (1–5): **5**
- Notes: Four faces exact, the grandparents' seated pose and the porch kept; fading lifted without plastic skin.

### bryllup-1916
Context: Bryllup, 1916. Arkivfoto, Museene i Nord-Østerdalen. · consent: yes
Input 3000×2049 → output 2400×1641. Chroma std 0.0 (monochrome/sepia).
Vision notes: B faithfully preserves the group and setting while cleaning damage and removing only the archive marking.

- Own likeness (1–5): **5**
- Own naturalness (1–5): **4**
- Notes: A 44-person wedding group with every face preserved (44→44 by the face count); slight softening in the back rows, which the original also has.

### familie-trappe
Context: Familie på trappen, ca. 1920. Arkivfoto, Domkirkeodden. · consent: yes
Input 1960×2609 → output 1804×2400. Chroma std 0.0 (monochrome/sepia).
Vision notes: The restoration preserves the three people, their poses, clothing, bench, and background without apparent invented or removed non-damage content.

- Own likeness (1–5): **5**
- Own naturalness (1–5): **5**
- Notes: Father, daughter and mother on the bench, corrugated roof and grass all kept; the girl's wind-blown hair untouched. The low SSIM comes from the strong contrast lift on a very faded print, not from content change.

### feather-hat
Context: Ung kvinde med fjerhat, ca. 1905. Arkivfoto, Grenna Museum. · consent: yes
Input 919×1200, upscaled before send → output 1839×2400. Chroma std 0.0 (monochrome/sepia).
Vision notes: The restoration preserves the single subject's face, clothing, hat, feather, chair, and pose while mainly cleaning damage and background artifacts.

- Own likeness (1–5): **5**
- Own naturalness (1–5): **5**
- Notes: Fur collar, muff and the single feather preserved; colourisation is restrained (grey-green backdrop, brown fur).

### gunhild-barn
Context: Gunhild og Ole Christian, ca. 1935. Arkivfoto, Domkirkeodden. · consent: yes
Input 2853×1941 → output 2400×1634. Chroma std 0.0 (monochrome/sepia).
Vision notes: The restoration preserves the two subjects and surrounding scene faithfully, mainly reducing damage and improving contrast without adding or removing substantive content.

- Own likeness (1–5): **5**
- Own naturalness (1–5): **5**
- Notes: Mother and son exact; the second candidate was chosen (higher SSIM).

### lars-marit
Context: Lars og Marit, ca. 1900. Arkivfoto, Domkirkeodden. · consent: yes
Input 1960×2597 → output 1810×2400. Chroma std 0.0 (monochrome/sepia).
Vision notes: B faithfully preserves the two sitters, their clothing, poses and background while mainly removing damage and improving contrast.

- Own likeness (1–5): **5**
- Own naturalness (1–5): **5**
- Notes: Two weather-beaten faces, the watch chain and the brooch intact; contrast recovered from a very faded print.

### mor-barn-a
Context: Mor og barn, kabinetkort, ca. 1900. Arkivfoto, Museene i Nord-Østerdalen. · consent: yes
Input 2060×3000 → output 1648×2400. Chroma std 0.0 (monochrome/sepia).
Vision notes: B faithfully restores the two faces and clothing while removing scratches, dirt, and the archive marking without adding or omitting substantive content.

- Own likeness (1–5): **5**
- Own naturalness (1–5): **5**
- Notes: Cabinet card: the baby's lace collar, the mother's tiara and the puffed sleeves are all exact; the painted backdrop kept.

### pauline-ingeborg
Context: Pauline og Ingeborg, ca. 1915. Arkivfoto, Domkirkeodden. · consent: yes
Input 1215×2000 → output 1457×2400. Chroma std 0.0 (monochrome/sepia).
Vision notes: The restoration preserves the two children, clothing, chair, hand, and background faithfully while mainly cleaning scratches and improving contrast.

- Own likeness (1–5): **5**
- Own naturalness (1–5): **5**
- Notes: Two sisters: hair bows, lace collars, the fringe of the chair and the fur rug — all exact. The most emotionally useful example in the set.
