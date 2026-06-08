'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { generateAlerts } from '@/lib/generate-alerts';
import type { Client, Alert, AlertType } from '@/lib/types';

const severityConfig = {
  critical: { label: 'Kritisk', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
  high: { label: 'Høy', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' },
  medium: { label: 'Medium', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  low: { label: 'Lav', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-400' },
};

// Maps a checkbox key to the alert type it resolves
const CHECKBOX_RESOLVES: Partial<Record<string, AlertType>> = {
  invoiceSent: 'faktura_mangler',
  onboardingComplete: 'onboarding_mangler',
  contentMottatt: 'content_mangler',
  resultsChecked: 'sjekk_resultater',
  reportSent: 'send_rapport',
};

interface CheckState {
  invoiceSent: boolean;
  invoicePaid: boolean;
  contractSigned: boolean;
  contentMottatt: boolean;
  metaAccessReceived: boolean;
  brandAssetsReceived: boolean;
  onboardingComplete: boolean;
  adsLive: boolean;
  resultsChecked: boolean;
  reportSent: boolean;
}

const CHECKLIST: { key: keyof CheckState; label: string }[] = [
  { key: 'invoiceSent', label: 'Faktura sendt' },
  { key: 'invoicePaid', label: 'Betaling mottatt' },
  { key: 'contractSigned', label: 'Kontrakt signert' },
  { key: 'contentMottatt', label: 'Content mottatt' },
  { key: 'metaAccessReceived', label: 'Meta-tilgang mottatt' },
  { key: 'brandAssetsReceived', label: 'Brand assets mottatt' },
  { key: 'onboardingComplete', label: 'Onboarding ferdig' },
  { key: 'adsLive', label: 'Ads live' },
  { key: 'resultsChecked', label: 'Resultater sjekket' },
  { key: 'reportSent', label: 'Rapport sendt' },
];

export default function Kontrollpanel({ client }: { client: Client }) {
  const [checks, setChecks] = useState<CheckState>({
    invoiceSent: client.invoiceSent,
    invoicePaid: client.betalingsstatus === 'Betalt',
    contractSigned: client.kontraktstatus === 'Signert',
    contentMottatt: client.contentMottatt,
    metaAccessReceived: client.metaAccessReceived,
    brandAssetsReceived: client.brandAssetsReceived,
    onboardingComplete: client.onboardingComplete,
    adsLive: client.adsLive,
    resultsChecked: client.resultsChecked,
    reportSent: client.reportSent,
  });

  const [nesteAction, setNesteAction] = useState(client.nesteAction);
  const [editingAction, setEditingAction] = useState(false);
  const [actionInput, setActionInput] = useState(client.nesteAction);
  const [followedUp, setFollowedUp] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Build a live client snapshot for alert generation
  const liveClient = useMemo((): Client => ({
    ...client,
    invoiceSent: checks.invoiceSent,
    betalingsstatus: checks.invoicePaid ? 'Betalt' : client.betalingsstatus,
    kontraktstatus: checks.contractSigned ? 'Signert' : client.kontraktstatus,
    contentMottatt: checks.contentMottatt,
    metaAccessReceived: checks.metaAccessReceived,
    brandAssetsReceived: checks.brandAssetsReceived,
    onboardingComplete: checks.onboardingComplete,
    adsLive: checks.adsLive,
    resultsChecked: checks.resultsChecked,
    reportSent: checks.reportSent,
    nesteAction,
  }), [client, checks, nesteAction]);

  const alerts = useMemo(
    () => generateAlerts([liveClient]).filter((a) => !dismissed.has(a.id)),
    [liveClient, dismissed]
  );

  function toggleCheck(key: keyof CheckState) {
    const nextVal = !checks[key];
    setChecks((prev) => ({ ...prev, [key]: nextVal }));
    // Auto-dismiss the related alert when checking
    const alertType = CHECKBOX_RESOLVES[key];
    if (alertType && nextVal) {
      setDismissed((prev) => new Set([...prev, `${client.id}-${alertType}`]));
    }
  }

  function saveAction() {
    setNesteAction(actionInput);
    setEditingAction(false);
    // If action was missing, dismiss that alert
    if (actionInput) {
      setDismissed((prev) => new Set([...prev, `${client.id}-mangler_neste_action`]));
    }
  }

  function dismissAlert(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  const emailTemplate = buildEmailTemplate(client, nesteAction);

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const highCount = alerts.filter((a) => a.severity === 'high').length;

  return (
    <div className="space-y-4">
      {/* Alert summary bar */}
      {alerts.length > 0 && (
        <div className={`rounded-lg border p-4 ${criticalCount > 0 ? 'bg-red-50 border-red-200' : highCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-semibold ${criticalCount > 0 ? 'text-red-800' : highCount > 0 ? 'text-orange-800' : 'text-yellow-800'}`}>
              {alerts.length} aktiv{alerts.length !== 1 ? 'e' : ''} varsel{alerts.length !== 1 ? 'er' : ''}
            </span>
            <Link href="/varsler" className="text-xs text-gray-500 hover:underline">Se alle varsler →</Link>
          </div>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} onDismiss={dismissAlert} />
            ))}
          </div>
        </div>
      )}

      {alerts.length === 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <span className="text-sm text-green-700 font-medium">Ingen aktive varsler for denne kunden.</span>
        </div>
      )}

      {/* Neste action */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Neste action</span>
          <button onClick={() => { setEditingAction(true); setActionInput(nesteAction); }} className="text-xs text-gray-400 hover:text-zinc-900">Endre</button>
        </div>
        {editingAction ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveAction(); if (e.key === 'Escape') setEditingAction(false); }}
              className="input flex-1 text-sm"
              placeholder="Hva er neste steg?"
            />
            <button onClick={saveAction} className="px-3 py-1.5 bg-zinc-900 text-white text-xs rounded-lg">Lagre</button>
            <button onClick={() => setEditingAction(false)} className="px-3 py-1.5 border border-gray-200 text-xs rounded-lg">Avbryt</button>
          </div>
        ) : (
          <p className={`text-sm ${nesteAction ? 'text-zinc-900' : 'text-gray-400 italic'}`}>
            {nesteAction || 'Ingen neste action satt'}
          </p>
        )}
      </div>

      {/* Checklist */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">Sjekkliste</span>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {CHECKLIST.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={checks[key]}
                onChange={() => toggleCheck(key)}
                className="w-4 h-4 rounded border-gray-300 accent-zinc-900"
              />
              <span className={`text-sm transition-colors ${checks[key] ? 'text-gray-400 line-through' : 'text-zinc-700 group-hover:text-zinc-900'}`}>
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">Hurtighandlinger</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setFollowedUp(true); setTimeout(() => setFollowedUp(false), 2500); }}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-zinc-700 hover:bg-gray-50 transition-colors"
          >
            {followedUp ? '✓ Merket som fulgt opp' : 'Merk som fulgt opp'}
          </button>
          <button
            onClick={() => setShowEmail(!showEmail)}
            className={`px-3 py-1.5 border rounded-lg text-xs transition-colors ${showEmail ? 'bg-zinc-900 text-white border-zinc-900' : 'border-gray-200 text-zinc-700 hover:bg-gray-50'}`}
          >
            Lag oppfølgingsmail
          </button>
          <button
            onClick={() => setEditingAction(true)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-zinc-700 hover:bg-gray-50 transition-colors"
          >
            Sett neste action
          </button>
          {alerts.length > 0 && (
            <button
              onClick={() => setDismissed(new Set(alerts.map((a) => a.id)))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Snooze alle varsler
            </button>
          )}
        </div>

        {/* Email template */}
        {showEmail && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700">E-postmal – klar til å kopiere</span>
              <button
                onClick={() => navigator.clipboard.writeText(emailTemplate)}
                className="text-xs text-blue-600 hover:underline"
              >
                Kopier
              </button>
            </div>
            <pre className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 whitespace-pre-wrap leading-relaxed font-sans">
              {emailTemplate}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function AlertRow({ alert, onDismiss }: { alert: Alert; onDismiss: (id: string) => void }) {
  const cfg = severityConfig[alert.severity];
  return (
    <div className={`flex items-start justify-between gap-3 p-2.5 rounded-lg border ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
        <div className="min-w-0">
          <p className={`text-xs font-semibold ${cfg.text}`}>{alert.title}</p>
          <p className="text-xs text-gray-600 mt-0.5 leading-snug">{alert.description}</p>
          <p className="text-xs text-gray-500 mt-1 italic">{alert.recommendedAction}</p>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          onClick={() => onDismiss(alert.id)}
          className="text-xs text-gray-400 hover:text-zinc-700 px-1.5 py-0.5 rounded hover:bg-white transition-colors"
          title="Snooze"
        >
          Snooze
        </button>
        <button
          onClick={() => onDismiss(alert.id)}
          className="text-xs text-green-600 hover:text-green-800 px-1.5 py-0.5 rounded hover:bg-white transition-colors"
          title="Marker som løst"
        >
          Løst
        </button>
      </div>
    </div>
  );
}

function buildEmailTemplate(client: Client, nesteAction: string): string {
  const statusLines: Record<string, string> = {
    'Lead': 'Vi hjalp nylig noen i din bransje med å skalere sin annonsering på Meta, og jeg tenkte det kunne være relevant for dere også.',
    'Kontaktet': 'Takk for at du tok deg tid tidligere – jeg ønsker bare å følge opp og høre om du har hatt tid til å tenke over det vi snakket om.',
    'Møte booket': 'Gleder meg til møtet vårt. Bare en rask sjekk – er det noe du vil at vi skal gå gjennom spesielt?',
    'Tilbud sendt': 'Jeg sender en rask oppfølging på tilbudet vi sendte. Har du hatt mulighet til å se gjennom det, eller er det noe du lurer på?',
    'Prøvepakke betalt': 'Takk for at dere er i gang med prøvepakken! Vi er klare til å starte – jeg tar kontakt for å koordinere onboarding.',
    'Onboarding': 'Vi er godt i gang med onboarding. Vil bare sjekke at alt er klart fra din side – spesielt innhold og tilganger.',
    'Runde 1 produksjon': 'Vi er i full produksjon nå. Vi holder deg oppdatert så snart annonsene er klare for lansering.',
    'Ads live / testing': 'Annonsene er live og vi overvåker resultatene løpende. Jeg sender deg en oppdatering med tallene snart.',
    'Runde 2': 'Vi er godt i gang med Runde 2. Resultatene fra Runde 1 gir oss et solid grunnlag for å skalere.',
    'Fast kunde / retainer': 'Bare en rask sjekk – alt løper fint? Vi ønsker å sørge for at du er fornøyd og at vi leverer på målene dine.',
    'Pauset': 'Håper alt går bra hos dere. Vi ser frem til å gjenoppta samarbeidet når dere er klare.',
  };

  const bodyText = statusLines[client.status] ?? 'Bare en rask oppfølging – er det noe vi kan hjelpe deg med?';

  return `Hei ${client.kontaktperson},

${bodyText}

${nesteAction ? `Vi har planlagt følgende neste steg: ${nesteAction}.` : ''}

Er det noe du ønsker å ta opp, eller spørsmål jeg kan svare på?

Beste hilsen,
${client.ansvarlig}
Klyr
hei@klyr.no`.trim();
}
