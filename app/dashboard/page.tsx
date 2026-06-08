'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';
import { getClients } from '@/lib/customer-store';
import { generateAlerts } from '@/lib/generate-alerts';
import { getOptReminders } from '@/lib/reminders';
import { StageBadge, PriorityBadge } from '@/components/ui/Badge';
import type { Client } from '@/lib/types';
import type { OptReminder } from '@/lib/reminders';

const EMAIL_SETTINGS_KEY = 'klyr_email_settings';

type UserFilter = 'Alle' | 'Vetle G.' | 'Markus S.';

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short' });
}
function isOverdue(dateStr: string | null) {
  if (!dateStr) return false;
  return dateStr < TODAY;
}

const severityColors = {
  critical: 'bg-red-50 border-red-200 text-red-700',
  high: 'bg-orange-50 border-orange-200 text-orange-700',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  low: 'bg-blue-50 border-blue-100 text-blue-700',
};
const severityDots = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-400',
  low: 'bg-blue-400',
};

export default function DashboardPage() {
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [userFilter, setUserFilter] = useState<UserFilter>('Alle');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [optReminders, setOptReminders] = useState<OptReminder[]>([]);
  const [emailSettings, setEmailSettings] = useState<{ email1: string; email2: string; schemaUrl: string } | null>(null);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [reminderSent, setReminderSent] = useState<Set<string>>(new Set());

  function load() {
    const clients = getClients();
    setAllClients(clients);
    setOptReminders(getOptReminders(clients));
    try {
      const raw = localStorage.getItem(EMAIL_SETTINGS_KEY);
      if (raw) setEmailSettings(JSON.parse(raw));
    } catch { /* ignore */ }
    setLoaded(true);
    setLastUpdated(new Date());
  }

  useEffect(() => {
    load();

    const onFocus = () => load();
    const onVisibility = () => { if (!document.hidden) load(); };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendReminder(reminder: OptReminder) {
    if (!emailSettings) return;
    setSendingReminder(reminder.clientId + reminder.round);
    const recipients = [emailSettings.email1, emailSettings.email2].filter(Boolean);
    try {
      const res = await fetch('/api/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminder, recipients, schemaUrl: emailSettings.schemaUrl }),
      });
      if (res.ok) {
        setReminderSent((p) => new Set([...p, reminder.clientId + reminder.round]));
      }
    } finally {
      setSendingReminder(null);
    }
  }

  const clients = useMemo(() =>
    userFilter === 'Alle' ? allClients : allClients.filter((c) => c.ansvarlig === userFilter),
    [allClients, userFilter]
  );

  const allAlerts = useMemo(() => generateAlerts(allClients), [allClients]);

  const alerts = useMemo(() =>
    userFilter === 'Alle' ? allAlerts : allAlerts.filter((a) => a.assignedTo === userFilter),
    [allAlerts, userFilter]
  );

  const tasks = useMemo(() => allClients.flatMap((c) => c.oppgaver), [allClients]);

  const TODAY = new Date().toISOString().split('T')[0];

  if (!loaded) {
    return (
      <>
        <Topbar title="Dashboard" subtitle="Laster…" />
        <main className="flex-1" />
      </>
    );
  }

  const aktiveKunder = clients.filter(
    (c) => !['Lead', 'Kontaktet', 'Møte booket', 'Tilbud sendt', 'Pauset', 'Tapt'].includes(c.status)
  );
  const leadsIMåneden = clients.filter((c) => ['Lead', 'Kontaktet'].includes(c.status));
  const prøvepakkerBetalt = clients.filter((c) => c.status === 'Prøvepakke betalt');
  const verdiIPipeline = clients
    .filter((c) => c.verdi > 0 && !['Tapt', 'Pauset'].includes(c.status))
    .reduce((sum, c) => sum + c.verdi, 0);

  // Campaign results aggregation
  const allCampaigns = clients.flatMap((c) =>
    (c.campaigns ?? []).map((camp) => ({ ...camp, bedrift: c.bedrift, clientId: c.id }))
  );
  const totalAdSpend = allCampaigns.reduce((s, c) => s + (Number(c.adSpend) || 0), 0);
  const totalConversions = allCampaigns.reduce((s, c) => s + (Number(c.results?.conversions) || 0), 0);
  const totalLeads = allCampaigns.reduce((s, c) => s + (Number(c.results?.leads) || 0), 0);
  const totalRevenue = allCampaigns.reduce((s, c) => s + (Number(c.results?.revenue) || 0), 0);
  const avgROAS = totalAdSpend > 0 && totalRevenue > 0 ? (totalRevenue / totalAdSpend).toFixed(2) : null;
  const avgCPL = totalLeads > 0 && totalAdSpend > 0 ? Math.round(totalAdSpend / totalLeads) : null;

  const oppgaverIDag = tasks.filter((t) =>
    t.frist === TODAY && t.status !== 'Ferdig' &&
    (userFilter === 'Alle' || t.ansvarlig === userFilter)
  );

  const kritiskeVarsler = alerts.filter((a) => a.severity === 'critical');
  const fakturaMangler = alerts.filter((a) => a.type === 'faktura_mangler');
  const onboardingMangler = alerts.filter((a) => a.type === 'onboarding_mangler');
  const forfalteAlerts = alerts.filter((a) => a.type === 'forfalt_frist');
  const leadsÅFølgeOpp = alerts.filter((a) => a.type === 'lead_ikke_fulgt_opp');

  const mustDoNow = alerts
    .filter((a) => a.severity === 'critical' || a.severity === 'high')
    .sort((a) => (a.severity === 'critical' ? -1 : 1));

  const stageCounts: Record<string, number> = {};
  for (const c of clients) {
    stageCounts[c.status] = (stageCounts[c.status] || 0) + 1;
  }

  const recentActivity = clients
    .flatMap((c) => c.aktivitetslogg.map((a) => ({ ...a, bedrift: c.bedrift, klientId: c.id })))
    .sort((a, b) => (b.dato > a.dato ? 1 : -1))
    .slice(0, 6);

  if (allClients.length === 0) {
    return (
      <>
        <Topbar
          title="Dashboard"
          subtitle={`Oversikt per ${fmt(TODAY)}`}
          actions={
            <div className="flex items-center gap-2">
              <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors">↻ Oppdater</button>
              <Link href="/kunder/ny" className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-700 transition-colors">+ Legg til kunde</Link>
            </div>
          }
        />
        <main className="flex-1 flex items-center justify-center p-12">
          <div className="text-center max-w-xs">
            <h2 className="text-sm font-semibold text-zinc-900 mb-1">Ingen kunder enda</h2>
            <p className="text-xs text-gray-500 mb-5">Legg til din første kunde for å se dashboard.</p>
            <Link
              href="/kunder/ny"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
            >
              + Legg til første kunde
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle={lastUpdated ? `Oppdatert ${lastUpdated.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}` : `Oversikt per ${fmt(TODAY)}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
              title="Oppdater dashboard"
            >
              ↻ Oppdater
            </button>
            <Link href="/kunder/ny" className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-700 transition-colors">
              + Legg til kunde
            </Link>
          </div>
        }
      />

      {/* User filter */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-white">
        <span className="text-xs text-gray-500 mr-1">Vis for:</span>
        {(['Alle', 'Vetle G.', 'Markus S.'] as UserFilter[]).map((u) => (
          <button
            key={u}
            onClick={() => setUserFilter(u)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${userFilter === u ? 'bg-zinc-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {u}
          </button>
        ))}
      </div>

      <main className="flex-1 p-6 space-y-6">
        {/* Alert stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Åpne varsler" value={alerts.length} highlight={alerts.length > 0} link="/varsler" />
          <StatCard label="Kritiske varsler" value={kritiskeVarsler.length} highlight={kritiskeVarsler.length > 0} link="/varsler" />
          <StatCard label="Forfalte frister" value={forfalteAlerts.length} highlight={forfalteAlerts.length > 0} link="/varsler" />
          <StatCard label="Leads å følge opp" value={leadsÅFølgeOpp.length} highlight={leadsÅFølgeOpp.length > 0} />
          <StatCard label="Faktura mangler" value={fakturaMangler.length} highlight={fakturaMangler.length > 0} />
          <StatCard label="Onboarding mangler" value={onboardingMangler.length} highlight={onboardingMangler.length > 0} />
        </div>

        {/* Pipeline stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Aktive kunder" value={aktiveKunder.length} />
          <StatCard label="Leads / Kontaktet" value={leadsIMåneden.length} />
          <StatCard label="Prøvepakker betalt" value={prøvepakkerBetalt.length} />
          <StatCard label="Totalt ad spend" value={totalAdSpend > 0 ? `${(totalAdSpend / 1000).toFixed(0)}k` : '—'} suffix={totalAdSpend > 0 ? 'kr' : ''} />
        </div>

        {/* Campaign results */}
        {allCampaigns.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-900">Kampanjeresultater – alle kunder</h2>
              <span className="text-xs text-gray-400">{allCampaigns.length} kampanje{allCampaigns.length !== 1 ? 'r' : ''}</span>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-5">
              <ResultStat label="Total ad spend" value={`${totalAdSpend.toLocaleString('nb-NO')} kr`} />
              {totalRevenue > 0 && <ResultStat label="Total omsetning" value={`${totalRevenue.toLocaleString('nb-NO')} kr`} />}
              {totalConversions > 0 && <ResultStat label="Totalt konverteringer" value={totalConversions.toString()} />}
              {totalLeads > 0 && <ResultStat label="Totalt leads" value={totalLeads.toString()} />}
              {avgROAS && <ResultStat label="Gj.snitt ROAS" value={`${avgROAS}x`} highlight={parseFloat(avgROAS) >= 3} />}
              {avgCPL && <ResultStat label="Gj.snitt CPL" value={`${avgCPL.toLocaleString('nb-NO')} kr`} />}
            </div>

            {/* Per-customer breakdown */}
            <div className="space-y-2">
              {clients
                .filter((c) => (c.campaigns?.length ?? 0) > 0)
                .map((c) => {
                  const cCampaigns = c.campaigns ?? [];
                  const cSpend = cCampaigns.reduce((s, x) => s + (Number(x.adSpend) || 0), 0);
                  const cRev = cCampaigns.reduce((s, x) => s + (Number(x.results?.revenue) || 0), 0);
                  const cLeads = cCampaigns.reduce((s, x) => s + (Number(x.results?.leads) || 0), 0);
                  const cConv = cCampaigns.reduce((s, x) => s + (Number(x.results?.conversions) || 0), 0);
                  const cROAS = cSpend > 0 && cRev > 0 ? (cRev / cSpend).toFixed(2) : null;
                  const cCPL = cLeads > 0 && cSpend > 0 ? Math.round(cSpend / cLeads) : null;
                  return (
                    <Link
                      key={c.id}
                      href={`/kunder/${c.id}?tab=kampanjer`}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-sm font-medium text-zinc-900 truncate group-hover:underline">{c.bedrift}</span>
                        <span className="text-xs text-gray-400 shrink-0">{cCampaigns.length} runde{cCampaigns.length !== 1 ? 'r' : ''}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-xs text-gray-600">
                        <span>{cSpend.toLocaleString('nb-NO')} kr spend</span>
                        {cConv > 0 && <span>{cConv} konv.</span>}
                        {cLeads > 0 && <span>{cLeads} leads</span>}
                        {cROAS && (
                          <span className={`font-semibold ${parseFloat(cROAS) >= 3 ? 'text-green-600' : parseFloat(cROAS) >= 1.5 ? 'text-yellow-600' : 'text-red-500'}`}>
                            {cROAS}x ROAS
                          </span>
                        )}
                        {cCPL && <span>CPL: {cCPL.toLocaleString('nb-NO')} kr</span>}
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        )}

        {/* Må gjøres nå */}
        {mustDoNow.length > 0 && (
          <div className="bg-white rounded-xl border border-red-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                Må gjøres nå
              </h2>
              <Link href="/varsler" className="text-xs text-blue-600 hover:underline">Se alle varsler →</Link>
            </div>
            <div className="space-y-2">
              {mustDoNow.slice(0, 8).map((alert) => (
                <Link
                  key={alert.id}
                  href={`/kunder/${alert.clientId}`}
                  className="flex items-start justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${severityDots[alert.severity]}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-zinc-900 group-hover:underline">{alert.clientName}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${severityColors[alert.severity]}`}>
                          {alert.title}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{alert.recommendedAction}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-3">{alert.assignedTo}</span>
                </Link>
              ))}
              {mustDoNow.length > 8 && (
                <Link href="/varsler" className="block text-center text-xs text-blue-600 hover:underline py-1">
                  + {mustDoNow.length - 8} flere varsler
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Needs attention */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4">Needs attention</h2>
            {clients.length === 0 ? (
              <p className="text-sm text-gray-400">Ingen kunder for valgt filter.</p>
            ) : (
              <div className="space-y-2">
                {clients
                  .filter((c) => {
                    const overdue = isOverdue(c.nesteFrist);
                    const noAction = !c.nesteAction;
                    const missingPayment = c.betalingsstatus === 'Ikke betalt' && !['Lead', 'Kontaktet', 'Møte booket', 'Tilbud sendt'].includes(c.status);
                    const missingContent = !c.contentMottatt && ['Onboarding', 'Runde 1 produksjon', 'Runde 2'].includes(c.status);
                    return overdue || noAction || missingPayment || missingContent;
                  })
                  .slice(0, 8)
                  .map((c) => {
                    const reasons: string[] = [];
                    if (isOverdue(c.nesteFrist)) reasons.push('Forfalt frist');
                    if (!c.nesteAction) reasons.push('Mangler neste action');
                    if (c.betalingsstatus === 'Ikke betalt' && !['Lead', 'Kontaktet', 'Møte booket', 'Tilbud sendt'].includes(c.status)) reasons.push('Betaling mangler');
                    if (!c.contentMottatt && ['Onboarding', 'Runde 1 produksjon', 'Runde 2'].includes(c.status)) reasons.push('Content mangler');

                    return (
                      <Link key={c.id} href={`/kunder/${c.id}`} className="flex items-start justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-zinc-900 group-hover:underline">{c.bedrift}</span>
                            <StageBadge value={c.status} />
                            <PriorityBadge value={c.prioritet} />
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {reasons.map((r) => (
                              <span key={r} className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{r}</span>
                            ))}
                          </div>
                        </div>
                        {c.nesteFrist && (
                          <span className={`text-xs ml-4 shrink-0 ${isOverdue(c.nesteFrist) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {fmt(c.nesteFrist)}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                {clients.filter((c) => {
                  const overdue = isOverdue(c.nesteFrist);
                  const noAction = !c.nesteAction;
                  const missingPayment = c.betalingsstatus === 'Ikke betalt' && !['Lead', 'Kontaktet', 'Møte booket', 'Tilbud sendt'].includes(c.status);
                  const missingContent = !c.contentMottatt && ['Onboarding', 'Runde 1 produksjon', 'Runde 2'].includes(c.status);
                  return overdue || noAction || missingPayment || missingContent;
                }).length === 0 && (
                  <p className="text-sm text-gray-400">Ingen kunder trenger oppmerksomhet.</p>
                )}
              </div>
            )}
          </div>

          {/* Kunder per status */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4">Kunder per status</h2>
            {clients.length === 0 ? (
              <p className="text-xs text-gray-400">Ingen kunder.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(stageCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([stage, count]) => (
                    <div key={stage} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 truncate mr-2">{stage}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${(count / clients.length) * 100}%` }} />
                        </div>
                        <span className="text-xs font-medium text-zinc-900 w-3">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">Oppgaver i dag</span>
              <span className={`text-sm font-semibold ${oppgaverIDag.length > 0 ? 'text-red-600' : 'text-zinc-900'}`}>{oppgaverIDag.length}</span>
            </div>
          </div>
        </div>

        {/* Opt reminders */}
        {optReminders.length > 0 && (
          <div className="bg-white rounded-xl border border-amber-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <span className="text-amber-500">⏰</span>
                Påminnelser – optimaliserte ads
              </h2>
              <Link href="/innstillinger" className="text-xs text-gray-400 hover:text-zinc-700">
                E-postinnstillinger →
              </Link>
            </div>
            <div className="space-y-2">
              {optReminders.map((r) => {
                const key = r.clientId + r.round;
                const isSending = sendingReminder === key;
                const isSent = reminderSent.has(key);
                const canEmail = !!(emailSettings?.email1);
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      r.isOverdue
                        ? 'bg-red-50 border-red-200'
                        : r.daysLeft <= 3
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/kunder/${r.clientId}`}
                          className="text-xs font-semibold text-zinc-900 hover:underline"
                        >
                          {r.clientName}
                        </Link>
                        <span className="text-xs text-gray-400">{r.round}</span>
                      </div>
                      <p className={`text-xs mt-0.5 ${r.isOverdue ? 'text-red-700 font-medium' : 'text-amber-700'}`}>
                        {r.isOverdue
                          ? `Forfalt – kampanje bør ha sluttresultater (${r.deadlineDate})`
                          : `${r.daysLeft} dag${r.daysLeft !== 1 ? 'er' : ''} igjen til levering av optimaliserte ads`}
                      </p>
                    </div>
                    <div className="shrink-0 ml-3">
                      {isSent ? (
                        <span className="text-xs text-green-600 font-medium">✓ Sendt</span>
                      ) : canEmail ? (
                        <button
                          onClick={() => sendReminder(r)}
                          disabled={isSending}
                          className="px-3 py-1 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                        >
                          {isSending ? 'Sender…' : 'Send e-post'}
                        </button>
                      ) : (
                        <Link
                          href="/innstillinger"
                          className="px-3 py-1 text-xs font-medium border border-gray-200 rounded-lg text-gray-500 hover:text-zinc-700 transition-colors"
                        >
                          Sett opp e-post
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Siste aktivitet</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400">Ingen aktivitet enda.</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <ActivityDot type={a.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link href={`/kunder/${a.klientId}`} className="text-xs font-medium text-zinc-900 hover:underline truncate">{a.bedrift}</Link>
                      <span className="text-xs text-gray-400 shrink-0">{fmt(a.dato)}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 truncate">{a.tekst}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function StatCard({ label, value, suffix, highlight, link }: {
  label: string; value: string | number; suffix?: string; highlight?: boolean; link?: string;
}) {
  const inner = (
    <div className={`bg-white rounded-xl border p-4 h-full ${highlight ? 'border-red-200' : 'border-gray-200'} ${link ? 'hover:border-zinc-400 transition-colors cursor-pointer' : ''}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${highlight ? 'text-red-600' : 'text-zinc-900'}`}>
        {value}
        {suffix && <span className="text-sm font-normal text-gray-400 ml-1">{suffix}</span>}
      </p>
    </div>
  );
  return link ? <Link href={link}>{inner}</Link> : inner;
}

function ResultStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${highlight ? 'text-green-600' : 'text-zinc-900'}`}>{value}</p>
    </div>
  );
}

function ActivityDot({ type }: { type: string }) {
  const colors: Record<string, string> = {
    notat: 'bg-gray-400', status: 'bg-blue-500', oppgave: 'bg-yellow-500', epost: 'bg-indigo-500', møte: 'bg-green-500',
  };
  return <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${colors[type] ?? 'bg-gray-400'}`} />;
}
