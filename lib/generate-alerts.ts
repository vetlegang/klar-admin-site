import type { Client, Alert, AlertSeverity } from './types';

const TODAY = new Date().toISOString().split('T')[0];

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const t = new Date(TODAY);
  return Math.floor((t.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return dateStr < TODAY;
}

const PAST_OFFER_STAGES = new Set([
  'Prøvepakke betalt',
  'Onboarding',
  'Runde 1 produksjon',
  'Ads live / testing',
  'Runde 2',
  'Egendefinert pakke',
  'Fast kunde / retainer',
]);

const STATUS_STILLE_EXCLUDED = new Set([
  'Fast kunde / retainer',
  'Lead',
  'Pauset',
  'Tapt',
]);

export function generateAlerts(clients: Client[]): Alert[] {
  const alerts: Alert[] = [];

  for (const c of clients) {
    if (['Tapt', 'Avsluttet'].includes(c.status)) continue;

    // Offboarding alerts for Sagt opp clients
    if (c.status === 'Sagt opp') {
      if (!c.offboardingEmailSent) {
        push(
          'offboarding_takkemail',
          'Takkemail ikke sendt',
          'Kunden er sagt opp men takk-for-samarbeidet-mail er ikke sendt.',
          'high',
          {
            actionLabel: 'Lag takkemail',
            recommendedAction: 'Send en avsluttende e-post til kunden.',
          }
        );
      }
      if (!c.finalInvoiceSent) {
        push(
          'offboarding_faktura',
          'Siste faktura ikke sendt',
          'Kunden er sagt opp men siste faktura er ikke sendt.',
          'high',
          {
            actionLabel: 'Send faktura',
            recommendedAction: 'Send sluttfaktura til kunden.',
          }
        );
      }
      if (!c.deliveryCompleted) {
        push(
          'offboarding_leveranse',
          'Leveranse ikke ferdig',
          'Kunden er sagt opp men leveransen er ikke markert som fullført.',
          'medium',
          {
            actionLabel: 'Merk ferdig',
            recommendedAction: 'Verifiser at all leveranse er fullført og levert.',
          }
        );
      }
      continue; // skip normal alerts for Sagt opp clients
    }

    function push(
      type: Alert['type'],
      title: string,
      description: string,
      severity: AlertSeverity,
      opts: Partial<Alert> = {}
    ) {
      alerts.push({
        id: `${c.id}-${type}`,
        clientId: c.id,
        clientName: c.bedrift,
        type,
        title,
        description,
        severity,
        assignedTo: c.ansvarlig,
        createdAt: TODAY,
        status: 'open',
        actionLabel: opts.actionLabel ?? 'Åpne kunde',
        recommendedAction: opts.recommendedAction ?? '',
        ...opts,
      });
    }

    // 1. Forfalt frist
    if (isOverdue(c.nesteFrist)) {
      const days = daysSince(c.nesteFrist!);
      push(
        'forfalt_frist',
        'Forfalt frist',
        `Fristen gikk ut for ${days} dag${days === 1 ? '' : 'er'} siden. Neste action: ${c.nesteAction || 'ikke satt'}`,
        days >= 3 ? 'critical' : 'high',
        {
          dueDate: c.nesteFrist ?? undefined,
          actionLabel: 'Følg opp nå',
          recommendedAction: c.nesteAction || 'Kontakt kunden og oppdater plan.',
        }
      );
    }

    // 1b. Frist nærmer seg (1-3 dager frem i tid)
    if (c.nesteFrist && !isOverdue(c.nesteFrist)) {
      const daysUntil = Math.ceil(
        (new Date(c.nesteFrist).getTime() - new Date(TODAY).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntil <= 3) {
        push(
          'forfalt_frist',
          daysUntil === 0 ? 'Frist i dag' : `Frist om ${daysUntil} dag${daysUntil === 1 ? '' : 'er'}`,
          `${c.nesteAction || 'Neste action'} skal være ferdig ${daysUntil === 0 ? 'i dag' : `om ${daysUntil} dag${daysUntil === 1 ? '' : 'er'}`} (${c.nesteFrist}).`,
          daysUntil <= 1 ? 'critical' : 'high',
          {
            dueDate: c.nesteFrist ?? undefined,
            actionLabel: 'Gjør klar nå',
            recommendedAction: c.nesteAction || 'Forbered og lever til kunden.',
          }
        );
      }
    }

    // 2. Mangler neste action
    if (!c.nesteAction && c.status !== 'Pauset') {
      push(
        'mangler_neste_action',
        'Mangler neste action',
        'Ingen neste action er definert for denne kunden.',
        'high',
        {
          actionLabel: 'Sett neste action',
          recommendedAction: 'Definer hva neste steg er for kunden.',
        }
      );
    }

    // 3. Lead ikke fulgt opp (>3 dager)
    if (c.status === 'Lead' && c.sistKontaktet) {
      const days = daysSince(c.sistKontaktet);
      if (days > 3) {
        push(
          'lead_ikke_fulgt_opp',
          'Lead ikke fulgt opp',
          `Sist kontaktet for ${days} dager siden. Leads bør følges opp innen 3 dager.`,
          days > 7 ? 'critical' : 'high',
          {
            actionLabel: 'Kontakt lead',
            recommendedAction: 'Ring eller send e-post for å booke et intro-møte.',
          }
        );
      }
    }

    // 4. Møte booket men ingen oppfølging satt
    if (c.status === 'Møte booket' && !c.nesteAction) {
      push(
        'mote_ingen_oppfolging',
        'Møte booket – mangler oppfølging',
        'Møtet er booket men ingen oppfølging etter møtet er planlagt.',
        'medium',
        {
          actionLabel: 'Sett oppfølging',
          recommendedAction: 'Planlegg neste steg etter møtet.',
        }
      );
    }

    // 5. Tilbud sendt men ikke fulgt opp (>2 dager)
    if (c.status === 'Tilbud sendt' && c.sistKontaktet) {
      const days = daysSince(c.sistKontaktet);
      if (days > 2) {
        push(
          'tilbud_ikke_fulgt_opp',
          'Tilbud ikke fulgt opp',
          `Tilbud sendt for ${days} dager siden uten oppfølging.`,
          days > 5 ? 'critical' : 'high',
          {
            actionLabel: 'Følg opp tilbud',
            recommendedAction: 'Ring eller send e-post – har de spørsmål til tilbudet?',
          }
        );
      }
    }

    // 6. Prøvepakke betalt – faktura ikke sendt
    if (c.status === 'Prøvepakke betalt' && !c.invoiceSent) {
      push(
        'faktura_mangler',
        'Faktura ikke sendt',
        'Kunden har betalt prøvepakken, men faktura er ikke sendt.',
        'high',
        {
          actionLabel: 'Send faktura',
          recommendedAction: 'Opprett og send faktura til kunden snarest.',
        }
      );
    }

    // 7. Prøvepakke betalt – onboarding ikke startet
    if (c.status === 'Prøvepakke betalt' && !c.onboardingComplete) {
      push(
        'onboarding_mangler',
        'Onboarding ikke gjennomført',
        'Prøvepakken er betalt men onboarding er ikke gjennomført.',
        'high',
        {
          actionLabel: 'Start onboarding',
          recommendedAction: 'Book onboarding-møte og send velkomstpakke.',
        }
      );
    }

    // 8. Kontrakt mangler (etter tilbud-stadiet)
    if (PAST_OFFER_STAGES.has(c.status) && c.kontraktstatus !== 'Signert') {
      push(
        'kontrakt_mangler',
        'Kontrakt mangler',
        `Kontraktstatus: "${c.kontraktstatus}". Kontrakt bør signeres før videre arbeid.`,
        c.kontraktstatus === 'Ikke signert' ? 'critical' : 'high',
        {
          actionLabel: 'Send kontrakt',
          recommendedAction: 'Send kontrakt via e-sign og følg opp signering.',
        }
      );
    }

    // 9. Content mangler i produksjon
    if (!c.contentMottatt && ['Onboarding', 'Runde 1 produksjon', 'Runde 2'].includes(c.status)) {
      push(
        'content_mangler',
        'Content ikke mottatt',
        'Kunden er i produksjon men vi har ikke mottatt innhold fra dem.',
        'high',
        {
          actionLabel: 'Etterspør content',
          recommendedAction: 'Send content brief og purr på bilder/video fra kunden.',
        }
      );
    }

    // 10. Status har ikke endret seg på >7 dager
    if (!STATUS_STILLE_EXCLUDED.has(c.status) && c.statusChangedAt) {
      const days = daysSince(c.statusChangedAt);
      if (days > 7) {
        push(
          'status_stille',
          'Kunde står stille',
          `Kunden har vært i "${c.status}" i ${days} dager uten statusendring.`,
          days > 14 ? 'high' : 'medium',
          {
            actionLabel: 'Oppdater status',
            recommendedAction: 'Er det blokkere? Flytt kunden til neste fase eller legg til en plan.',
          }
        );
      }
    }

    // 11. Ads live men resultater ikke sjekket (>3 dager)
    if (c.adsLive && !c.resultsChecked && c.adsLiveDate) {
      const days = daysSince(c.adsLiveDate);
      if (days >= 3) {
        push(
          'sjekk_resultater',
          'Sjekk annonseresultater',
          `Annonsene har vært live i ${days} dager uten at resultater er sjekket.`,
          days > 7 ? 'high' : 'medium',
          {
            actionLabel: 'Sjekk resultater',
            recommendedAction: 'Gå inn i Meta Ads Manager. Se på ROAS, CPC og rekkevidde.',
          }
        );
      }
    }

    // 12. Rapport bør sendes (>7 dager live)
    if (c.adsLive && !c.reportSent && c.adsLiveDate) {
      const days = daysSince(c.adsLiveDate);
      if (days >= 7) {
        push(
          'send_rapport',
          'Send rapport til kunde',
          `Annonsene har vært live i ${days} dager – kunden bør ha en statusrapport.`,
          'medium',
          {
            actionLabel: 'Lag rapport',
            recommendedAction: 'Skriv en kort statusrapport med ROAS, rekkevidde og neste steg.',
          }
        );
      }
    }

    // 13. Foreslå Runde 2
    if (
      ['Runde 1 produksjon', 'Ads live / testing'].includes(c.status) &&
      c.round1Results &&
      ['good', 'great'].includes(c.round1Results)
    ) {
      push(
        'foreslaa_runde2',
        'Foreslå Runde 2',
        `Runde 1 gikk ${c.round1Results === 'great' ? 'svært bra' : 'bra'} – nå er det tid for å skalere med Runde 2.`,
        'low',
        {
          actionLabel: 'Send Runde 2-tilbud',
          recommendedAction: 'Presenter Runde 2-pakken og lag et skreddersydd tilbud.',
        }
      );
    }
  }

  return alerts;
}

export function alertsByClient(clients: Client[]): Map<string, Alert[]> {
  const map = new Map<string, Alert[]>();
  for (const alert of generateAlerts(clients)) {
    const list = map.get(alert.clientId) ?? [];
    list.push(alert);
    map.set(alert.clientId, list);
  }
  return map;
}
