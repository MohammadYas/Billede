# ANTI_SLOP — forbid-list for Genfundet

Research summary (2026-09): every AI site-builder (Lovable, v0, Bolt, Cursor defaults) converges on the
statistical average of Tailwind tutorials and shadcn/ui: Inter, indigo-to-violet gradients, a centred hero
with a badge above the H1 and two buttons, three rounded icon cards, a bento grid, a stat row, testimonial
carousels, glass cards on dark, "Built with ❤️". Readers now recognise the cluster from twenty feet away.
Sources: DEV Community ("Why AI websites all look the same", "Blame Tailwind's indigo-500"), slopdar.com
(10 signs), developersdigest.tech (16 patterns), 925studios.co (fonts & gradients), Bhuwan Garbuja,
Publishd. The opposite of slop is not "more design" — it is fewer, specific, physical decisions.

Every line below is audited pass/fail in QA.md §Anti-slop audit with a screenshot reference.
"Opposite" is what Genfundet does instead.

## A. Typography
| # | Forbidden | Opposite on Genfundet |
|---|---|---|
| A1 | Inter / Roboto / Poppins / Manrope / Space Grotesk / Plus Jakarta / Geist, and per impeccable's 2026 detector also Fraunces and Instrument Sans, as display or body | Newsreader (display, optical size on) + Public Sans (UI/body), self-hosted |
| A2 | Default Tailwind type scale (text-xl/2xl/4xl steps) | Hand-set scale, tight display leading (1.02–1.08), generous body leading (1.55) |
| A3 | Gradient text, single italic serif accent word inside a sans headline | Plain ink on paper; italics only for real emphasis or captions |
| A4 | All-caps section labels / eyebrow / kicker above the H1, "badge above H1" | Headings carry their own weight. No eyebrow anywhere |
| A5 | Weightless headline ("Build faster. Ship smarter."), adjective triads, rhetorical questions, exclamation marks | Concrete Danish sentences with an object in them (the photo, the frame, the tree) |
| A6 | Tracking at −0.04em or tighter, or fixed letter-spacing at all sizes | Display −0.02em, body 0 |

## B. Colour and surface
| # | Forbidden | Opposite |
|---|---|---|
| B1 | Purple / indigo / violet / lavender anywhere | Warm paper `#F6F1E8`, ink `#1C1A17`, one deep green `#2F4A3A`, hairline `#D9D1C3` |
| B2 | Multi-stop gradients, animated gradients, glowing colored box-shadows, neon on dark | Flat surfaces; the only "glow" is daylight in a photograph |
| B3 | Glassmorphism, frosted cards, `backdrop-filter` as decoration | Opaque paper. The only blur is `prefers-reduced-transparency`-safe: none |
| B4 | Pure white `#FFF` or pure black `#000` as surfaces/text | Off-white paper and warm near-black ink only |
| B5 | Permanent dark mode by default; medium-grey body text | Light paper by default; body text ≥ 4.5:1 (ink on paper = 14.6:1) |
| B6 | 1px light-grey borders on everything; heavy drop shadows; "ghost card" (border + wide shadow) | Hairlines only as section rules; the only shadow is the one the frame casts in the mockup |

## C. Layout
| # | Forbidden | Opposite |
|---|---|---|
| C1 | Centred hero: headline + subline + two buttons + floating mockup | Left-set headline under a full-bleed photograph; one button |
| C2 | 3-column icon feature grid, bento grid, "Why choose us", "Trusted by" logo row, stat banner row | Three sentences with three small real photographs, ragged rhythm |
| C3 | Numbered circles in a row (01/02/03), timeline with dots | Numbers only where a sequence matters, set as text, no circles |
| C4 | Everything in a card; identical card heights; nested cards; FAQ styled as cards | No cards. FAQ = hairline accordion. Offer = one paragraph with a price |
| C5 | Uniform 16–24px radius everywhere; pill buttons | Radius 0–4px. Frame corners are square because frames are square |
| C6 | Symmetric everything, equal columns, identical section padding | Asymmetric measure (text max 34em), images bleed, per-section rhythm |
| C7 | Testimonial carousel, avatar rows, star ratings, review counts, press logos, awards, "3 people are viewing", timers | Nothing that is not real. If it is not real, the section does not exist |
| C8 | Sticky glass header with logo + nav + CTA | No header navigation. Wordmark, then the photograph |

## D. Imagery and icons
| # | Forbidden | Opposite |
|---|---|---|
| D1 | Emoji, sparkle icons, generic thin-line icons as bullets or as "features" | No icon system on the landing page. Real photographs do the pointing |
| D2 | Stock photography of people, AI-generated "old photos", illustrated blobs, abstract 3D shapes, `feTurbulence` grain | Only real restored photographs from `assets/originals` with consent; captions name provenance |
| D3 | Checkmark feature lists | Prose |
| D4 | Floating device mockups, tilted 3D frames, glossy renders | A frame mockup composed from a real wall photo by code, soft natural shadow |

## E. Copy
| # | Forbidden | Opposite |
|---|---|---|
| E1 | "Unlock", "Seamless", "Effortless", "Elevate", "Empower", "Transform your…", "Maximize", "Revolutionary", "Cutting-edge", "AI-powered" as a selling point | Short Danish sentences. Technology mentioned once, as "AI og Mohammad" |
| E2 | "Gratis", "Free trial", "Get started", "Learn more", "Book a demo" | "Se dit billede nu" and "Bestil mit billede – 599 kr." |
| E3 | Placeholder text, "[Your Company]", lorem ipsum, "Built with ❤️", em-dash cascades | Real founder name, CVR, address (or the section is absent until real) |
| E4 | Translated-sounding Danish, English number formatting ("599 kr" without period, "1,500") | "599 kr.", "1.500 kr.", "7 hverdage" only from config |

## F. Motion
| # | Forbidden | Opposite |
|---|---|---|
| F1 | Fade-up on scroll for every section, staggered reveals, parallax, typewriter, counters | Zero scroll animation |
| F2 | Hover-lift on cards, scale-on-hover, animated gradient borders | Instant state changes; press feedback via colour only |
| F3 | Skeleton shimmer as decoration, fake progress bars, fake "processing steps" | Real stage names from the real pipeline; a plain line of progress |
| F4 | Autoplaying carousels, decorative loops | Motion only where comparison is the content: the hero slider reveals once (1.6 s ease-out), then touch-driven; each example carries one comparison form (wipe, lens, hold, or a slow dissolve that pauses off-screen, on touch and under `prefers-reduced-motion`). Nothing else on the page moves |

## G. Structure and meta
| # | Forbidden | Opposite |
|---|---|---|
| G1 | Framework favicon, missing OG image, generic `<title>` | Wordmark favicon, OG image = a real before/after, title "Genfundet – gamle billeder, restaureret og indrammet" |
| G2 | Empty About / Contact, no phone, no CVR | Founder section with live phone and mail, CVR in footer |
| G3 | Builder fingerprints (lovable.app, bolt, "vibe" in class names) | Own domain, own CSS, no default components |
| G4 | shadcn/ui, Radix, lucide defaults left untouched | No UI kit. Seven hand-written components |
