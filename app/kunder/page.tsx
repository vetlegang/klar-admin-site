'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';
import { getClients } from '@/lib/customer-store';
import { alertsByClient } from '@/lib/generate-alerts';
import { PriorityBadge } from '@/components/ui/Badge';
import { PIPELINE_STAGES } from '@/lib/types';
import type { Client, PipelineStage, Priority, Alert } from '@/lib/types';

type PipelineViewFilter = 'aktive' | 'sagt_opp' | 'avsluttet' | 'alle';

const TODAY = new Date().toISOString().split('T')[0];

function isOverdue(dateStr: string | null) {
  if (!dateStr) return false;
  return dateStr < TODAY;
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short' });
}

const ANSVARLIG_OPTIONS = ['Alle', 'Vetle G.', 'Markus S.'];
const PAKKE_OPTIONS = ['Alle', 'Prøvepakke'];
const PRIORITET_OPTIONS: (Priority | 'Alle')[] = ['Alle', 'Høy', 'Medium', 'Lav'];

export default function KunderPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [ansvarlig, setAnsvarlig] = useState('Alle');
  const [pakke, setPakke] = useState('Alle');
  const [prioritet, setPrioritet] = useState<Priority | 'Alle'>('Alle');
  const [betalt, setBetalt] = useState<'Alle' | 'Betalt' | 'Ikke betalt'>('Alle');
  const [pipelineView, setPipelineView] = useState<PipelineViewFilter>('aktive');

  useEffect(() => {
    setClients(getClients());
    setLoaded(true);
  }, []);

  const alertMap = useMemo(() => alertsByClient(clients), [clients]);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (pipelineView === 'aktive' && (c.status === 'Sagt opp' || c.status === 'Avsluttet')) return false;
      if (pipelineView === 'sagt_opp' && c.status !== 'Sagt opp') return false;
      if (pipelineView === 'avsluttet' && c.status !== 'Avsluttet') return false;
      if (ansvarlig !== 'Alle' && c.ansvarlig !== ansvarlig) return false;
      if (pakke !== 'Alle' && c.pakke !== pakke) return false;
      if (prioritet !== 'Alle' && c.prioritet !== prioritet) return false;
      if (betalt === 'Betalt' && c.betalingsstatus !== 'Betalt') return false;
      if (betalt === 'Ikke betalt' && c.betalingsstatus === 'Betalt') return false;
      return true;
    });
  }, [clients, ansvarlig, pakke, prioritet, betalt, pipelineView]);

  const hasFilter = ansvarlig !== 'Alle' || pakke !== 'Alle' || prioritet !== 'Alle' || betalt !== 'Alle';

  const visibleStages: PipelineStage[] = pipelineView === 'aktive'
    ? PIPELINE_STAGES.filter((s) => s !== 'Sagt opp' && s !== 'Avsluttet')
    : pipelineView === 'sagt_opp' ? ['Sagt opp']
    : pipelineView === 'avsluttet' ? ['Avsluttet']
    : PIPELINE_STAGES;

  if (!loaded) {
    return (
      <>
        <Topbar title="Kunder / Pipeline" subtitle="Laster…" />
        <main className="flex-1" />
      </>
    );
  }

  if (clients.length === 0) {
    return (
      <>
        <Topbar
          title="Kunder / Pipeline"
          subtitle="0 kunder totalt"
          actions={
            <Link href="/kunder/ny" className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-700 transition-colors">
              + Legg til kunde
            </Link>
          }
        />
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center max-w-xs">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-zinc-900 mb-1">Ingen kunder enda</h2>
            <p className="text-xs text-gray-500 mb-5">Legg til din første kunde for å komme i gang.</p>
            <Link
              href="/kunder/ny"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
            >
              + Legg til første kunde
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar
        title="Kunder / Pipeline"
        subtitle={`${clients.length} kunder totalt`}
        actions={
          <Link href="/kunder/ny" className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-700 transition-colors">
            + Legg til kunde
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 bg-white flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 mr-2">
          {([['aktive', 'Aktive'], ['sagt_opp', 'Sagt opp'], ['avsluttet', 'Avsluttet'], ['alle', 'Alle']] as [PipelineViewFilter, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setPipelineView(val)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${pipelineView === val ? 'bg-white text-zinc-900 shadow-sm' : 'text-gray-500 hover:text-zinc-900'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <FilterSelect label="Ansvarlig" value={ansvarlig} onChange={setAnsvarlig} options={ANSVARLIG_OPTIONS} />
        <FilterSelect label="Pakke" value={pakke} onChange={setPakke} options={PAKKE_OPTIONS} />
        <FilterSelect label="Prioritet" value={prioritet} onChange={(v) => setPrioritet(v as Priority | 'Alle')} options={PRIORITET_OPTIONS} />
        <FilterSelect label="Betaling" value={betalt} onChange={(v) => setBetalt(v as 'Alle' | 'Betalt' | 'Ikke betalt')} options={['Alle', 'Betalt', 'Ikke betalt']} />
        {hasFilter && (
          <button
            onClick={() => { setAnsvarlig('Alle'); setPakke('Alle'); setPrioritet('Alle'); setBetalt('Alle'); }}
            className="text-xs text-gray-500 hover:text-zinc-900 underline"
          >
            Nullstill filter
          </button>
        )}
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full" style={{ minWidth: 'max-content' }}>
          {visibleStages.map((stage) => {
            const cards = filtered.filter((c) => c.status === stage);
            return <KanbanColumn key={stage} stage={stage} clients={cards} alertMap={alertMap} />;
          })}
        </div>
      </div>
    </>
  );
}

function KanbanColumn({ stage, clients, alertMap }: { stage: PipelineStage; clients: Client[]; alertMap: Map<string, Alert[]> }) {
  return (
    <div className="flex flex-col w-60 shrink-0">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-medium text-zinc-700">{stage}</span>
        <span className="text-xs text-gray-400">{clients.length}</span>
      </div>
      <div className="flex-1 space-y-2 min-h-16">
        {clients.map((c) => <KanbanCard key={c.id} client={c} alertMap={alertMap} />)}
        {clients.length === 0 && <div className="h-10 rounded-lg border border-dashed border-gray-200" />}
      </div>
    </div>
  );
}

function KanbanCard({ client: c, alertMap }: { client: Client; alertMap: Map<string, Alert[]> }) {
  const overdue = isOverdue(c.nesteFrist);
  const alerts = alertMap.get(c.id) ?? [];
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const highCount = alerts.filter((a) => a.severity === 'high').length;
  const noAction = !c.nesteAction;

  return (
    <Link href={`/kunder/${c.id}`}>
      <div className={`bg-white rounded-lg border p-3 hover:shadow-sm transition-all cursor-pointer ${criticalCount > 0 ? 'border-red-300' : overdue ? 'border-orange-300' : 'border-gray-200 hover:border-zinc-400'}`}>
        <div className="flex items-start justify-between gap-1 mb-1.5">
          <span className="text-xs font-semibold text-zinc-900 leading-tight">{c.bedrift}</span>
          <PriorityBadge value={c.prioritet} />
        </div>

        {(criticalCount > 0 || highCount > 0 || noAction) && (
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            {criticalCount > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                {criticalCount} kritisk
              </span>
            )}
            {highCount > 0 && (
              <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
                {highCount} høy
              </span>
            )}
            {noAction && (
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                mangler action
              </span>
            )}
          </div>
        )}

        {c.pakke && <p className="text-xs text-gray-500 mb-1.5 truncate">{c.pakke}</p>}
        {c.verdi > 0 && <p className="text-xs font-medium text-zinc-700 mb-1.5">{c.verdi.toLocaleString('nb-NO')} kr</p>}

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500 truncate max-w-[80px]">{c.ansvarlig}</span>
          {c.nesteFrist && (
            <span className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
              {fmt(c.nesteFrist)}
            </span>
          )}
        </div>

        {c.nesteAction && (
          <p className="text-xs text-gray-500 mt-1 truncate">→ {c.nesteAction}</p>
        )}
      </div>
    </Link>
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
