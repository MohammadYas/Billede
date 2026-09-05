import LegalPage from '@/components/LegalPage';
import { getFounder, missing } from '@/lib/founder';
import { CONFIG, formatCutoffDate } from '@/lib/config';
import { PRICING, customerFormat, customerFormats, formatDkk, formatLabel, EXTRA_PRINT_DKK } from '@/lib/pricing';

export const metadata = { title: 'Handelsbetingelser – Genfundet' };

export default function Handelsbetingelser() {
  const f = getFounder();
  const fmt = customerFormat();
  // e-handelsloven §7 requires name, address and CVR. Each missing field says so out loud, because
  // a partial identity that *looks* complete is the failure mode: name + e-mail alone renders as if
  // nothing were missing.
  const saelger = [
    f.name || missing('navn'),
    f.cvr ? `CVR ${f.cvr}` : missing('CVR'),
    f.address || missing('adresse'),
    f.email || missing('e-mail'),
  ].filter(Boolean).join(', ');
  return (
    <LegalPage title="Handelsbetingelser" updated="3. september 2026">
      <h2>Sælger</h2>
      <p>{saelger}.</p>

      <h2>Produktet</h2>
      <p>Restaurering af ét fotografi ud fra det foto, du uploader, leveret som print i ramme med passepartout og glas, samt en digital fil i høj opløsning. Du vælger størrelse og ramme (sort eller eg – samme pris), og du kan lægge ekstra eksemplarer af samme billede til. Alle priser er inkl. moms og fri fragt i Danmark:</p>
      <ul>
        {customerFormats().map((f2) => (
          <li key={f2}>{formatLabel(f2)}: {formatDkk(PRICING[f2].priceDkk)}.</li>
        ))}
        <li>Ekstra eksemplar af samme billede i samme størrelse og ramme: {formatDkk(EXTRA_PRINT_DKK[customerFormat()])} pr. stk., op til tre.</li>
      </ul>
      <p>Restaureringen laves af en automatisk billedmodel og finjusteres manuelt. Resultatet afhænger af det foto, du sender: jo skarpere og jævnere belyst, jo bedre.</p>

      <h2>Sådan foregår det</h2>
      <ul>
        <li>Du uploader og ser et preview med vandmærke. Prisen er den samme, uanset hvor beskadiget billedet er.</li>
        <li>Du betaler. Inden 48 timer sender vi det færdige billede til godkendelse på mail.</li>
        <li>Du godkender – eller beder om en ændring, så mange gange det er rimeligt. Vi printer først, når du har godkendt.</li>
        <li>Efter godkendelse printer, indrammer og sender vi. Levering inden {CONFIG.deliveryDaysMax} hverdage. Bestillinger afgivet senest {formatCutoffDate()} og godkendt inden 48 timer efter godkendelsesmailen leveres inden jul.</li>
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
      {/*
        JURIDISK REVIEW — ikke ændret på eget initiativ. Sidste sætning henviser til EU-Kommissionens
        ODR-klageportal (ec.europa.eu/odr). Den platform blev lukket i juli 2025, da ODR-forordningen
        blev ophævet, så henvisningen sender formentlig kunden et sted hen, der ikke længere tager imod
        klager. Henvisningen til Center for Klageløsning står ved magt. Teksten er bevidst ladt urørt:
        det er en oplysningspligt, ikke en formulering, og erstatningsteksten skal skrives af nogen med
        juridisk ansvar. Se HANDOFF.md, punkt B.
      */}
      <p>Skriv først til os. Kan vi ikke løse det, kan du klage til Center for Klageløsning, Nævnenes Hus, Toldboden 2, 8800 Viborg, www.naevneneshus.dk, eller via EU-Kommissionens klageportal ec.europa.eu/odr.</p>
    </LegalPage>
  );
}
