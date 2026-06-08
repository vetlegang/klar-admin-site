import type { Alert, Client } from './types';

export interface EmailTemplate {
  subject: string;
  body: string;
  to?: string;
}

export function generateInternalAlertEmail(
  alert: Alert,
  assignedUser: string,
  client: Client
): EmailTemplate {
  const firstName = assignedUser.split(' ')[0];
  const dueLine = alert.dueDate
    ? `Frist: ${new Date(alert.dueDate).toLocaleDateString('nb-NO', { day: '2-digit', month: 'long' })}`
    : '';

  return {
    subject: `Klyr-varsel: ${alert.title}`,
    to: assignedUser === 'Vetle G.' ? 'vetle@klyr.no' : 'markus@klyr.no',
    body: `Hei ${firstName},

Dette må følges opp:

Kunde: ${client.bedrift}
Varsel: ${alert.title}
Hva må gjøres: ${alert.recommendedAction}
${dueLine}

Åpne Klyr Admin for å håndtere dette.

Mvh
Klyr Admin`,
  };
}

export function generateDailySummaryEmail(
  user: string,
  alerts: Alert[]
): EmailTemplate {
  const firstName = user.split(' ')[0];
  const critical = alerts.filter((a) => a.severity === 'critical');
  const high = alerts.filter((a) => a.severity === 'high');

  const lines = alerts
    .slice(0, 10)
    .map((a) => `• [${a.severity.toUpperCase()}] ${a.clientName}: ${a.title}`)
    .join('\n');

  return {
    subject: `Klyr daglig oppsummering – ${alerts.length} åpne varsler`,
    to: user === 'Vetle G.' ? 'vetle@klyr.no' : 'markus@klyr.no',
    body: `Hei ${firstName},

Her er en oppsummering av åpne varsler tildelt deg:

Kritiske: ${critical.length}
Høy prioritet: ${high.length}
Totalt åpne: ${alerts.length}

${lines}

Logg inn på Klyr Admin for full oversikt.

Mvh
Klyr Admin`,
  };
}

export function generateFollowUpEmail(
  client: Client,
  user: string
): EmailTemplate {
  const statusMessages: Record<string, string> = {
    'Lead': 'Vi hjalp nylig noen i din bransje med å skalere sin annonsering på Meta, og tenkte det kunne være relevant for dere.',
    'Kontaktet': 'Takk for at du tok deg tid – jeg ønsker bare å følge opp og høre om du har hatt tid til å tenke over det vi snakket om.',
    'Møte booket': 'Gleder meg til møtet vårt. Er det noe du vil vi skal forberede eller gå gjennom spesielt?',
    'Tilbud sendt': 'Sender en rask oppfølging på tilbudet vi sendte. Har du hatt mulighet til å se gjennom det, eller er det noe du lurer på?',
    'Prøvepakke betalt': 'Takk for at dere er i gang med prøvepakken! Vi er klare til å starte og tar kontakt for å koordinere onboarding.',
    'Onboarding': 'Vi er godt i gang med onboarding. Vil bare sjekke at alt er klart fra din side.',
    'Runde 1 produksjon': 'Vi er i full produksjon nå og holder deg oppdatert så snart annonsene er klare.',
    'Ads live / testing': 'Annonsene er live og vi overvåker resultatene løpende. Sender deg en oppdatering med tallene snart.',
    'Runde 2': 'Vi er godt i gang med Runde 2. Resultatene fra Runde 1 gir oss et solid grunnlag for å skalere.',
    'Fast kunde / retainer': 'Bare en rask sjekk – alt løper fint? Vi vil sørge for at du er fornøyd og at vi leverer på målene.',
    'Pauset': 'Håper alt går bra hos dere. Vi ser frem til å gjenoppta samarbeidet når dere er klare.',
  };

  const body = statusMessages[client.status] ?? 'Bare en rask oppfølging – er det noe vi kan hjelpe deg med?';
  const nextLine = client.nesteAction ? `\nNeste steg fra vår side er: ${client.nesteAction}.` : '';

  return {
    subject: 'Oppfølging fra Klyr',
    to: client.epost,
    body: `Hei ${client.kontaktperson},

${body}
${nextLine}

Gi meg gjerne en lyd når det passer.

Mvh
${user}
Klyr`,
  };
}

export function generateOffboardingEmail(
  client: Client,
  user: string
): EmailTemplate {
  return {
    subject: 'Takk for samarbeidet',
    to: client.epost,
    body: `Hei ${client.kontaktperson},

Tusen takk for samarbeidet så langt.

Vi setter pris på at dere har valgt å jobbe med Klyr, og håper leveransen har vært nyttig for dere.

Dersom dere ønsker å starte opp igjen senere, eller trenger hjelp med nye kampanjer, er det bare å ta kontakt.

Ønsker dere masse lykke til videre.

Mvh
${user}
Klyr`,
  };
}
