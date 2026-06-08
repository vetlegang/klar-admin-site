'use client';

import { useState } from 'react';
import { updateClient } from '@/lib/customer-store';
import { META_OBJECTIVES, AD_SPEND_OPTIONS, ROUND_OPTIONS } from '@/lib/types';
import type { Client, Campaign, MetaObjective } from '@/lib/types';
import KampanjeRapport from './KampanjeRapport';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function endDateFromStart(startDate: string): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

function calcROAS(revenue: number | undefined, adSpend: number): number | undefined {
  if (!revenue || !adSpend) return undefined;
  return Math.round((revenue / adSpend) * 100) / 100;
}

function calcCPL(leads: number | undefined, adSpend: number): number | undefined {
  if (!leads || !adSpend) return undefined;
  return Math.round(adSpend / leads);
}

const EMPTY_FORM = {
  round: 'Testpakke' as string,
  objective: 'Salg' as MetaObjective,
  startDate: '',
  endDate: '',
  productUrl: '',
  adSpend: '10000',
  revenue: '',
  leads: '',
  clicks: '',
  impressions: '',
  reach: '',
  videoViews: '',
  engagements: '',
  conversions: '',
  notes: '',
};

type FormState = typeof EMPTY_FORM;

function ResultsInput({
  objective,
  form,
  onChange,
}: {
  objective: MetaObjective;
  form: FormState;
  onChange: (key: keyof FormState, value: string) => void;
}) {
  if (objective === 'Salg') {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Omsetning fra annonser (NOK) *">
          <input
            type="number"
            value={form.revenue}
            onChange={(e) => onChange('revenue', e.target.value)}
            className="input"
            placeholder="F.eks. 40000"
          />
          {form.revenue && Number(form.revenue) > 0 && Number(form.adSpend) > 0 && (
            <p className="text-xs text-green-700 mt-1 font-medium">
              ROAS: {(Number(form.revenue) / Number(form.adSpend)).toFixed(2)}x
            </p>
          )}
        </Field>
        <Field label="Konverteringer">
          <input type="number" value={form.conversions} onChange={(e) => onChange('conversions', e.target.value)} className="input" placeholder="Antall" />
        </Field>
      </div>
    );
  }
  if (objective === 'Leads') {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Antall leads *">
          <input
            type="number"
            value={form.leads}
            onChange={(e) => onChange('leads', e.target.value)}
            className="input"
            placeholder="Antall"
          />
          {form.leads && Number(form.leads) > 0 && Number(form.adSpend) > 0 && (
            <p className="text-xs text-blue-700 mt-1 font-medium">
              CPL: {Math.round(Number(form.adSpend) / Number(form.leads)).toLocaleString('nb-NO')} kr/lead
            </p>
          )}
        </Field>
        <Field label="Konverteringer">
          <input type="number" value={form.conversions} onChange={(e) => onChange('conversions', e.target.value)} className="input" placeholder="Antall" />
        </Field>
      </div>
    );
  }
  if (objective === 'Trafikk') {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Klikk">
          <input type="number" value={form.clicks} onChange={(e) => onChange('clicks', e.target.value)} className="input" placeholder="Antall" />
        </Field>
        <Field label="Visninger">
          <input type="number" value={form.impressions} onChange={(e) => onChange('impressions', e.target.value)} className="input" placeholder="Antall" />
        </Field>
      </div>
    );
  }
  if (objective === 'Kjennskap / Rekkevidde') {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Rekkevidde (unike)">
          <input type="number" value={form.reach} onChange={(e) => onChange('reach', e.target.value)} className="input" placeholder="Antall" />
        </Field>
        <Field label="Visninger">
          <input type="number" value={form.impressions} onChange={(e) => onChange('impressions', e.target.value)} className="input" placeholder="Antall" />
        </Field>
      </div>
    );
  }
  if (objective === 'Videovisninger') {
    return (
      <Field label="Videovisninger">
        <input type="number" value={form.videoViews} onChange={(e) => onChange('videoViews', e.target.value)} className="input" placeholder="Antall" />
      </Field>
    );
  }
  if (objective === 'Engasjement') {
    return (
      <Field label="Engasjementer (likes, kommentarer, delinger)">
        <input type="number" value={form.engagements} onChange={(e) => onChange('engagements', e.target.value)} className="input" placeholder="Antall" />
      </Field>
    );
  }
  if (objective === 'App-installasjon') {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="App-installasjoner">
          <input type="number" value={form.conversions} onChange={(e) => onChange('conversions', e.target.value)} className="input" placeholder="Antall" />
        </Field>
        <Field label="Klikk">
          <input type="number" value={form.clicks} onChange={(e) => onChange('clicks', e.target.value)} className="input" placeholder="Antall" />
        </Field>
      </div>
    );
  }
  return null;
}

