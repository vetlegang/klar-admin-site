'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import { enrichCompanyFromUrl } from '@/lib/enrich-company';
import { addClient, generateClientId } from '@/lib/customer-store';
import { PIPELINE_STAGES } from '@/lib/types';
import type { Client, PipelineStage, Priority, ShootOption } from '@/lib/types';
import type { CompanyEnrichment } from '@/lib/enrich-company';
import { PROVEPAKKE, computeTotalPrice } from '@/lib/packages';

const PAKKE_OPTIONS = ['Ingen valgt', 'Prøvepakke'];
const PRIORITET_OPTIONS = ['Lav', 'Medium', 'Høy', 'Kritisk'];
const ANSVARLIG_OPTIONS = ['Vetle G.', 'Markus S.'];

type FormState = CompanyEnrichment & {
  status: string;
  ansvarlig: string;
  pakke: string;
  shootOption: ShootOption;
  prioritet: string;
  nesteAction: string;
  nesteFrist: string;
  internKommentar: string;
};

const EMPTY_FORM: FormState = {
  bedriftsnavn: '',
  nettside: '',
  orgNumber: '',
  adresse: '',
  postnummer: '',
  by: '',
  land: 'Norge',
  bransje: '',
  kontaktperson: '',
  epost: '',
  telefon: '',
  kortBeskrivelse: '',
  status: 'Lead',
  ansvarlig: 'Vetle G.',
  pakke: 'Ingen valgt',
  shootOption: 'ingen_shoot',
  prioritet: 'Medium',
  nesteAction: '',
  nesteFrist: '',
  internKommentar: '',
};

