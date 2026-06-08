'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';
import { getClients } from '@/lib/customer-store';
import type { Client, PipelineStage } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  'Lead': 'bg-gray-100 text-gray-600',
  'Kontaktet': 'bg-blue-50 text-blue-700',
  'Møte booket': 'bg-purple-50 text-purple-700',
  'Tilbud sendt': 'bg-yellow-50 text-yellow-700',
  'Prøvepakke betalt': 'bg-orange-50 text-orange-700',
  'Onboarding': 'bg-teal-50 text-teal-700',
  'Runde 1 produksjon': 'bg-indigo-50 text-indigo-700',
  'Ads live / testing': 'bg-green-50 text-green-700',
  'Runde 2': 'bg-green-100 text-green-800',
  'Fast kunde / retainer': 'bg-emerald-50 text-emerald-700',
  'Pauset': 'bg-gray-100 text-gray-500',
  'Sagt opp': 'bg-red-50 text-red-600',
  'Tapt': 'bg-red-100 text-red-700',
};

const ACTIVE_STATUSES: PipelineStage[] = [
  'Lead', 'Kontaktet', 'Møte booket', 'Tilbud sendt',
  'Prøvepakke betalt', 'Onboarding', 'Runde 1 produksjon',
  'Ads live / testing', 'Runde 2', 'Egendefinert pakke',
  'Fast kunde / retainer', 'Pauset',
];

const TODAY = new Date().toISOString().split('T')[0];

function isOverdue(dateStr: string | null) {
  return !!dateStr && dateStr < TODAY;
}

export default function KunderPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'aktive' | 'alle' | 'avsluttet'>('aktive');
  const [ansvarlig, setAnsvarlig] = useState('Alle');

  useEffect(() => {
    setClients(getClients());
    setLoaded(true);
  }, []);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (view === 'aktive' && !ACTIVE_STATUSES.includes(c.status)) return false;
      if (view === 'avsluttet' && c.status !== 'Sagt opp' && c.status !== 'Avsluttet' && c.status !== 'Tapt') return false;
      if (ansvarlig !== 'Alle' && c.ansvarlig !== ansvarlig) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.bedrift.toLowerCase().includes(q) ||
          c.kontaktperson.toLowerCase().includes(q) ||
          c.epost.toLowerCase().includes(q) ||
          c.status.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [clients, view, ansvarlig, search]);

  if (!loaded) {
    return (
      <>
        <Topbar title="Kunder" />
        <main className="flex-1" />
      </>
    );
  }

  return (
    <>
      <Topbar
        title="Kunder"
        subtitle={`${clients.length} kunde${clients.length !== 1 ? 'r' : ''} totalt`}
        actions={
          <Link
            href="/kunder/ny"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <span>+</span> Ny kunde
          </Link>
        }
      />

      <main className="flex-1 p-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk på navn, e-post, status…"
            className="input w-56"
          />

          {/* View tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {(['aktive', 'alle', 'avsluttet'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                  view === v ? 'bg-white text-zinc-900 shadow-sm' : 'text-gray-500 hover:text-zinc-700'
                }`}
              >
                {v === 'aktive' ? 'Aktive' : v === 'alle' ? 'Alle' : 'Avsluttet'}
              </button>
            ))}
          </div>

          {/* Ansvarlig */}
          <select
            value={ansvarlig}
            onChange={(e) => setAnsvarlig(e.target.value)}
            className="input w-36 text-xs"
          >
            <option value="Alle">Alle ansvarlige</option>
            <option>Vetle G.</option>
            <option>Markus S.</option>
          </select>

          <span className="text-xs text-gray-400 ml-auto">{filtered.length} vist</span>
        </div>

        {/* Empty state */}
        {clients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-900 mb-1">Ingen kunder enda</p>
            <p className="text-xs text-gray-500 mb-4">Legg til din første kunde for å komme i gang.</p>
            <Link href="/kunder/ny" className="px-4 py-2 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700 transition-colors">
              + Legg til kunde
            </Link>
          </div>
        )}

        {/* Customer grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => (
              <CustomerCard key={c.id} client={c} />
            ))}
          </div>
        )}

        {filtered.length === 0 && clients.length > 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">Ingen kunder matcher søket.</p>
          </div>
        )}
      </main>
    </>
  );
}

function CustomerCard({ client: c }: { client: Client }) {
  const overdue = isOverdue(c.nesteFrist);
  const campaignCount = c.campaigns?.length ?? 0;
  const progress = getProgress(c);
  const statusColor = STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600';

  return (
    <Link
      href={`/kunder/${c.id}`}
      className="group block bg-white rounded-xl border border-gray-200 p-4 hover:border-zinc-400 hover:shadow-sm transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 truncate group-hover:text-black">{c.bedrift}</p>
          {c.kontaktperson && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{c.kontaktperson}</p>
          )}
        </div>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
          {c.status}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
        {c.bransje && <span className="truncate">{c.bransje}</span>}
        {c.by && <span>{c.by}</span>}
        {c.ansvarlig && <span className="ml-auto shrink-0">{c.ansvarlig}</span>}
      </div>

      {/* Progress bar (if has round data) */}
      {progress > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">{c.currentRound ?? 'Testpakke'}</span>
            <span className="text-xs text-gray-500">{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-zinc-800 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {campaignCount > 0 && (
            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">
              {campaignCount} kampanje{campaignCount !== 1 ? 'r' : ''}
            </span>
          )}
          {c.adsLive && (
            <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded font-medium">Live</span>
          )}
        </div>
        {c.nesteAction && (
          <p className={`truncate max-w-[140px] ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
            {overdue && '⚠ '}{c.nesteAction}
          </p>
        )}
      </div>
    </Link>
  );
}

function getProgress(client: Client): number {
  const roundName = client.currentRound ?? 'Testpakke';
  const rd = client.roundData?.[roundName];
  if (!rd) return 0;
  const isFirst = roundName === 'Testpakke';
  const keys = isFirst
    ? ['metaSetupDone', 'kontraktSignert', 'addSpendBetalt', 'serviceInvoiceSent', 'kampanjeLive', 'opt1Done', 'opt2Done']
    : ['addSpendBetalt', 'serviceInvoiceSent', 'kampanjeLive', 'opt1Done', 'opt2Done'];
  const done = keys.filter((k) => (rd as Record<string, unknown>)[k]).length;
  return Math.round((done / keys.length) * 100);
}
