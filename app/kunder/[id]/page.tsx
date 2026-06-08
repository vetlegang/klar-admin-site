'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';
import { getClient } from '@/lib/customer-store';
import { shootOptionLabel } from '@/lib/packages';
import { StageBadge, PriorityBadge, TaskStatusBadge } from '@/components/ui/Badge';
import Kontrollpanel from '@/components/kunder/Kontrollpanel';
import KundeforholdSection from '@/components/kunder/KundeforholdSection';
import LopSection from '@/components/kunder/LopSection';
import KampanjeResultater from '@/components/kunder/KampanjeResultater';
import type { Client } from '@/lib/types';

const TODAY = new Date().toISOString().split('T')[0];

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function isOverdue(dateStr: string | null) {
  if (!dateStr) return false;
  return dateStr < TODAY;
}

const activityTypeLabel: Record<string, string> = {
  notat: 'Notat',
  status: 'Statusendring',
  oppgave: 'Oppgave',
  epost: 'E-post',
  møte: 'Møte',
};

type Tab = 'oversikt' | 'lop' | 'kampanjer';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'oversikt', label: 'Oversikt', icon: '📋' },
  { id: 'lop', label: 'Løp & Milepæler', icon: '🏁' },
  { id: 'kampanjer', label: 'Kampanjeresultater', icon: '📊' },
];

