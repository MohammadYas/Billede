# assets/originals

Put at least **5 real, damaged family photographs** here (JPEG, PNG, HEIC, WebP or TIFF)
that you have **written permission** to use. Files in this folder are git-ignored.

Optional sidecar per photo, `<name>.md`:

```
year: 1961
context: Bryllup, 1961. Indsendt af Kirsten, Vejle.
consent: yes
```

Only pairs with `consent: yes` are exported to `public/examples/` and shown on the site.

Run the quality gate: `npm run quality:report`
Export approved pairs: `npm run examples:export`
