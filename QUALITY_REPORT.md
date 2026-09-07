# QUALITY_REPORT

Source: `assets/originals` (assets/originals). Model: gpt-image-2 at quality **medium**, 2 candidates, vision check gpt-5.5. Generated 2026-09-07T15:55:09.808Z.

Automated columns come from the pipeline. The two **own rating** columns (likeness, naturalness, 1–5) are filled in by hand after looking at the full-size files in `work/quality/<name>/` — see the notes under each image.

| Image | Original | Restored | Colour | Restore s | Total s | Tokens (img / vision) | Est. USD | SSIM (chosen / other) | Faces A→B | Vision JSON | Manual review |
|---|---|---|---|---|---|---|---|---|---|---|---|
| bryllup-1954 | ![](checkpoints\quality\bryllup-1954-original.jpg) | ![](checkpoints\quality\bryllup-1954-restored.jpg) | ![](checkpoints\quality\bryllup-1954-colour.jpg) | 40 | 46 | 9619 / 2043 | 0.39 | 0.721 / 0.473 | 2→2 | same_people=true, likeness=4, invented=false, removed=false, over=false | no |
| cykel-1944 | ![](checkpoints\quality\cykel-1944-original.jpg) | ![](checkpoints\quality\cykel-1944-restored.jpg) | ![](checkpoints\quality\cykel-1944-colour.jpg) | 43 | 49 | 9540 / 2159 | 0.39 | 0.478 / 0.180 | 1→1 | same_people=true, likeness=5, invented=false, removed=false, over=false | no |
| familie-1932 | ![](checkpoints\quality\familie-1932-original.jpg) | ![](checkpoints\quality\familie-1932-restored.jpg) | ![](checkpoints\quality\familie-1932-colour.jpg) | 44 | 56 | 9540 / 2166 | 0.39 | 0.422 / 0.389 | 6→6 | same_people=true, likeness=4, invented=false, removed=false, over=false | no |
| familie-ved-vandet-1948 | ![](checkpoints\quality\familie-ved-vandet-1948-original.jpg) | ![](checkpoints\quality\familie-ved-vandet-1948-restored.jpg) | ![](checkpoints\quality\familie-ved-vandet-1948-colour.jpg) | 41 | 48 | 9540 / 2151 | 0.39 | 0.760 / 0.705 | 4→4 | same_people=true, likeness=5, invented=false, removed=false, over=false | no |
| foedselsdag-1985 | ![](checkpoints\quality\foedselsdag-1985-original.jpg) | ![](checkpoints\quality\foedselsdag-1985-restored.jpg) | — | 39 | 45 | 6498 / 2185 | 0.27 | 0.878 / 0.820 | 2→2 | same_people=true, likeness=5, invented=false, removed=false, over=false | no |
| have-1976 | ![](checkpoints\quality\have-1976-original.jpg) | ![](checkpoints\quality\have-1976-restored.jpg) | — | 46 | 50 | 6498 / 2128 | 0.27 | 0.765 / 0.516 | 4→4 | same_people=true, likeness=5, invented=false, removed=false, over=false | no |
| portraet-1962 | ![](checkpoints\quality\portraet-1962-original.jpg) | ![](checkpoints\quality\portraet-1962-restored.jpg) | ![](checkpoints\quality\portraet-1962-colour.jpg) | 34 | 40 | 9540 / 2173 | 0.39 | 0.710 / 0.542 | 1→1 | same_people=true, likeness=5, invented=false, removed=false, over=false | no |

## Per-image notes and own ratings

### bryllup-1954
Context: Bryllup foran landsbykirken, ca. 1954. Eksempelbillede. · consent: yes
Input 1024×1536 → output 1600×2400. Chroma std 8.6 (monochrome/sepia).
Vision notes: The restoration preserves the two people, their faces, clothing, bouquet, and church setting while mainly removing damage and stains.

- Own likeness (1–5): _[fill in]_
- Own naturalness (1–5): _[fill in]_
- Notes: _[fill in]_

### cykel-1944
Context: Ung mand med cykel foran bindingsværkshuset, ca. 1944. Eksempelbillede. · consent: yes
Input 1024×1536 → output 1597×2400. Chroma std 8.7 (monochrome/sepia).
Vision notes: B faithfully restores the same man, bicycle, and background while removing damage and stains without adding or removing substantive content.

- Own likeness (1–5): _[fill in]_
- Own naturalness (1–5): _[fill in]_
- Notes: _[fill in]_

### familie-1932
Context: Tre generationer hos fotografen, ca. 1932. Eksempelbillede. · consent: yes
Input 1024×1536 → output 1597×2400. Chroma std 9.9 (monochrome/sepia).
Vision notes: B preserves the same six people and composition with damage removed and only modest facial smoothing and contrast changes.

- Own likeness (1–5): _[fill in]_
- Own naturalness (1–5): _[fill in]_
- Notes: _[fill in]_

### familie-ved-vandet-1948
Context: Familien ved vandet, ca. 1948. Eksempelbillede. · consent: yes
Input 1024×1536 → output 1597×2400. Chroma std 7.3 (monochrome/sepia).
Vision notes: The restoration preserves the four family members and background faithfully while mainly removing damage and improving contrast.

- Own likeness (1–5): _[fill in]_
- Own naturalness (1–5): _[fill in]_
- Notes: _[fill in]_

### foedselsdag-1985
Context: Fem år, lagkage og flag i køkkenet, ca. 1985. Eksempelbillede. · consent: yes
Input 1024×1536 → output 1597×2400. Chroma std 19.1 (colour).
Vision notes: The restoration removes damage and borders while preserving the visible people, faces, clothing, cake, and room details faithfully.

- Own likeness (1–5): _[fill in]_
- Own naturalness (1–5): _[fill in]_
- Notes: _[fill in]_

### have-1976
Context: Kaffe og jordbærkage i haven, sommeren 1976. Eksempelbillede. · consent: yes
Input 1024×1536 → output 1600×2400. Chroma std 15.8 (colour).
Vision notes: B is a faithful restoration with the same four people and scene, mainly removing damage and correcting color without adding or removing substantive content.

- Own likeness (1–5): _[fill in]_
- Own naturalness (1–5): _[fill in]_
- Notes: _[fill in]_

### portraet-1962
Context: Portræt fra pungen, ca. 1962. Eksempelbillede. · consent: yes
Input 1024×1536 → output 1597×2400. Chroma std 7.2 (monochrome/sepia).
Vision notes: The restoration faithfully preserves the single woman's face, hair, earrings, clothing, and pose while mainly removing damage and background wear.

- Own likeness (1–5): _[fill in]_
- Own naturalness (1–5): _[fill in]_
- Notes: _[fill in]_