export default function KundeDetailPage() {
  const params = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<Tab>('oversikt');

  useEffect(() => {
    const c = getClient(params.id);
    setClient(c ?? null);
  }, [params.id]);

  const handleUpdate = useCallback((updates: Partial<Client>) => {
    setClient((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  if (client === undefined) {
    return (
      <>
        <Topbar title="Laster…" />
        <main className="flex-1 p-6" />
      </>
    );
  }

  if (client === null) {
    return (
      <>
        <Topbar
          title="Kunde ikke funnet"
          actions={
            <Link href="/kunder" className="text-xs text-gray-500 hover:text-zinc-900">
              ← Tilbake til pipeline
            </Link>
          }
        />
        <main className="flex-1 flex items-center justify-center p-12">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">Denne kunden finnes ikke.</p>
            <Link href="/kunder" className="text-sm text-blue-600 hover:underline">
              ← Gå til kundeoversikt
            </Link>
          </div>
        </main>
      </>
    );
  }

  const c = client;
  const currentRound = c.currentRound ?? 'Testpakke';
  const campaignCount = c.campaigns?.length ?? 0;

  return (
    <>
      <Topbar
        title={c.bedrift}
        subtitle={c.bransje}
        actions={
          <div className="flex items-center gap-3">
            {currentRound && (
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
                {currentRound}
              </span>
            )}
            <Link href="/kunder" className="text-xs text-gray-500 hover:text-zinc-900">
              ← Tilbake
            </Link>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 border-b border-gray-200 bg-white">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-gray-500 hover:text-zinc-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.id === 'kampanjer' && campaignCount > 0 && (
              <span className="ml-1 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                {campaignCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <main className="flex-1 p-6">
        {/* ─── TAB: OVERSIKT ─── */}
        {activeTab === 'oversikt' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Kontrollpanel */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-zinc-900">Kontrollpanel</h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{c.ansvarlig}</span>
                    <StageBadge value={c.status} />
                  </div>
                </div>
                <Kontrollpanel client={c} />
              </div>

              {/* Company info */}
              <Section title="Bedriftsinformasjon">
                <InfoGrid>
                  <InfoItem label="Kontaktperson" value={c.kontaktperson} />
                  <InfoItem
                    label="E-post"
                    value={
                      <a href={`mailto:${c.epost}`} className="text-blue-600 hover:underline">
                        {c.epost}
                      </a>
                    }
                  />
                  <InfoItem label="Telefon" value={c.telefon} />
                  <InfoItem
                    label="Nettside"
                    value={
                      c.nettside ? (
                        <a
                          href={c.nettside.startsWith('http') ? c.nettside : `https://${c.nettside}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {c.nettside}
                        </a>
                      ) : (
                        '–'
                      )
                    }
                  />
                  <InfoItem label="Bransje" value={c.bransje || '–'} />
                  <InfoItem label="Ansvarlig" value={c.ansvarlig} />
                  <InfoItem label="Sist kontaktet" value={c.sistKontaktet ? fmt(c.sistKontaktet) : '–'} />
                  <InfoItem label="Prioritet" value={<PriorityBadge value={c.prioritet} />} />
                </InfoGrid>
              </Section>

              {/* Pipeline & package */}
              <Section title="Pipeline og pakke">
                <InfoGrid>
                  <InfoItem label="Status" value={<StageBadge value={c.status} />} />
                  <InfoItem label="Pakke" value={c.pakke || '–'} />
                  {c.shootOption && (
                    <InfoItem label="Shoot-tilvalg" value={shootOptionLabel(c.shootOption)} />
                  )}
                  <InfoItem
                    label="Totalpris"
                    value={c.verdi > 0 ? `${c.verdi.toLocaleString('nb-NO')} kr` : '–'}
                  />
                  <InfoItem label="Runde 1 resultater" value={c.round1Results ?? '–'} />
                  {c.adsLiveDate && <InfoItem label="Ads live siden" value={fmt(c.adsLiveDate)} />}
                  {c.statusChangedAt && (
                    <InfoItem label="Status endret" value={fmt(c.statusChangedAt)} />
                  )}
                </InfoGrid>
              </Section>

              {/* Notes */}
              {c.notater && (
                <Section title="Notater">
                  <p className="text-sm text-gray-700 leading-relaxed">{c.notater}</p>
                </Section>
              )}

              {/* Tasks */}
              {c.oppgaver.length > 0 && (
                <Section title="Oppgaver">
                  <div className="space-y-2">
                    {c.oppgaver.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                      >
                        <div>
                          <p className="text-sm text-zinc-900 font-medium">{t.tittel}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Ansvarlig: {t.ansvarlig}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <TaskStatusBadge value={t.status} />
                          {t.frist && (
                            <span
                              className={`text-xs font-medium ${
                                isOverdue(t.frist) ? 'text-red-600' : 'text-gray-500'
                              }`}
                            >
                              {fmt(t.frist)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Kundeforhold */}
              <Section title="Kundeforhold">
                <KundeforholdSection client={c} />
              </Section>
            </div>

            {/* Right column: activity log */}
            <div className="space-y-6">
              {/* Next action summary */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-zinc-900 mb-3">Neste steg</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Neste action</p>
                    <p
                      className={`text-sm ${
                        c.nesteAction ? 'text-zinc-900' : 'text-gray-400 italic'
                      }`}
                    >
                      {c.nesteAction || 'Ikke satt'}
                    </p>
                  </div>
                  {c.nesteFrist && (
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Frist</p>
                      <p
                        className={`text-sm font-medium ${
                          isOverdue(c.nesteFrist) ? 'text-red-600' : 'text-zinc-900'
                        }`}
                      >
                        {fmt(c.nesteFrist)}
                        {isOverdue(c.nesteFrist) && (
                          <span className="ml-1 text-xs">(forfalt)</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Activity log */}
              <Section title="Aktivitetslogg">
                {c.aktivitetslogg.length === 0 ? (
                  <p className="text-xs text-gray-400">Ingen aktivitet enda.</p>
                ) : (
                  <div className="space-y-4">
                    {c.aktivitetslogg.map((a) => (
                      <div key={a.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-zinc-400 mt-1 shrink-0" />
                          <div className="w-px flex-1 bg-gray-100 mt-1" />
                        </div>
                        <div className="pb-4 flex-1">
                          <div className="flex items-baseline justify-between gap-1">
                            <span className="text-xs font-medium text-zinc-700">
                              {activityTypeLabel[a.type] ?? a.type}
                            </span>
                            <span className="text-xs text-gray-400">{fmt(a.dato)}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">{a.tekst}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{a.bruker}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          </div>
        )}

        {/* ─── TAB: LØP & MILEPÆLER ─── */}
        {activeTab === 'lop' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">Løp & Milepæler</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Følg fremdriften per runde for {c.bedrift}
                  </p>
                </div>
              </div>
              <LopSection client={c} onUpdate={handleUpdate} />
            </div>
          </div>
        )}

        {/* ─── TAB: KAMPANJERESULTATER ─── */}
        {activeTab === 'kampanjer' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-zinc-900">Kampanjeresultater</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Legg inn Meta-kampanjeresultater og beregn ROAS automatisk
                </p>
              </div>
              <KampanjeResultater client={c} onUpdate={handleUpdate} />
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-zinc-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <div className="text-sm text-zinc-900">{value}</div>
    </div>
  );
}
