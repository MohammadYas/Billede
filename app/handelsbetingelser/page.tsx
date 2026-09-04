import LegalPage from '@/components/LegalPage';
import { getFounder } from '@/lib/founder';
import { CONFIG, formatCutoffDate } from '@/lib/config';
import { PRICING, customerFormat, formatDkk, formatLabel } from '@/lib/pricing';

export const metadata = { title: 'Handelsbetingelser – Genfundet' };

export default function Handelsbetingelser() {
  const f = getFounder();
  const fmt = customerFormat();
  const saelger = [f.name, f.cvr ? `CVR ${f.cvr}` : '', f.address, f.email].filter(Boolean).join(', ') || '[Udfyld: navn, CVR, adresse og e-mail]';
  return (
    <LegalPage title="Handelsbetingelser" updated="3. september 2026">
      <h2>Sælger</h2>
      <p>{saelger}.</p>

      <h2>Produktet</h2>
      <p>Restaurering af ét fotografi ud fra det foto, du uploader, leveret som indrammet print i {formatLabel(fmt)} samt en digital fil i høj opløsning. Pris {formatDkk(PRICING[fmt].priceDkk)} inkl. moms og fri fragt i Danmark. Restaureringen laves af en automatisk billedmodel og finjusteres manuelt. Resultatet afhænger af det foto, du sender: jo skarpere og jævnere belyst, jo bedre.</p>

      <h2>Sådan foregår det</h2>
      <ul>
        <li>Du uploader og ser et preview med vandmærke. Prisen er den samme, uanset hvor beskadiget billedet er.</li>
        <li>Du betaler. Inden 48 timer sender vi det færdige billede til godkendelse på mail.</li>
        <li>Du godkender – eller beder om en ændring, så mange gange det er rimeligt. Vi printer først, når du har godkendt.</li>
        <li>Efter godkendelse printer, indrammer og sender vi. Levering inden {CONFIG.deliveryDaysMax} hverdage. Bestillinger godkendt senest {formatCutoffDate()} leveres inden jul.</li>
      </ul>

      <h2>Fortrydelsesret</h2>
      <p>Du har som forbruger 14 dages fortrydelsesret fra bestillingen. Fordi den digitale fil leveres, når du godkender, og printet fremstilles specielt til dig, bortfalder fortrydelsesretten, når den digitale fil er leveret, og for printet, når produktionen er sat i gang efter din godkendelse. Det accepterer du udtrykkeligt ved betalingen. Indtil du har godkendt, kan du fortryde uden begrundelse og få hele beløbet retur.</p>

      <h2>Ligner det ikke, får du pengene tilbage</h2>
      <p>Hvis du efter at have set det færdige billede ikke synes, det ligner, refunderer vi hele beløbet – også efter en eller flere ændringsrunder. Det er dig, der afgør det.</p>

      <h2>Reklamation</h2>
      <p>Du har 2 års reklamationsret efter købeloven. Er printet eller rammen beskadiget ved levering, sender vi et nyt uden beregning – send os et foto inden for rimelig tid.</p>

      <h2>Betaling</h2>
      <p>Betaling sker via Stripe med de betalingsmetoder, der vises ved kassen. Beløbet trækkes ved bestilling.</p>

      <h2>Dine billeder</h2>
      <p>Du bekræfter, at du må lade os behandle det billede, du uploader. Vi bruger det kun til din bestilling. Se <a href="/privatliv">Privatliv</a>.</p>

      <h2>Klager</h2>
      <p>Skriv først til os. Kan vi ikke løse det, kan du klage til Center for Klageløsning, Nævnenes Hus, Toldboden 2, 8800 Viborg, www.naevneneshus.dk, eller via EU-Kommissionens klageportal ec.europa.eu/odr.</p>
    </LegalPage>
  );
}
