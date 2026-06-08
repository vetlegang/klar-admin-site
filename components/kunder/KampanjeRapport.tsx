'use client';

import { useState } from 'react';
import type { Campaign } from '@/lib/types';
import type { ReportData, ReportInput } from '@/app/api/generate-report/route';

interface Props {
  bedrift: string;
  bransje?: string;
  campaign: Campaign;
}

export default function KampanjeRapport({ bedrift, bransje, campaign }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState('');

  async function generate() {
    if (!campaign.results) return;
    setStatus('loading');
    setError('');
    try {
      const input: ReportInput = {
        bedrift,
        bransje,
        roundName: campaign.round,
        adSpend: Number(campaign.adSpend) || 0,
        results: campaign.results,
        period: campaign.startDate
          ? new Date(campaign.startDate).toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })
          : undefined,
      };
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? 'Ukjent feil');
      setReport(data.report);
      setStatus('done');
    } catch (err) {
      setError(String(err));
      setStatus('error');
    }
  }

  function printPdf() {
    window.print();
  }

  if (status === 'idle' || status === 'loading' || status === 'error') {
    return (
      <div className="mt-4">
        <button
          onClick={generate}
          disabled={status === 'loading' || !campaign.results}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          {status === 'loading' ? (
            <>
              <span className="animate-spin">⟳</span> Genererer rapport…
            </>
          ) : (
            <>✨ Generer AI-rapport</>
          )}
        </button>
        {status === 'error' && (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        )}
        {!campaign.results && (
          <p className="mt-2 text-xs text-gray-400">Legg inn kampanjeresultater først.</p>
        )}
      </div>
    );
  }

  if (!report) return null;

  return (
    <>
      {/* Screen: action bar */}
      <div className="mt-4 flex items-center gap-3 print:hidden">
        <button
          onClick={printPdf}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700 transition-colors"
        >
          📄 Last ned PDF
        </button>
        <button
          onClick={() => setStatus('idle')}
          className="text-xs text-gray-500 hover:text-zinc-700 underline"
        >
          Generer på nytt
        </button>
      </div>

      {/* Report — visible on screen + in print */}
      <div id="rapport-pdf" className="mt-6 font-sans">
        <style>{`
          @media print {
            body > * { display: none !important; }
            #rapport-pdf { display: block !important; position: static !important; }
            #rapport-pdf { font-family: -apple-system, sans-serif; color: #18181b; }
          }
        `}</style>

        {/* Header */}
        <div className="bg-zinc-900 text-white rounded-2xl p-8 mb-6 print:rounded-none">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-bold tracking-tight">Fujii</span>
            <span className="text-sm text-zinc-400">Performance Marketing</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">{report.title}</h1>
          <p className="text-zinc-300 text-sm leading-relaxed">{report.ingress}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-3">
          {report.stats.map((s, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{s.emoji}</span>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900 mb-1">{s.value}</p>
              <p className="text-xs text-gray-500 leading-snug">{s.context}</p>
            </div>
          ))}
        </div>

        {/* Sections */}
        <div className="space-y-5 mb-6">
          {report.sections.map((sec, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-base font-bold text-zinc-900 mb-3">{sec.heading}</h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{sec.body}</p>
            </div>
          ))}
        </div>

        {/* Next round */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 mb-6">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Neste steg</p>
          <p className="text-sm font-medium text-zinc-900">{report.nextRound}</p>
        </div>

        {/* Footer */}
        <div className="text-center py-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">{report.closingLine}</p>
          <p className="text-xs text-gray-300 mt-1">Fujii · fujii.no</p>
        </div>
      </div>
    </>
  );
}