export default function NyKundePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [enriched, setEnriched] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  function set(field: keyof FormState, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleEnrich() {
    if (!url.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    const data = enrichCompanyFromUrl(url.trim());
    setForm((p) => ({ ...p, ...data }));
    setEnriched(true);
    setLoading(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    const id = generateClientId();
    const hasPakke = form.pakke !== 'Ingen valgt';
    const totalPrice = hasPakke ? computeTotalPrice(form.shootOption) : 0;

    const newClient: Client = {
      id,
      bedrift: form.bedriftsnavn,
      kontaktperson: form.kontaktperson,
      epost: form.epost,
      telefon: form.telefon,
      nettside: form.nettside,
      bransje: form.bransje,
      status: form.status as PipelineStage,
      pakke: hasPakke ? form.pakke : '',
      shootOption: hasPakke ? form.shootOption : undefined,
      verdi: totalPrice,
      ansvarlig: form.ansvarlig,
      prioritet: form.prioritet as Priority,
      betalingsstatus: 'Ikke betalt',
      kontraktstatus: 'Ikke signert',
      contentMottatt: false,
      adsLive: false,
      sistKontaktet: today,
      nesteAction: form.nesteAction,
      nesteFrist: form.nesteFrist || null,
      notater: form.internKommentar,
      aktivitetslogg: [
        {
          id: generateClientId(),
          dato: today,
          type: 'status',
          tekst: `Kunde opprettet med status "${form.status}".`,
          bruker: form.ansvarlig,
        },
      ],
      oppgaver: [],
      invoiceSent: false,
      onboardingComplete: false,
      metaAccessReceived: false,
      brandAssetsReceived: false,
      resultsChecked: false,
      reportSent: false,
      statusChangedAt: today,
      offboardingEmailSent: false,
      finalInvoiceSent: false,
      deliveryCompleted: false,
      currentRound: 'Testpakke',
      roundData: {},
      campaigns: [],
    };
    addClient(newClient);
    router.push(`/kunder/${id}`);
  }

  return (
    <>
      <Topbar
        title="Legg til ny kunde"
        subtitle="Fyll inn bedriftsinformasjon"
        actions={
          <Link href="/kunder" className="text-xs text-gray-500 hover:text-zinc-900">
            ← Tilbake
          </Link>
        }
      />

      <main className="flex-1 p-6">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
          {/* Step 1: URL (optional prefill) */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-900 text-white text-xs mr-2">1</span>
              Nettstedsadresse <span className="text-xs font-normal text-gray-400 ml-1">(valgfri – forhåndsutfyller skjemaet)</span>
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEnrich(); } }}
                placeholder="https://eksempel.no"
                className="input flex-1"
              />
              <button
                type="button"
                onClick={handleEnrich}
                disabled={loading || !url.trim()}
                className="px-4 py-2 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {loading ? 'Henter…' : 'Hent bedriftsinfo'}
              </button>
            </div>
            {enriched && (
              <p className="text-xs text-green-600 mt-2">✓ Bedriftsinfo hentet og fyllt inn. Rediger gjerne.</p>
            )}
          </div>

          {/* Step 2: Company info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-900 text-white text-xs mr-2">2</span>
              Bedriftsinformasjon
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Bedriftsnavn *" htmlFor="bedriftsnavn">
                <input id="bedriftsnavn" value={form.bedriftsnavn} onChange={(e) => set('bedriftsnavn', e.target.value)} required className="input" placeholder="Firma AS" />
              </FormField>
              <FormField label="Nettside" htmlFor="nettside">
                <input id="nettside" value={form.nettside} onChange={(e) => set('nettside', e.target.value)} className="input" placeholder="https://eksempel.no" />
              </FormField>
              <FormField label="Org.nr" htmlFor="orgNumber">
                <input id="orgNumber" value={form.orgNumber} onChange={(e) => set('orgNumber', e.target.value)} className="input" placeholder="999 999 999" />
              </FormField>
              <FormField label="Bransje" htmlFor="bransje">
                <input id="bransje" value={form.bransje} onChange={(e) => set('bransje', e.target.value)} className="input" placeholder="Eks: E-handel, SaaS..." />
              </FormField>
              <FormField label="Kontaktperson" htmlFor="kontaktperson">
                <input id="kontaktperson" value={form.kontaktperson} onChange={(e) => set('kontaktperson', e.target.value)} className="input" placeholder="Ola Nordmann" />
              </FormField>
              <FormField label="E-post" htmlFor="epost">
                <input id="epost" type="email" value={form.epost} onChange={(e) => set('epost', e.target.value)} className="input" placeholder="kontakt@eksempel.no" />
              </FormField>
              <FormField label="Telefon" htmlFor="telefon">
                <input id="telefon" value={form.telefon} onChange={(e) => set('telefon', e.target.value)} className="input" placeholder="+47 900 00 000" />
              </FormField>
              <FormField label="Land" htmlFor="land">
                <input id="land" value={form.land} onChange={(e) => set('land', e.target.value)} className="input" />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Kort beskrivelse" htmlFor="kortBeskrivelse">
                  <textarea id="kortBeskrivelse" value={form.kortBeskrivelse} onChange={(e) => set('kortBeskrivelse', e.target.value)} className="input resize-none" rows={3} placeholder="Hva gjør bedriften?" />
                </FormField>
              </div>
            </div>
          </div>

          {/* Step 3: Pipeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-900 text-white text-xs mr-2">3</span>
              Pipeline og oppfølging
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Status" htmlFor="status">
                <select id="status" value={form.status} onChange={(e) => set('status', e.target.value)} className="input">
                  {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Ansvarlig" htmlFor="ansvarlig">
                <select id="ansvarlig" value={form.ansvarlig} onChange={(e) => set('ansvarlig', e.target.value)} className="input">
                  {ANSVARLIG_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </FormField>
              <FormField label="Pakke" htmlFor="pakke">
                <select id="pakke" value={form.pakke} onChange={(e) => set('pakke', e.target.value)} className="input">
                  {PAKKE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </FormField>
              {form.pakke === 'Prøvepakke' && (
                <div className="sm:col-span-2">
                  <FormField label="Shoot-tilvalg" htmlFor="shootOption">
                    <div className="space-y-2 mt-1">
                      {PROVEPAKKE.shootAddOns.map((addon) => (
                        <label key={addon.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50">
                          <input
                            type="radio"
                            name="shootOption"
                            value={addon.id}
                            checked={form.shootOption === addon.id}
                            onChange={(e) => set('shootOption', e.target.value)}
                            className="mt-0.5 accent-zinc-900"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-zinc-900">{addon.label}</span>
                              <span className="text-sm font-semibold text-zinc-900 shrink-0">
                                {addon.totalPrice.toLocaleString('nb-NO')} kr
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{addon.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </FormField>
                </div>
              )}
              <FormField label="Prioritet" htmlFor="prioritet">
                <select id="prioritet" value={form.prioritet} onChange={(e) => set('prioritet', e.target.value)} className="input">
                  {PRIORITET_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </FormField>
              <FormField label="Neste action" htmlFor="nesteAction">
                <input id="nesteAction" value={form.nesteAction} onChange={(e) => set('nesteAction', e.target.value)} className="input" placeholder="Eks: Send tilbud, Book møte..." />
              </FormField>
              <FormField label="Neste frist" htmlFor="nesteFrist">
                <input id="nesteFrist" type="date" value={form.nesteFrist} onChange={(e) => set('nesteFrist', e.target.value)} className="input" />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Intern kommentar" htmlFor="internKommentar">
                  <textarea id="internKommentar" value={form.internKommentar} onChange={(e) => set('internKommentar', e.target.value)} className="input resize-none" rows={2} placeholder="Kun synlig internt i Klyr Admin" />
                </FormField>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!form.bedriftsnavn.trim()}
              className="px-6 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Opprett kunde
            </button>
            <Link href="/kunder" className="text-xs text-gray-500 hover:underline">Avbryt</Link>
          </div>
        </form>
      </main>
    </>
  );
}

function FormField({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
