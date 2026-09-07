import { copy } from '@/lib/copy';
import { CONFIG } from '@/lib/config';
import { getFounder } from '@/lib/founder';
import { customerFormats, formatDkk, formatLabel, PRICING, EXTRA_PRINT_DKK, customerFormat } from '@/lib/pricing';

export const revalidate = 3600;

/**
 * /llms.txt — the site in plain text for AI assistants (llmstxt.org). Built from the same copy, pricing and
 * config as the page, so an assistant that quotes it quotes what a customer would see. Only public facts.
 */
export async function GET() {
  const c = copy();
  const f = getFounder();
  const base = CONFIG.siteUrl.replace(/\/$/, '');
  const sizes = customerFormats().map((fm) => `- ${formatLabel(fm)}: ${formatDkk(PRICING[fm].priceDkk)} inkl. moms, ramme (sort eller eg med passepartout og glas), digital fil i høj opløsning og fri fragt i Danmark`).join('\n');
  const faq = c.spoergsmaal.items.map((it) => `### ${it.q}\n${it.a}`).join('\n\n');
  const text = `# Billedarv

> Dansk service, der restaurerer gamle familiebilleder og leverer dem som print i ramme. Kunden tager et foto af det gamle billede med telefonen, ser resultatet på skærmen om cirka halvandet minut, og bestiller først bagefter. Et menneske gennemgår hvert billede, før det printes; kunden godkender det færdige billede på mail. Ligner det ikke, får kunden pengene tilbage.

Website: ${base}
Sprog: dansk. Marked: Danmark.
Virksomhed: ${f.company || f.name}${f.cvr ? `, CVR ${f.cvr}` : ''}${f.city ? `, ${f.city}` : ''}. Kontakt: ${f.email} (svar inden 24 timer). Ingen telefon.

## Sådan foregår det
1. ${c.saadan.titles[0]}: ${c.saadan.steps[0]}
2. ${c.saadan.titles[1]}: ${c.saadan.steps[1]}
3. ${c.saadan.titles[2]}: ${c.saadan.steps[2]}

## Priser (ét beløb, ingen tillæg)
${sizes}
- Ekstra eksemplar af samme billede, samme størrelse og ramme: ${formatDkk(EXTRA_PRINT_DKK[customerFormat()])} pr. stk., op til tre
- Det koster ikke noget at se resultatet. Betaling ved bestilling (Apple Pay, Google Pay eller kort via Stripe). Fuld refusion indtil kunden har godkendt det færdige billede.
${c.campaign.active ? `- Lanceringstilbud til og med ${c.campaign.until}: det første ekstra eksemplar er med i pakken uden beregning.\n` : ''}
## Levering og garanti
- Leveret ${c.season === 'jul' ? 'inden jul' : `inden ${CONFIG.deliveryDaysMax} hverdage`} efter kundens godkendelse. Fri fragt i Danmark.
- Kunden godkender det færdige billede på mail, før noget printes. Rettelser er med i prisen.
- Ligner det ikke, får kunden hele beløbet tilbage.
- Uploadede billeder bruges kun til bestillingen, gemmes i EU og slettes efter ${CONFIG.retentionUnpaidDays} dage uden bestilling (${CONFIG.retentionCompletedDays} dage efter levering ved bestilling).

## Ofte stillede spørgsmål
${faq}

## Sider
- ${base}/ — forsiden: eksempler (før/efter), priser, sådan foregår det, spørgsmål
- ${base}/handelsbetingelser — handelsbetingelser
- ${base}/privatliv — privatlivspolitik

Eksempelbillederne på forsiden er ikke kundebilleder: originalerne er fremstillet til at vise processen, restaureringen er kørt gennem den samme proces som kundens billede.
`;
  return new Response(text, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