function ROASCard({ campaign }: { campaign: Campaign }) {
  const hasROAS = campaign.roas !== undefined;
  const hasCPL = campaign.cpl !== undefined;
  const adSpendFmt = campaign.adSpend.toLocaleString('nb-NO');

  return (
    <div className="grid grid-cols-2 gap-2 mt-2 sm:grid-cols-4">
      <div className="bg-gray-50 rounded-lg p-2.5 text-center">
        <p className="text-xs text-gray-500 mb-0.5">Ad Spend</p>
        <p className="text-sm font-semibold text-zinc-900">{adSpendFmt} kr</p>
      </div>
      {hasROAS && (
        <div className={`rounded-lg p-2.5 text-center ${campaign.roas! >= 3 ? 'bg-green-50' : campaign.roas! >= 1.5 ? 'bg-yellow-50' : 'bg-red-50'}`}>
          <p className="text-xs text-gray-500 mb-0.5">ROAS</p>
          <p className={`text-sm font-bold ${campaign.roas! >= 3 ? 'text-green-700' : campaign.roas! >= 1.5 ? 'text-yellow-700' : 'text-red-700'}`}>
            {campaign.roas!.toFixed(2)}x
          </p>
        </div>
      )}
      {hasCPL && (
        <div className="bg-blue-50 rounded-lg p-2.5 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Cost per Lead</p>
          <p className="text-sm font-bold text-blue-700">
            {campaign.cpl!.toLocaleString('nb-NO')} kr
          </p>
        </div>
      )}
      {campaign.results.leads != null && (
        <div className="bg-gray-50 rounded-lg p-2.5 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Leads</p>
          <p className="text-sm font-semibold text-zinc-900">{campaign.results.leads}</p>
        </div>
      )}
      {campaign.results.revenue != null && (
        <div className="bg-gray-50 rounded-lg p-2.5 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Omsetning</p>
          <p className="text-sm font-semibold text-zinc-900">{campaign.results.revenue.toLocaleString('nb-NO')} kr</p>
        </div>
      )}
    </div>
  );
}

