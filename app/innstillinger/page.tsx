'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { mockTeam } from '@/lib/mock-data';
import type { TeamMember } from '@/lib/types';

const EMAIL_SETTINGS_KEY = 'klyr_email_settings';

interface EmailSettings {
  email1: string;
  email2: string;
  schemaUrl: string;
  configured: boolean;
}

const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  email1: 'vg@fujii.no',
  email2: 'mhs@fujii.no',
  schemaUrl: '',
  configured: false,
};

function loadEmailSettings(): EmailSettings {
  if (typeof window === 'undefined') return DEFAULT_EMAIL_SETTINGS;
  try {
    const raw = localStorage.getItem(EMAIL_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_EMAIL_SETTINGS;
  } catch { return DEFAULT_EMAIL_SETTINGS; }
}

function ResendSettings() {
  const [settings, setSettings] = useState<EmailSettings>({ email1: '', email2: '', schemaUrl: '', configured: false });
  const [saved, setSaved] = useState(false);

  useEffect(() => { setSettings(loadEmailSettings()); }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const s = { ...settings, configured: !!(settings.email1 && settings.schemaUrl) };
    localStorage.setItem(EMAIL_SETTINGS_KEY, JSON.stringify(s));
    setSettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <SettingsSection title="E-postvarsler (Resend)">
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs font-medium text-blue-800 mb-1">Oppsett (én gang)</p>
        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
          <li>Gå til <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">resend.com/api-keys</a> og kopier (eller opprett) API-nøkkel</li>
          <li>Gå til Vercel → Settings → Environment Variables og legg til:<br />
            <code className="bg-blue-100 px-1 rounded">RESEND_API_KEY=re_xxx</code><br />
            <code className="bg-blue-100 px-1 rounded">EMAIL_FROM=Fujii Admin &lt;noreply@fujii.no&gt;</code>
          </li>
          <li>Du kan bruke <strong>samme API-nøkkel</strong> som tilhører fujii.no-kontoen</li>
          <li>Fyll inn e-postadresser og skjema-URL under, og lagre</li>
        </ol>
      </div>
      <form onSubmit={handleSave} className="space-y-3">
        <Field label="Din e-post" htmlFor="email1">
          <input id="email1" type="email" value={settings.email1} onChange={(e) => setSettings((p) => ({ ...p, email1: e.target.value }))} className="input" placeholder="vetle@klyr.no" />
        </Field>
        <Field label="Kollegaens e-post" htmlFor="email2">
          <input id="email2" type="email" value={settings.email2} onChange={(e) => setSettings((p) => ({ ...p, email2: e.target.value }))} className="input" placeholder="markus@klyr.no" />
        </Field>
        <Field label="Skjema-URL (lenke i påminnelsesmails)" htmlFor="schemaUrl">
          <input id="schemaUrl" type="url" value={settings.schemaUrl} onChange={(e) => setSettings((p) => ({ ...p, schemaUrl: e.target.value }))} className="input" placeholder="https://forms.gle/..." />
        </Field>
        <div className="flex items-center gap-3">
          <button type="submit" className="px-4 py-2 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700 transition-colors">
            Lagre e-postinnstillinger
          </button>
          {saved && <span className="text-xs text-green-600">Lagret ✓</span>}
          {settings.configured && !saved && (
            <span className="text-xs text-green-600">✓ Konfigurert</span>
          )}
        </div>
      </form>
      <p className="text-xs text-gray-400 mt-3">
        Påminnelsene sendes via <strong>/api/send-reminder</strong> endepunktet. Du kan sette opp en Vercel Cron Job eller trykke &quot;Send nå&quot; direkte fra dashboard.
      </p>
    </SettingsSection>
  );
}

const VARSELREGLER = [
  { regel: 'Lead må følges opp innen 3 dager', detalj: 'Ingen kontakt i 3+ dager → varsel' },
  { regel: 'Tilbud må følges opp innen 2 dager', detalj: 'Tilbud sendt uten kontakt 2+ dager → varsel' },
  { regel: 'Kontrakt kreves for alle betalte kunder', detalj: 'Fra Prøvepakke betalt og videre → kontrakt må signeres' },
  { regel: 'Faktura og onboarding ved betalt prøvepakke', detalj: 'Prøvepakke betalt uten faktura/onboarding → varsel' },
  { regel: 'Content etterspørres i produksjonsfaser', detalj: 'Onboarding / Runde 1 / Runde 2 uten content → varsel' },
  { regel: 'Kunde bør ikke stå i samme status > 7 dager', detalj: 'Gjelder alle aktive faser unntatt Fast kunde og Pauset' },
  { regel: 'Annonseresultater sjekkes etter 3 dager live', detalj: 'Ads live > 3 dager uten resultatsjekk → varsel' },
  { regel: 'Rapport sendes etter 7 dager live', detalj: 'Ads live > 7 dager uten rapport → varsel' },
  { regel: 'Runde 2 foreslås ved gode resultater', detalj: 'Runde 1 = god/svært bra → varsel om å foreslå Runde 2' },
  { regel: 'Alle kunder skal ha en neste action', detalj: 'Mangler neste action (unntatt Pauset/Tapt) → varsel' },
  { regel: 'Sagt opp-kunder krever offboarding-sjekk', detalj: 'Takkemail, siste faktura og leveranse må bekreftes' },
];

const NOTIFICATION_TYPE_LABELS: Record<keyof TeamMember['notificationTypes'], string> = {
  overdueAlerts: 'Forfalte frister',
  missingActions: 'Mangler neste action',
  invoiceReminders: 'Fakturapåminnelser',
  followUpReminders: 'Oppfølgingspåminnelser',
  onboardingReminders: 'Onboarding-påminnelser',
  reportReminders: 'Rapport-påminnelser',
};

export default function InnstillingerPage() {
  const [agencyName, setAgencyName] = useState('Fujii');
  const [email, setEmail] = useState('hei@fujii.no');
  const [saved, setSaved] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>(mockTeam);
  const [teamSaved, setTeamSaved] = useState(false);
  const [testVarselMsg, setTestVarselMsg] = useState('');
  const [testVarselStatus, setTestVarselStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updateTeamMember(id: string, field: keyof TeamMember, value: unknown) {
    setTeam((prev) => prev.map((m) => m.id === id ? { ...m, [field]: value } : m));
  }

  function updateNotificationType(id: string, type: keyof TeamMember['notificationTypes'], value: boolean) {
    setTeam((prev) => prev.map((m) =>
      m.id === id ? { ...m, notificationTypes: { ...m.notificationTypes, [type]: value } } : m
    ));
  }

  function handleSaveTeam() {
    setTeamSaved(true);
    setTimeout(() => setTeamSaved(false), 2000);
  }

  async function handleTestVarsel(memberEmail: string, memberName: string) {
    setTestVarselStatus('sending');
    setTestVarselMsg(`Sender til ${memberEmail}…`);
    try {
      const res = await fetch('/api/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminder: {
            clientId: 'test',
            clientName: 'Testkundevarsling',
            round: 'Testpakke',
            daysLeft: 5,
            kampanjeLiveDato: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0],
            deadlineDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
            isOverdue: false,
          },
          recipients: [memberEmail],
          schemaUrl: '',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestVarselStatus('ok');
        setTestVarselMsg(`✓ Testepost sendt til ${memberEmail}`);
      } else {
        setTestVarselStatus('error');
        setTestVarselMsg(`Feil: ${data.error ?? 'Ukjent feil'}`);
      }
    } catch (err) {
      setTestVarselStatus('error');
      setTestVarselMsg(`Nettverksfeil: ${String(err)}`);
    }
    setTimeout(() => { setTestVarselStatus('idle'); setTestVarselMsg(''); }, 5000);
  }

  return (
    <>
      <Topbar title="Innstillinger" subtitle="Generelle innstillinger for Fujii Admin" />
      <main className="flex-1 p-6 max-w-2xl">
        <div className="space-y-6">

          {/* General */}
          <SettingsSection title="Generelt">
            <form onSubmit={handleSave} className="space-y-4">
              <Field label="Byråets navn" htmlFor="name">
                <input id="name" type="text" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} className="input" />
              </Field>
              <Field label="Kontakt-e-post" htmlFor="email">
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
              </Field>
              <div className="flex items-center gap-3">
                <button type="submit" className="px-4 py-2 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700 transition-colors">
                  Lagre endringer
                </button>
                {saved && <span className="text-xs text-green-600">Lagret ✓</span>}
              </div>
            </form>
          </SettingsSection>

          {/* Team og varsler */}
          <SettingsSection title="Team og varsler">
            <p className="text-xs text-gray-500 mb-4">
              Ekte e-postvarsler kobles på via Resend, SendGrid, Gmail API eller Supabase.
            </p>
            <div className="space-y-6">
              {team.map((m) => (
                <div key={m.id} className="border border-gray-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">{m.initialer}</span>
                    </div>
                    <div className="flex-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Navn" htmlFor={`navn-${m.id}`}>
                        <input
                          id={`navn-${m.id}`}
                          value={m.navn}
                          onChange={(e) => updateTeamMember(m.id, 'navn', e.target.value)}
                          className="input"
                        />
                      </Field>
                      <Field label="Rolle" htmlFor={`rolle-${m.id}`}>
                        <input
                          id={`rolle-${m.id}`}
                          value={m.rolle}
                          onChange={(e) => updateTeamMember(m.id, 'rolle', e.target.value)}
                          className="input"
                        />
                      </Field>
                      <Field label="E-post" htmlFor={`epost-${m.id}`}>
                        <input
                          id={`epost-${m.id}`}
                          type="email"
                          value={m.epost}
                          onChange={(e) => updateTeamMember(m.id, 'epost', e.target.value)}
                          className="input"
                        />
                      </Field>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={m.notificationsEnabled}
                            onChange={(e) => updateTeamMember(m.id, 'notificationsEnabled', e.target.checked)}
                            className="w-4 h-4 accent-zinc-900"
                          />
                          <span className="text-xs font-medium text-zinc-700">Varsler aktivert</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {m.notificationsEnabled && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">Varseltyper</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(m.notificationTypes) as Array<keyof TeamMember['notificationTypes']>).map((type) => (
                          <label key={type} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={m.notificationTypes[type]}
                              onChange={(e) => updateNotificationType(m.id, type, e.target.checked)}
                              className="w-3.5 h-3.5 accent-zinc-900"
                            />
                            <span className="text-xs text-zinc-700">{NOTIFICATION_TYPE_LABELS[type]}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleTestVarsel(m.epost, m.navn)}
                      disabled={testVarselStatus === 'sending'}
                      className="px-3 py-1.5 border border-gray-200 text-xs text-gray-600 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {testVarselStatus === 'sending' ? 'Sender…' : 'Send testepost'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {testVarselMsg && (
              <p className={`mt-3 text-xs px-3 py-2 rounded-lg border ${
                testVarselStatus === 'ok' ? 'text-green-700 bg-green-50 border-green-200' :
                testVarselStatus === 'error' ? 'text-red-700 bg-red-50 border-red-200' :
                'text-blue-700 bg-blue-50 border-blue-200'
              }`}>{testVarselMsg}</p>
            )}

            <div className="flex items-center gap-3 mt-4">
              <button onClick={handleSaveTeam} className="px-4 py-2 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700 transition-colors">
                Lagre endringer
              </button>
              {teamSaved && <span className="text-xs text-green-600">Lagret ✓</span>}
            </div>
          </SettingsSection>

          {/* E-postintegrasjon */}
          <ResendSettings />

          {/* Alert rules */}
          <SettingsSection title="Varselregler">
            <p className="text-xs text-gray-500 mb-4">Disse reglene kjøres automatisk mot alle kunder og genererer varsler.</p>
            <div className="space-y-3">
              {VARSELREGLER.map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">{i + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{r.regel}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.detalj}</p>
                  </div>
                </div>
              ))}
            </div>
          </SettingsSection>

          {/* Pipeline stages */}
          <SettingsSection title="Pipeline-stadier">
            <p className="text-xs text-gray-500 mb-3">Disse stadiene brukes i Kunder / Pipeline-visningen.</p>
            <div className="flex flex-wrap gap-2">
              {['Lead','Kontaktet','Møte booket','Tilbud sendt','Prøvepakke betalt','Onboarding',
                'Runde 1 produksjon','Ads live / testing','Runde 2','Egendefinert pakke',
                'Fast kunde / retainer','Pauset','Sagt opp','Avsluttet','Tapt'].map((stage) => (
                <span key={stage} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{stage}</span>
              ))}
            </div>
          </SettingsSection>

          {/* Info */}
          <SettingsSection title="Om Fujii Admin">
            <div className="space-y-1.5 text-xs text-gray-500">
              <p>Versjon: <span className="text-zinc-900 font-medium">0.3.0 – Control Center</span></p>
              <p>Bygget med Next.js 16 + Tailwind CSS v4</p>
              <p>Kun frontend – ingen database tilkoblet ennå.</p>
              <p>Varselsystem: rule-based, kjøres client-side mot mock-data.</p>
            </div>
          </SettingsSection>

        </div>
      </main>
    </>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-zinc-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
