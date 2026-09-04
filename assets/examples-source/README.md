# assets/examples-source

Public-domain originals for the **colour** half of the example set on the front page.

Every photograph in the current set (`public/examples/examples.json`) is a black-and-white archive
photograph from 1850–1935. That is the wrong evidence for the buyer we are advertising to: what she
has in the drawer is a colour snapshot from the second half of the century, dark, yellowed and
colour-shifted — and the site currently shows her nothing that looks like it.

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