export default function KampanjeResultater({
  client,
  onUpdate,
}: {
  client: Client;
  onUpdate: (updates: Partial<Client>) => void;
}) {
  const campaigns: Campaign[] = client.campaigns ?? [];
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });

  // Used rounds (for round selector)
  const usedRounds = ROUND_OPTIONS.filter(
    (r) => (client.roundData && client.roundData[r]) || r === 'Testpakke',
  );

  function setField(key: keyof FormState, value: string) {
    setForm((p) => {
      const next = { ...p, [key]: value };
      // Auto-set end date when start date changes
      if (key === 'startDate' && value) {
        next.endDate = endDateFromStart(value);
      }
      return next;
    });
  }

  function openNew() {
    setForm({
      ...EMPTY_FORM,
      round: client.currentRound ?? 'Testpakke',
    });
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(c: Campaign) {
    setForm({
      round: c.round,
      objective: c.objective,
      startDate: c.startDate,
      endDate: c.endDate ?? '',
      productUrl: c.productUrl ?? '',
      adSpend: String(c.adSpend),
      revenue: c.results.revenue?.toString() ?? '',
      leads: c.results.leads?.toString() ?? '',
      clicks: c.results.clicks?.toString() ?? '',
      impressions: c.results.impressions?.toString() ?? '',
      reach: c.results.reach?.toString() ?? '',
      videoViews: c.results.videoViews?.toString() ?? '',
      engagements: c.results.engagements?.toString() ?? '',
      conversions: c.results.conversions?.toString() ?? '',
      notes: c.notes ?? '',
    });
    setEditId(c.id);
    setShowForm(true);
  }

  function handleSave() {
    const revenue = form.revenue ? Number(form.revenue) : undefined;
    const leads = form.leads ? Number(form.leads) : undefined;
    const adSpendNum = Number(form.adSpend);
    const roas = calcROAS(revenue, adSpendNum);
    const cpl = calcCPL(leads, adSpendNum);

    const campaign: Campaign = {
      id: editId ?? generateId(),
      round: form.round,
      objective: form.objective as MetaObjective,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      productUrl: form.productUrl || undefined,
      adSpend: adSpendNum,
      results: {
        revenue,
        leads,
        clicks: form.clicks ? Number(form.clicks) : undefined,
        impressions: form.impressions ? Number(form.impressions) : undefined,
        reach: form.reach ? Number(form.reach) : undefined,
        videoViews: form.videoViews ? Number(form.videoViews) : undefined,
        engagements: form.engagements ? Number(form.engagements) : undefined,
        conversions: form.conversions ? Number(form.conversions) : undefined,
      },
      roas,
      cpl,
      notes: form.notes || undefined,
      createdAt: editId
        ? (campaigns.find((c) => c.id === editId)?.createdAt ?? new Date().toISOString())
        : new Date().toISOString(),
    };

    const updated = editId
      ? campaigns.map((c) => (c.id === editId ? campaign : c))
      : [...campaigns, campaign];

    onUpdate({ campaigns: updated });
    updateClient(client.id, { campaigns: updated });
    setShowForm(false);
    setEditId(null);
  }

  function handleDelete(id: string) {
    if (!confirm('Slette denne kampanjen?')) return;
    const updated = campaigns.filter((c) => c.id !== id);
    onUpdate({ campaigns: updated });
    updateClient(client.id, { campaigns: updated });
  }

  // Group by round
  const grouped: Record<string, Campaign[]> = {};
  for (const c of campaigns) {
    if (!grouped[c.round]) grouped[c.round] = [];
    grouped[c.round].push(c);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {campaigns.length === 0 ? 'Ingen kampanjer registrert ennå.' : `${campaigns.length} kampanje${campaigns.length !== 1 ? 'r' : ''} totalt`}
        </p>
        {!showForm && (
          <button
            onClick={openNew}
            className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-700 transition-colors"
          >
            + Legg til kampanje
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900">
            {editId ? 'Rediger kampanje' : 'Ny kampanje'}
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Round */}
            <Field label="Runde">
              <select
                value={form.round}
                onChange={(e) => setField('round', e.target.value)}
                className="input"
              >
                {usedRounds.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>

            {/* Objective */}
            <Field label="Kampanjemål (Meta-målsetting)">
              <select
                value={form.objective}
                onChange={(e) => setField('objective', e.target.value)}
                className="input"
              >
                {META_OBJECTIVES.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>

            {/* Start date */}
            <Field label="Startdato">
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setField('startDate', e.target.value)}
                className="input"
              />
            </Field>

            {/* End date */}
            <Field label="Sluttdato (auto-satt til 30 dager)">
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setField('endDate', e.target.value)}
                className="input"
              />
            </Field>

            {/* Ad spend */}
            <Field label="Ad Spend (NOK)">
              <select
                value={form.adSpend}
                onChange={(e) => setField('adSpend', e.target.value)}
                className="input"
              >
                {AD_SPEND_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v.toLocaleString('nb-NO')} kr
                  </option>
                ))}
              </select>
            </Field>

            {/* Product URL */}
            <Field label="Produkt-URL (kampanjelenke)">
              <input
                type="url"
                value={form.productUrl}
                onChange={(e) => setField('productUrl', e.target.value)}
                className="input"
                placeholder="https://..."
              />
            </Field>
          </div>

          {/* Dynamic results based on objective */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Resultater</p>
            <ResultsInput objective={form.objective as MetaObjective} form={form} onChange={setField} />
          </div>

          {/* Notes */}
          <Field label="Notater (valgfri)">
            <textarea
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              className="input resize-none"
              rows={2}
              placeholder="Kommentarer om kampanjen..."
            />
          </Field>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={!form.startDate}
              className="px-4 py-2 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {editId ? 'Lagre endringer' : 'Lagre kampanje'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditId(null); }}
              className="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {/* Campaign list grouped by round */}
      {campaigns.length === 0 && !showForm ? (
        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-400 mb-3">Ingen kampanjeresultater ennå</p>
          <button
            onClick={openNew}
            className="px-4 py-2 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700 transition-colors"
          >
            + Registrer første kampanje
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => {
              const ai = ROUND_OPTIONS.indexOf(a as typeof ROUND_OPTIONS[number]);
              const bi = ROUND_OPTIONS.indexOf(b as typeof ROUND_OPTIONS[number]);
              return ai - bi;
            })
            .map(([round, roundCampaigns]) => (
              <div key={round}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{round}</h3>
                <div className="space-y-3">
                  {roundCampaigns.map((c) => (
                    <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-zinc-900">{c.objective}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">{fmt(c.startDate)}{c.endDate ? ` – ${fmt(c.endDate)}` : ''}</span>
                          </div>
                          {c.productUrl && (
                            <a
                              href={c.productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline truncate block mt-0.5"
                            >
                              {c.productUrl}
                            </a>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => openEdit(c)}
                            className="text-xs text-gray-400 hover:text-zinc-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                          >
                            Rediger
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-xs text-red-400 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          >
                            Slett
                          </button>
                        </div>
                      </div>

                      <ROASCard campaign={c} />

                      {c.notes && (
                        <p className="text-xs text-gray-500 mt-2 italic">{c.notes}</p>
                      )}

                      <KampanjeRapport
                        bedrift={client.bedrift}
                        bransje={client.bransje}
                        campaign={c}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
