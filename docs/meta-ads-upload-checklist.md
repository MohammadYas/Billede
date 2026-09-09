# Upload-tjekliste, Meta Ads Manager (kampagne META_Sales_DK45-70_Lancering_2026-09)

Filerne ligger i `C:\Users\mo\Desktop\Billede\work\ads\final\`. Pr. annonce: upload 4:5, vælg "Rediger pr.
placering", giv 1:1 til kvadratiske placeringer og 9:16 til Stories/Reels. Teksterne står i
`docs/meta-ads-prompt.md`, Fase 3.

| Annoncesæt | Annonce | 4:5 | 1:1 | 9:16 |
|---|---|---|---|---|
| A (koldt) | memory | memory-4x5.jpg | memory-1x1.jpg | memory-9x16.jpg |
| A | gift | gift-4x5.jpg | gift-1x1.jpg | gift-9x16.jpg |
| A | reveal | reveal-4x5.jpg | reveal-1x1.jpg | reveal-9x16.jpg |
| A | original | original-4x5.jpg | original-1x1.jpg | original-9x16.jpg |
| A | physical | physical-h2-4x5.jpg | physical-h2-1x1.jpg | physical-h2-9x16.jpg |
| B (retargeting) | offer | offer-4x5.jpg | offer-1x1.jpg | offer-9x16.jpg |
| B | trust | trust-4x5.jpg | trust-1x1.jpg | trust-9x16.jpg |
| B | physical | physical-h2-4x5.jpg | physical-h2-1x1.jpg | physical-h2-9x16.jpg |

Før Udgiv, i denne rækkefølge:

1. Opret Facebook-siden "Billedearv" (Business Settings → Pages → Add → Create a new Page). Skift
   identiteten på alle otte annoncer fra LeasingScan til Billedearv.
2. Netlify → Environment variables: `NEXT_PUBLIC_META_PIXEL_ID=1430023292388175`, `META_CAPI_TOKEN`
   (fra Events Manager → pixel → Settings → Conversions API → Generate token), `META_DOMAIN_VERIFICATION`
   (content-værdien fra Business Settings → Domains → billedearv.dk → Meta-tag). Udløs deploy.
3. Events Manager → Test events: åbn billedearv.dk, accepter cookies, upload et testbillede, se
   PageView, ViewContent og PreviewShown (Browser + Server, "Deduplicated").
4. Custom conversion PreviewShown: skift reglen fra URL til eventet. Sæt A: skift konverteringshændelse
   fra Visning af indhold til PreviewShown.
5. Startdato på begge sæt: sæt til dagen efter du publicerer, kl. 09.00.
6. Kampagne → Forbrugsgrænse (Campaign spending limit): 1.500 kr. Stop-regel: 0 køb efter 1.500 kr. → pause.
7. Udgiv sæt A. Sæt B forbliver pauset, til pixelen har fyldt målgruppen (typisk en uge).
