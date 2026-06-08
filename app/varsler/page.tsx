'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';
import { generateAlerts } from '@/lib/generate-alerts';
import { getClients } from '@/lib/customer-store';
import type { Client, AlertSeverity, AlertType } from '@/lib/types';

const severityConfig = {
  critical: { label: 'Kritisk', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badgeBg: 'bg-red-100', dot: 'bg-red-500', order: 0 },
  high:     { label: 'Høy',    bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badgeBg: 'bg-orange-100', dot: 'bg-orange-500', order: 1 },
  medium:   { label: 'Medium', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badgeBg: 'bg-yellow-100', dot: 'bg-yellow-400', order: 2 },
  low:      { label: 'Lav',    bg: 'bg-blue-50',   border: 'border-blue-100',   text: 'text-blue-700',   badgeBg: 'bg-blue-100',   dot: 'bg-blue-400',   order: 3 },
};

const TYPE_LABELS: Record<AlertType, string> = {
  forfalt_frist: 'Forfalt frist',
  mangler_neste_action: 'Mangler action',
  lead_ikke_fulgt_opp: 'Lead ufulgt',
  mote_ingen_oppfolging: 'Møte ufulgt',
  tilbud_ikke_fulgt_opp: 'Tilbud ufulgt',
  faktura_mangler: 'Faktura mangler',
  onboarding_mangler: 'Onboarding',
  kontrakt_mangler: 'Kontrakt',
  content_mangler: 'Content',
  status_stille: 'Status stille',
  sjekk_resultater: 'Sjekk resultater',
  send_rapport: 'Send rapport',
  foreslaa_runde2: 'Foreslå Runde 2',
  offboarding_takkemail: 'Offboarding',
  offboarding_faktura: 'Offboarding',
  offboarding_leveranse: 'Offboarding',
};

type UserFilter = 'Alle' | 'Vetle G.' | 'Markus S.';
type SeverityFilter = 'Alle' | AlertSeverity;

