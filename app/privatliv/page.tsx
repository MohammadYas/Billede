import LegalPage from '@/components/LegalPage';
import { getFounder } from '@/lib/founder';
import { CONFIG } from '@/lib/config';

export const metadata = { title: 'Privatliv – Genfundet' };

export default function Privatliv() {
  const f = getFounder();
  const ansvarlig = [f.name, f.cvr ? `CVR ${f.cvr}` : '', f.address, f.email, f.phone].filter(Boolean).join(', ') || '[Udfyld: navn, CVR, adresse, e-mail, telefon]';
  return (
    <LegalPage title="Sådan behandler vi dine oplysninger" updated="3. september 2026">
      <p>Genfundet restaurerer gamle fotografier og leverer dem som indrammede print. For at gøre det behandler vi nogle personoplysninger. Her står hvilke, hvorfor, hvor længe – og hvad du kan kræve.</p>

      <h2>Dataansvarlig</h2>
      <p>{ansvarlig}.</p>

      <h2>Hvilke oplysninger og hvorfor</h2>
      <ul>
        <li><strong>Dit billede.</strong> Det foto, du uploader, og de restaurerede versioner. Formål: at lave dit preview og, hvis du bestiller, det færdige print. Retsgrundlag: opfyldelse af aftalen med dig (databeskyttelsesforordningens artikel 6, stk. 1, litra b). Billeder kan indeholde oplysninger om andre personer (dine slægtninge); vi behandler dem alene for at levere din bestilling.</li>
        <li><strong>Kontakt- og leveringsoplysninger.</strong> Navn, e-mail, telefon og adresse, som du oplyser ved betaling. Formål: levering, godkendelsesmail, kvittering. Retsgrundlag: aftalen samt bogføringsloven (opbevaring af bilag i 5 år).</li>
        <li><strong>Betalingsoplysninger.</strong> Behandles af Stripe. Vi ser aldrig dit kortnummer.</li>
        <li><strong>Teknisk session.</strong> En anonym sessions-cookie (gf_sid), der knytter dit preview til din browser, så kun du kan se det, og en cookie i 7 dage (gf_utm) med kampagneparametrene fra det link, du kom fra, så vi kan se, hvilken annonce der virkede. Begge er nødvendige for tjenesten og deles ikke.</li>
        <li><strong>Annoncemåling.</strong> Kun hvis du siger ja i banneret, indlæser vi Meta Pixel, som registrerer besøg, upload, preview og køb hos Meta. Retsgrundlag: dit samtykke, som du kan trække tilbage ved at slette cookien gf_consent eller skrive til os. Ved køb sender vi desuden ordre-id, beløb og en hashet (ulæselig) udgave af din e-mail og dit telefonnummer til Meta fra vores server, så vi kan måle, om annoncen førte til et køb – kun hvis du har sagt ja til Meta-cookien.</li>
      </ul>

      <h2>Hvem hjælper os (databehandlere)</h2>
      <ul>
        <li><strong>Supabase</strong> (database og lagring af billeder, EU-region Irland).</li>
        <li><strong>OpenAI</strong> (den automatiske restaurering og kvalitetstjek af billedet). Billedet sendes til OpenAI's API; ifølge OpenAI's API-vilkår bruges data sendt via API ikke til træning af deres modeller. Overførsel kan ske til USA; grundlaget er EU's standardkontraktbestemmelser og EU-US Data Privacy Framework, hvor det gælder.</li>
        <li><strong>Stripe</strong> (betaling). Kan overføre til USA under samme grundlag.</li>
        <li><strong>Resend</strong> (afsendelse af mails).</li>
        <li><strong>Netlify</strong> (hosting af hjemmesiden, EU-region).</li>
        <li><strong>Printpartner:</strong> CEWE (print og ramme), som modtager dit færdige billede, navn og leveringsadresse for at kunne producere og sende.</li>
        <li><strong>Meta</strong> (kun ved samtykke, se ovenfor).</li>
      </ul>

      <h2>Hvor længe</h2>
      <ul>
        <li>Uploads og previews uden bestilling: slettes automatisk efter {CONFIG.retentionUnpaidDays} dage – eller straks, hvis du beder om det.</li>
        <li>Billeder til en gennemført bestilling: slettes {CONFIG.retentionCompletedDays} dage efter levering.</li>
        <li>Ordre- og betalingsoplysninger: 5 år efter regnskabsårets udløb (bogføringsloven).</li>
        <li>Hvis du særskilt har givet lov til, at dit før/efter-billede må vises som eksempel på siden: indtil du trækker tilladelsen tilbage. Det spørger vi aldrig om ved betalingen – kun i en separat mail, og et nej ændrer intet ved din ordre.</li>
      </ul>

      <h2>Dine rettigheder</h2>
      <p>Du kan få indsigt i, rettet, slettet eller udleveret dine oplysninger, gøre indsigelse og trække samtykke tilbage. Skriv til {f.email || '[e-mail]'}. Du kan klage til Datatilsynet, Carl Jacobsens Vej 35, 2500 Valby, www.datatilsynet.dk.</p>

      <h2>Det, vi ikke påstår</h2>
      <p>Vi siger ikke, at dine billeder "aldrig forlader EU", at noget er "100 % sikkert" eller "GDPR-certificeret". Vi siger, hvad vi gør: lagrer i EU, sender billedet til de leverandører, der er nævnt ovenfor, sletter automatisk og deler aldrig med andre.</p>
    </LegalPage>
  );
}
