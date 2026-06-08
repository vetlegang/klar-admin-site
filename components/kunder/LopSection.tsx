'use client';

import { useState } from 'react';
import { updateClient } from '@/lib/customer-store';
import { ROUND_OPTIONS } from '@/lib/types';
import type { Client, RoundData } from '@/lib/types';

const TODAY = () => new Date().toISOString().split('T')[0];

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - new Date(TODAY()).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getDateBadge(dateStr: string, isDone: boolean): { label: string; color: string } | null {
  if (isDone || !dateStr) return null;
  const days = daysUntil(dateStr);
  if (days < 0) return { label: `${Math.abs(days)}d forfalt`, color: 'bg-red-100 text-red-700 border-red-200' };
  if (days === 0) return { label: 'I dag!', color: 'bg-red-100 text-red-700 border-red-200' };
  if (days <= 3) return { label: `${days}d igjen`, color: 'bg-orange-100 text-orange-700 border-orange-200' };
  if (days <= 7) return { label: `${days}d igjen`, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  return null;
}

function getMissingAlerts(rd: RoundData, isFirst: boolean): string[] {
  const warnings: string[] = [];
  if (rd.kampanjeLive) {
    if (isFirst && !rd.kontraktSignert) warnings.push('Kontrakt ikke signert');
    if (!rd.addSpendBetalt) warnings.push('Add spend ikke betalt');
    if (!rd.serviceInvoiceSent) warnings.push('Faktura for honorar ikke sendt');
  }
  if (rd.opt1Done && !rd.opt1MoteBooket) warnings.push('Møte for opt. 1 ikke booket');
  if (rd.opt2Done && !rd.opt2MoteBooket) warnings.push('Møte for opt. 2 ikke booket');
  return warnings;
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface MilestoneStep {
  key: keyof RoundData;
  dateKey: keyof RoundData;
  label: string;
  icon: string;
  onlyFirstRound?: boolean;
  subSteps?: Array<{ key: keyof RoundData; dateKey: keyof RoundData; label: string }>;
}

const MILESTONES: MilestoneStep[] = [
  {
    key: 'metaSetupDone',
    dateKey: 'metaSetupDate',
    label: 'Oppsett av Meta-konto',
    icon: '⚙️',
    onlyFirstRound: true,
  },
  {
    key: 'kontraktSignert',
    dateKey: 'kontraktDato',
    label: 'Signert testpakke / kontrakt',
    icon: '✍️',
    onlyFirstRound: true,
  },
  {
    key: 'addSpendBetalt',
    dateKey: 'addSpendDato',
    label: 'Betalt add spend',
    icon: '💳',
  },
  {
    key: 'serviceInvoiceSent',
    dateKey: 'serviceInvoiceDato',
    label: 'Sendt faktura for tjenestehonorar',
    icon: '📄',
  },
  {
    key: 'kampanjeLive',
    dateKey: 'kampanjeLiveDato',
    label: 'Kampanje live',
    icon: '🚀',
  },
  {
    key: 'opt1Done',
    dateKey: 'opt1Dato',
    label: 'Optimalisering av winning ads',
    icon: '🎯',
    subSteps: [
      { key: 'opt1MoteBooket', dateKey: 'opt1MoteDato', label: 'Møte booket (opt. 1)' },
    ],
  },
  {
    key: 'opt2Done',
    dateKey: 'opt2Dato',
    label: '2. optimalisering av ads',
    icon: '🔁',
    subSteps: [
      { key: 'opt2MoteBooket', dateKey: 'opt2MoteDato', label: 'Møte booket (opt. 2)' },
    ],
  },
];

function emptyRound(): RoundData {
  return {
    metaSetupDone: false,
    metaSetupDate: '',
    kontraktSignert: false,
    kontraktDato: '',
    addSpendBetalt: false,
    addSpendDato: '',
    serviceInvoiceSent: false,
    serviceInvoiceDato: '',
    kampanjeLive: false,
    kampanjeLiveDato: '',
    opt1Done: false,
    opt1Dato: '',
    opt1MoteBooket: false,
    opt1MoteDato: '',
    opt2Done: false,
    opt2Dato: '',
    opt2MoteBooket: false,
    opt2MoteDato: '',
  };
}

function calcProgress(round: RoundData, isFirst: boolean): number {
  const keys: (keyof RoundData)[] = isFirst
    ? ['metaSetupDone', 'kontraktSignert', 'addSpendBetalt', 'serviceInvoiceSent', 'kampanjeLive', 'opt1Done', 'opt1MoteBooket', 'opt2Done', 'opt2MoteBooket']
    : ['addSpendBetalt', 'serviceInvoiceSent', 'kampanjeLive', 'opt1Done', 'opt1MoteBooket', 'opt2Done', 'opt2MoteBooket'];
  const done = keys.filter((k) => round[k]).length;
  return Math.round((done / keys.length) * 100);
}

export default function LopSection({
  client,
  onUpdate,
}: {
  client: Client;
  onUpdate: (updates: Partial<Client>) => void;
}) {
  const [selectedRound, setSelectedRound] = useState<string>(
    client.currentRound ?? 'Testpakke',
  );
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const roundData: Record<string, RoundData> = client.roundData ?? {};

  function getRound(roundName: string): RoundData {
    return roundData[roundName] ?? emptyRound();
  }

  function saveRound(roundName: string, data: RoundData) {
    const updated = { ...roundData, [roundName]: data };
    onUpdate({ roundData: updated, currentRound: roundName });
    updateClient(client.id, { roundData: updated, currentRound: roundName });
  }

  function toggleStep(roundName: string, key: keyof RoundData, dateKey: keyof RoundData) {
    const rd = getRound(roundName);
    const current = rd[key] as boolean | undefined;
    const wasChecked = !!current;
    const newRd = {
      ...rd,
      [key]: !wasChecked,
      [dateKey]: !wasChecked && !rd[dateKey] ? TODAY() : rd[dateKey],
    } as RoundData;
    saveRound(roundName, newRd);
  }

  function setDate(roundName: string, dateKey: keyof RoundData, value: string) {
    const rd = { ...getRound(roundName), [dateKey]: value } as RoundData;
    saveRound(roundName, rd);
  }

  const isFirstRound = selectedRound === 'Testpakke';
  const current = getRound(selectedRound);
  const progress = calcProgress(current, isFirstRound);
  const missingAlerts = getMissingAlerts(current, isFirstRound);

  // Which rounds have been started?
  const usedRounds = ROUND_OPTIONS.filter(
    (r) => roundData[r] || r === 'Testpakke',
  );

  // Add new round
  const canAddRound = ROUND_OPTIONS.findIndex((r) => !usedRounds.includes(r)) !== -1;
  const nextRound = ROUND_OPTIONS.find((r) => !usedRounds.includes(r));

  function addRound() {
    if (!nextRound) return;
    const updated = { ...roundData, [nextRound]: emptyRound() };
    onUpdate({ roundData: updated, currentRound: nextRound });
    updateClient(client.id, { roundData: updated, currentRound: nextRound });
    setSelectedRound(nextRound);
  }

  return (
    <div className="space-y-4">
      {/* Round selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {usedRounds.map((r) => {
          const rd = getRound(r);
          const prog = calcProgress(rd, r === 'Testpakke');
          return (
            <button
              key={r}
              onClick={() => setSelectedRound(r)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                selectedRound === r
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-700 border-gray-200 hover:border-zinc-400'
              }`}
            >
              {r}
              {prog === 100 && <span className="text-green-400">✓</span>}
              {prog > 0 && prog < 100 && (
                <span className={`text-xs opacity-75`}>{prog}%</span>
              )}
            </button>
          );
        })}
        {canAddRound && (
          <button
            onClick={addRound}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-gray-300 text-gray-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors"
          >
            + {nextRound}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">{selectedRound} – fremgang</span>
          <span className="text-xs font-semibold text-zinc-900">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-zinc-900 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Inline alerts */}
      {missingAlerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 space-y-1">
          <p className="text-xs font-semibold text-yellow-800 mb-1.5">⚠ Husk å huke av:</p>
          {missingAlerts.map((w) => (
            <p key={w} className="text-xs text-yellow-700">• {w}</p>
          ))}
        </div>
      )}

      {/* Milestone steps */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-5 bottom-5 w-px bg-gray-200" />

        <div className="space-y-2">
          {MILESTONES.filter(
            (m) => !m.onlyFirstRound || isFirstRound,
          ).map((step, idx, visibleSteps) => {
            const done = !!(current[step.key] as boolean | undefined);
            const dateVal = (current[step.dateKey] as string | undefined) ?? '';
            const isExpanded = expandedDate === step.key;
            const dateBadge = getDateBadge(dateVal, done);

            // Determine if step is "reachable" (previous done)
            const prevStep = idx > 0 ? visibleSteps[idx - 1] : null;
            const prevDone = prevStep ? !!(current[prevStep.key] as boolean | undefined) : true;

            return (
              <div key={step.key} className="relative pl-10">
                {/* Circle indicator */}
                <div
                  className={`absolute left-2.5 top-2.5 w-3 h-3 rounded-full border-2 transition-colors ${
                    done
                      ? 'bg-green-500 border-green-500'
                      : prevDone
                      ? 'bg-white border-zinc-400'
                      : 'bg-white border-gray-200'
                  }`}
                />

                <div
                  className={`rounded-xl border p-3 transition-all ${
                    done
                      ? 'bg-green-50 border-green-200'
                      : prevDone
                      ? 'bg-white border-gray-200 hover:border-zinc-300'
                      : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-base leading-none">{step.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-medium ${done ? 'text-green-800 line-through' : prevDone ? 'text-zinc-900' : 'text-gray-400'}`}>
                            {step.label}
                          </p>
                          {dateBadge && (
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${dateBadge.color}`}>
                              {dateBadge.label}
                            </span>
                          )}
                        </div>
                        {done && dateVal && (
                          <p className="text-xs text-green-600 mt-0.5">{fmt(dateVal)}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {done && (
                        <button
                          onClick={() => setExpandedDate(isExpanded ? null : step.key)}
                          className="text-xs text-gray-400 hover:text-zinc-700 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors"
                        >
                          {isExpanded ? 'Skjul' : 'Endre dato'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          toggleStep(selectedRound, step.key, step.dateKey);
                          if (!done) setExpandedDate(null);
                        }}
                        disabled={!prevDone && !done}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          done
                            ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600'
                            : prevDone
                            ? 'bg-zinc-900 text-white hover:bg-zinc-700'
                            : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {done ? '✓ Ferdig' : 'Merk ferdig'}
                      </button>
                    </div>
                  </div>

                  {/* Date picker */}
                  {(isExpanded || (!done && prevDone)) && (
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2">
                      <span className="text-xs text-gray-500">Dato:</span>
                      <input
                        type="date"
                        value={dateVal}
                        onChange={(e) => setDate(selectedRound, step.dateKey, e.target.value)}
                        className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                      />
                    </div>
                  )}

                  {/* Sub-steps (Møte booket) */}
                  {done && step.subSteps && step.subSteps.map((sub) => {
                    const subDone = !!(current[sub.key] as boolean | undefined);
                    const subDate = (current[sub.dateKey] as string | undefined) ?? '';

                    return (
                      <div key={sub.key} className="mt-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">↳</span>
                            <span className={`text-xs font-medium ${subDone ? 'text-green-700 line-through' : 'text-zinc-700'}`}>
                              {sub.label}
                            </span>
                            {subDone && subDate && (
                              <span className="text-xs text-green-600">{fmt(subDate)}</span>
                            )}
                          </div>
                          <button
                            onClick={() => toggleStep(selectedRound, sub.key, sub.dateKey)}
                            className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${
                              subDone
                                ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600'
                                : 'bg-zinc-800 text-white hover:bg-zinc-600'
                            }`}
                          >
                            {subDone ? '✓ Booket' : 'Book møte'}
                          </button>
                        </div>
                        {!subDone && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-xs text-gray-500">Dato:</span>
                            <input
                              type="date"
                              value={subDate}
                              onChange={(e) => setDate(selectedRound, sub.dateKey, e.target.value)}
                              className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Round start date */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-600">Rundestartdato:</span>
          <input
            type="date"
            value={current.startDate ?? ''}
            onChange={(e) => setDate(selectedRound, 'startDate', e.target.value)}
            className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
          {current.startDate && (
            <span className="text-xs text-gray-500">
              Kampanje slutter ca. {fmt(
                new Date(
                  new Date(current.startDate).getTime() + 30 * 24 * 60 * 60 * 1000
                ).toISOString().split('T')[0]
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