export default function VarslerPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [userFilter, setUserFilter] = useState<UserFilter>('Alle');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('Alle');
  const [overrides, setOverrides] = useState<Record<string, 'done' | 'snoozed'>>({});
  const [loaded, setLoaded] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [sendMsg, setSendMsg] = useState('');

  useEffect(() => {
    setClients(getClients());
    try {
      const raw = localStorage.getItem('fujii_varsel_overrides');
      if (raw) setOverrides(JSON.parse(raw));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  function saveOverrides(next: Record<string, 'done' | 'snoozed'>) {
    setOverrides(next);
    localStorage.setItem('fujii_varsel_overrides', JSON.stringify(next));
  }

  const allAlerts = useMemo(() => generateAlerts(clients), [clients]);

  const visible = useMemo(() => {
    if (!loaded) return [];
    return allAlerts
      .filter((a) => {
        if (overrides[a.id]) return false;
        if (userFilter !== 'Alle' && a.assignedTo !== userFilter) return false;
        if (severityFilter !== 'Alle' && a.severity !== severityFilter) return false;
        return true;
      })
      .sort((a, b) => severityConfig[a.severity].order - severityConfig[b.severity].order);
  }, [allAlerts, userFilter, severityFilter, overrides, loaded]);

  function markDone(id: string) {
    saveOverrides({ ...overrides, [id]: 'done' });
  }
  function snooze(id: string) {
    saveOverrides({ ...overrides, [id]: 'snoozed' });
  }
  function restore(id: string) {
    const n = { ...overrides };
    delete n[id];
    saveOverrides(n);
  }

  async function handleSendEmail() {
    const alertsToSend = visible.filter((a) => a.severity === 'critical' || a.severity === 'high');
    if (!alertsToSend.length) {
      setSendMsg('Ingen kritiske eller høy-prioritet varsler å sende.');
      setSendStatus('error');
      setTimeout(() => { setSendStatus('idle'); setSendMsg(''); }, 4000);
      return;
    }
    try {
      const raw = localStorage.getItem('klyr_email_settings');
      const settings = raw ? JSON.parse(raw) : null;
      const recipients: string[] = [settings?.email1, settings?.email2].filter(Boolean);
      if (!recipients.length) {
        setSendMsg('Ingen e-postmottakere satt. Gå til Innstillinger og lagre e-postadresser.');
        setSendStatus('error');
        setTimeout(() => { setSendStatus('idle'); setSendMsg(''); }, 5000);
        return;
      }
      setSendStatus('sending');
      setSendMsg(`Sender ${alertsToSend.length} varsler til ${recipients.join(', ')}…`);
      const res = await fetch('/api/send-alerts-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alerts: alertsToSend, recipients }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSendStatus('ok');
        setSendMsg(`✓ E-post sendt med ${alertsToSend.length} varsler`);
      } else {
        setSendStatus('error');
        setSendMsg(`Feil: ${data.error ?? 'Ukjent feil'}`);
      }
    } catch (err) {
      setSendStatus('error');
      setSendMsg(`Nettverksfeil: ${String(err)}`);
    }
    setTimeout(() => { setSendStatus('idle'); setSendMsg(''); }, 6000);
  }

  const snoozedAlerts = allAlerts.filter((a) => overrides[a.id] === 'snoozed');
  const doneAlerts = allAlerts.filter((a) => overrides[a.id] === 'done');

  const critical = visible.filter((a) => a.severity === 'critical');
  const high = visible.filter((a) => a.severity === 'high');
  const medium = visible.filter((a) => a.severity === 'medium');
  const low = visible.filter((a) => a.severity === 'low');

  return (
    <>
      <Topbar
        title="Varsler"
        subtitle={`${visible.length} åpne varsler`}
        actions={
          <div className="flex items-center gap-2">
            {sendMsg && (
              <span className={`text-xs px-2 py-1 rounded-lg ${sendStatus === 'ok' ? 'text-green-700 bg-green-50' : sendStatus === 'error' ? 'text-red-700 bg-red-50' : 'text-blue-700 bg-blue-50'}`}>
                {sendMsg}
              </span>
            )}
            <button
              onClick={handleSendEmail}
              disabled={sendStatus === 'sending'}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-zinc-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {sendStatus === 'sending' ? 'Sender…' : '✉ Send varsler på e-post'}
            </button>
            <Link href="/kunder/ny" className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-700 transition-colors">
              + Legg til kunde
            </Link>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-200 bg-white flex-wrap">
        <UserTabs value={userFilter} onChange={setUserFilter} />
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-gray-500">Alvorlighet:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
            className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-zinc-900 focus:outline-none"
          >
            {(['Alle', 'critical', 'high', 'medium', 'low'] as const).map((v) => (
              <option key={v} value={v}>{v === 'Alle' ? 'Alle' : severityConfig[v].label}</option>
            ))}
          </select>
        </div>
      </div>

      <main className="flex-1 p-6 space-y-6">
        {/* Summary pills */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryPill label="Kritiske" count={allAlerts.filter(a => a.severity === 'critical' && !overrides[a.id]).length} color="text-red-700 bg-red-50 border-red-200" />
          <SummaryPill label="Høy prioritet" count={allAlerts.filter(a => a.severity === 'high' && !overrides[a.id]).length} color="text-orange-700 bg-orange-50 border-orange-200" />
          <SummaryPill label="Snoozede" count={snoozedAlerts.length} color="text-gray-600 bg-gray-50 border-gray-200" />
          <SummaryPill label="Løste i dag" count={doneAlerts.length} color="text-green-700 bg-green-50 border-green-200" />
        </div>

        {visible.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            {clients.length === 0 ? (
              <>
                <p className="text-sm font-medium text-zinc-900 mb-1">Ingen varsler</p>
                <p className="text-xs text-gray-500 mb-4">Legg til kunder for å generere varsler.</p>
                <Link href="/kunder/ny" className="text-xs text-blue-600 hover:underline">Legg til første kunde →</Link>
              </>
            ) : (
              <>
                <p className="text-2xl mb-2">✓</p>
                <p className="text-sm font-medium text-zinc-900">Ingen åpne varsler</p>
                <p className="text-xs text-gray-500 mt-1">Alt er under kontroll.</p>
              </>
            )}
          </div>
        )}

        {/* Alert groups */}
        {[
          { alerts: critical, label: 'Kritiske varsler', key: 'critical' as AlertSeverity },
          { alerts: high, label: 'Høy prioritet', key: 'high' as AlertSeverity },
          { alerts: medium, label: 'Medium prioritet', key: 'medium' as AlertSeverity },
          { alerts: low, label: 'Lav prioritet / Muligheter', key: 'low' as AlertSeverity },
        ].map(({ alerts, label, key }) => {
          if (alerts.length === 0) return null;
          return (
            <AlertGroup key={key} label={label} severity={key} alerts={alerts} onDone={markDone} onSnooze={snooze} />
          );
        })}

        {/* Snoozed */}
        {snoozedAlerts.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Snoozede varsler ({snoozedAlerts.length})</h3>
            <div className="space-y-2">
              {snoozedAlerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg opacity-60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{severityConfig[a.severity].label}</span>
                    <span className="text-xs font-medium text-zinc-700">{a.title}</span>
                    <Link href={`/kunder/${a.clientId}`} className="text-xs text-blue-600 hover:underline">{a.clientName}</Link>
                  </div>
                  <button onClick={() => restore(a.id)} className="text-xs text-gray-500 hover:text-zinc-900 underline">Gjenopprett</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function AlertGroup({
  label, severity, alerts, onDone, onSnooze,
}: {
  label: string;
  severity: AlertSeverity;
  alerts: ReturnType<typeof generateAlerts>;
  onDone: (id: string) => void;
  onSnooze: (id: string) => void;
}) {
  const cfg = severityConfig[severity];
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</h3>
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${cfg.badgeBg} ${cfg.text}`}>{alerts.length}</span>
      </div>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onDone={onDone} onSnooze={onSnooze} />
        ))}
      </div>
    </div>
  );
}

function AlertCard({
  alert, onDone, onSnooze,
}: {
  alert: ReturnType<typeof generateAlerts>[0];
  onDone: (id: string) => void;
  onSnooze: (id: string) => void;
}) {
  const cfg = severityConfig[alert.severity];
  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-semibold ${cfg.text}`}>{alert.title}</span>
            <span className="text-xs bg-white border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
              {TYPE_LABELS[alert.type]}
            </span>
          </div>
          <Link href={`/kunder/${alert.clientId}`} className="text-sm font-semibold text-zinc-900 hover:underline">
            {alert.clientName}
          </Link>
          <p className="text-xs text-gray-600 mt-1">{alert.description}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs text-gray-500">Ansvarlig: <span className="font-medium text-zinc-700">{alert.assignedTo}</span></span>
            {alert.dueDate && (
              <span className="text-xs text-red-600 font-medium">Frist: {new Date(alert.dueDate).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short' })}</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2 italic">→ {alert.recommendedAction}</p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <Link
            href={`/kunder/${alert.clientId}`}
            className="px-3 py-1.5 bg-zinc-900 text-white text-xs rounded-lg hover:bg-zinc-700 transition-colors text-center"
          >
            {alert.actionLabel}
          </Link>
          <button
            onClick={() => onDone(alert.id)}
            className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
          >
            Løst ✓
          </button>
          <button
            onClick={() => onSnooze(alert.id)}
            className="px-3 py-1.5 border border-gray-300 text-gray-500 text-xs rounded-lg hover:bg-white transition-colors"
          >
            Snooze
          </button>
        </div>
      </div>
    </div>
  );
}

function UserTabs({ value, onChange }: { value: UserFilter; onChange: (v: UserFilter) => void }) {
  const options: UserFilter[] = ['Alle', 'Vetle G.', 'Markus S.'];
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${value === o ? 'bg-white text-zinc-900 shadow-sm' : 'text-gray-500 hover:text-zinc-900'}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function SummaryPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <p className="text-xs opacity-75 mb-0.5">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{count}</p>
    </div>
  );
}
