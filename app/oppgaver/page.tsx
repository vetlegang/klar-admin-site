'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';
import { getClients } from '@/lib/customer-store';
import { generateAlerts } from '@/lib/generate-alerts';
import { TaskStatusBadge, PriorityBadge } from '@/components/ui/Badge';
import type { Client, Task, TaskStatus, Priority, AlertSeverity } from '@/lib/types';

const TODAY = new Date().toISOString().split('T')[0];

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' });
}
function isOverdue(dateStr: string | null) {
  if (!dateStr) return false;
  return dateStr < TODAY;
}

const STATUS_OPTIONS: (TaskStatus | 'Alle')[] = ['Alle', 'Åpen', 'Pågår', 'Ferdig'];
const PRIORITY_OPTIONS: (Priority | 'Alle')[] = ['Alle', 'Høy', 'Medium', 'Lav'];
const ANSVARLIG_OPTIONS = ['Alle', 'Vetle G.', 'Markus S.'];

const severityBg: Record<AlertSeverity, string> = {
  critical: 'bg-red-50 border-red-200 text-red-700',
  high: 'bg-orange-50 border-orange-200 text-orange-700',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  low: 'bg-blue-50 border-blue-100 text-blue-700',
};
const severityLabel: Record<AlertSeverity, string> = {
  critical: 'Kritisk', high: 'Høy', medium: 'Medium', low: 'Lav',
};

export default function OppgaverPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [status, setStatus] = useState<TaskStatus | 'Alle'>('Alle');
  const [prioritet, setPrioritet] = useState<Priority | 'Alle'>('Alle');
  const [ansvarlig, setAnsvarlig] = useState('Alle');
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    setClients(getClients());
  }, []);

  const allTasks: Task[] = useMemo(() => clients.flatMap((c) => c.oppgaver), [clients]);
  const allAlerts = useMemo(() => generateAlerts(clients), [clients]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (status !== 'Alle' && t.status !== status) return false;
      if (prioritet !== 'Alle' && t.prioritet !== prioritet) return false;
      if (ansvarlig !== 'Alle' && t.ansvarlig !== ansvarlig) return false;
      return true;
    });
  }, [allTasks, status, prioritet, ansvarlig]);

  const visibleAlerts = useMemo(() => {
    return allAlerts
      .filter((a) => !dismissedAlerts.has(a.id))
      .filter((a) => ansvarlig === 'Alle' || a.assignedTo === ansvarlig)
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return order[a.severity] - order[b.severity];
      });
  }, [allAlerts, ansvarlig, dismissedAlerts]);

  function dismissAlert(id: string) {
    setDismissedAlerts((p) => new Set([...p, id]));
  }

  return (
    <>
      <Topbar title="Oppgaver" subtitle={`${allTasks.length} manuelle + ${visibleAlerts.length} auto-genererte`} />

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 bg-white flex-wrap">
        <FilterSelect label="Status" value={status} onChange={(v) => setStatus(v as TaskStatus | 'Alle')} options={STATUS_OPTIONS} />
        <FilterSelect label="Prioritet" value={prioritet} onChange={(v) => setPrioritet(v as Priority | 'Alle')} options={PRIORITY_OPTIONS} />
        <FilterSelect label="Ansvarlig" value={ansvarlig} onChange={setAnsvarlig} options={ANSVARLIG_OPTIONS} />
        {(status !== 'Alle' || prioritet !== 'Alle' || ansvarlig !== 'Alle') && (
          <button
            onClick={() => { setStatus('Alle'); setPrioritet('Alle'); setAnsvarlig('Alle'); }}
            className="text-xs text-gray-500 hover:text-zinc-900 underline"
          >
            Nullstill
          </button>
        )}
      </div>

      <main className="flex-1 p-6 space-y-6">
        {/* Auto-generated tasks from alerts */}
        {visibleAlerts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-sm font-semibold text-zinc-900">Auto-genererte oppgaver</h2>
              <Link href="/varsler" className="text-xs text-blue-600 hover:underline">Se varsler →</Link>
            </div>
            <div className="space-y-2">
              {visibleAlerts.slice(0, 10).map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start justify-between p-3 rounded-xl border ${severityBg[alert.severity]}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-semibold">{alert.title}</span>
                      <span className="text-xs opacity-70 font-medium">{severityLabel[alert.severity]}</span>
                    </div>
                    <Link href={`/kunder/${alert.clientId}`} className="text-xs font-medium text-zinc-900 hover:underline">
                      {alert.clientName}
                    </Link>
                    <p className="text-xs opacity-80 mt-0.5">{alert.recommendedAction}</p>
                    <p className="text-xs opacity-60 mt-0.5">Ansvarlig: {alert.assignedTo}</p>
                  </div>
                  <div className="flex gap-1.5 ml-3 shrink-0">
                    <Link
                      href={`/kunder/${alert.clientId}`}
                      className="text-xs px-2.5 py-1 bg-white border border-current rounded-lg opacity-80 hover:opacity-100 transition-opacity font-medium"
                    >
                      Åpne
                    </Link>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="text-xs px-2.5 py-1 bg-white border border-current rounded-lg opacity-60 hover:opacity-100 transition-opacity"
                    >
                      Ferdig
                    </button>
                  </div>
                </div>
              ))}
              {visibleAlerts.length > 10 && (
                <p className="text-xs text-center text-gray-500 py-1">
                  + {visibleAlerts.length - 10} flere varsler — <Link href="/varsler" className="text-blue-600 hover:underline">Se alle</Link>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Manual tasks table */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 mb-3 px-1">Manuelle oppgaver</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Oppgave</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Kunde</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Ansvarlig</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Frist</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Prioritet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-sm text-gray-400 py-10">
                      {clients.length === 0 ? 'Ingen kunder enda.' : 'Ingen oppgaver funnet.'}
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => {
                    const overdue = t.status !== 'Ferdig' && isOverdue(t.frist);
                    return (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-zinc-900">{t.tittel}</td>
                        <td className="px-4 py-3">
                          <Link href={`/kunder/${t.klientId}`} className="text-blue-600 hover:underline text-xs">{t.klientNavn}</Link>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{t.ansvarlig}</td>
                        <td className="px-4 py-3 text-xs">
                          {t.frist ? (
                            <span className={overdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                              {fmt(t.frist)}{overdue && ' ⚠'}
                            </span>
                          ) : <span className="text-gray-400">–</span>}
                        </td>
                        <td className="px-4 py-3"><TaskStatusBadge value={t.status} /></td>
                        <td className="px-4 py-3"><PriorityBadge value={t.prioritet} /></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-500">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
