# assets/examples-source

Every original behind `public/examples/`, and the sidecar that decides whether it is shown.

Every photograph in the current set (`public/examples/examples.json`) is a black-and-white archive
photograph from 1850–1935. That is the wrong evidence for the buyer we are advertising to: what she
has in the drawer is a colour snapshot from the second half of the century, dark, yellowed and
colour-shifted — and the site currently shows her nothing that looks like it.

### The colour half

These seven are the closest freely usable thing that exists: **colour transparencies shot for the
U.S. Farm Security Administration between 1940 and 1942** — ordinary families, at home, on a bad
day for the film. Kodachrome and Agfacolor of that age has exactly the fault the drawer photo has:
a heavy cast, blocked shadows, dust and scratches on the emulsion. They are works of the U.S.
federal government and therefore in the public domain worldwide; each `.md` sidecar names the
photographer, the Commons file and the licence.

Unlike `assets/originals/` (customer photographs, git-ignored), these are committed: they are
public documents, and the example set has to be rebuildable without a second archive hunt.

## Rebuilding

```
npm run examples:sources   # re-download from Wikimedia Commons and trim the slide mounts
npm run examples:colour    # run the restoration pipeline at print quality (needs OPENAI_API_KEY)
npm run examples:export -- --source work/pd-originals,work/pd-originals-2,work/pd-originals-3,assets/examples-source --placeholder
```

`examples:sources` is what produced the files that are committed here: it downloads the archive
master (up to 138 MB per file), finds the photograph inside the cardboard slide mount by pixel
variance, and writes a 3000 px JPEG. A customer never photographs the mount, so neither do we.

`consent: no` in a sidecar keeps that pair out of `examples.json` — `modelfly` and `pige-lade` are
held back because the faces are too small to carry a likeness comparison. They are kept here so the
choice can be revisited without re-downloading.

Captions must stay in the form `Motiv, ÅÅÅÅ. Arkivfoto, kilde.` — `app/page.tsx` parses it, and the
front page prints "· arkivfoto" next to the hero so no visitor mistakes these for customer work.
The day real customer photographs replace them, drop `--placeholder` and delete the honesty note in
`lib/copy.ts` (`eksempler.placeholderNote`).

### The vernacular half

Seven found family snapshots from the simpleinsomnia collection (Flickr, CC BY 2.0), via Wikimedia
Commons. Torn across the middle and taped back together, bleached almost blank, foxed, water-stained,
a corner gone. No accession number, no plate edge, no gilt mat — someone's photograph, kept badly.
They have no date and none is invented: the caption says `årstal ukendt`, and `app/page.tsx` accepts it.

### What is retired, and why

`consent: no` plus a `retired:` line keeps a pair out of `examples.json` and records the reason, so the
next export does not quietly bring it back. Ten are retired today: four tintypes in gilt mats, an 1850
daguerreotype, a glass negative, two press negatives, and the two colour originals whose faces are too
small to carry a likeness comparison. They were removed for looking like museum objects, not for being
badly restored — the restorations are fine; they are simply not what a customer has in a drawer.

### Sidecar fields

```
context:      the caption, exactly "Motiv, ÅÅÅÅ. Kilde." or "Motiv, årstal ukendt. Kilde."
source:       the file this came from
rights:       the licence, in the words of the licensor
consent:      yes | no  — only yes is exported
retired:      why a no is a no
order:        position on the page; lowest is the hero
mode:         wipe | lens | hold | fade — how the before/after is revealed
detail:       x,y (0-1) of the point the "Tæt på" crop centres on
detailLabel:  what the visitor is being asked to look at
colour:       yes to also export the colourised version
```

### How the order is chosen

`order:` is a ranking by evidence, not by date. The question for every pair is whether a visitor who
reads nothing understands the repair from the two images alone. The pair that answers loudest is the
hero; the ones whose difference needs explaining go last, behind what the page renders.

Two shape rules ride along: the hero is cropped to 4/3 whatever it is, and the swipe row must open on a
portrait card — a landscape card first leaves dead paper under it on a phone.
