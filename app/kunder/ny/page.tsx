'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import { addClient, generateClientId } from '@/lib/customer-store';
import { PIPELINE_STAGES } from '@/lib/types';
import type { Client, PipelineStage, Priority } from '@/lib/types';
import type { EnrichResult } from '@/app/api/enrich/route';

const PRIORITET_OPTIONS = ['Lav', 'Medium', 'Høy', 'Kritisk'];
const ANSVARLIG_OPTIONS = ['Vetle G.', 'Markus S.'];

interface FormState {
  bedriftsnavn: string;
  nettside: string;
  orgNumber: string;
  adresse: string;
  postnummer: string;
  by: string;
  bransje: string;
  kontaktperson: string;
  epost: string;
  telefon: string;
  kortBeskrivelse: string;
  status: string;
  ansvarlig: string;
  prioritet: string;
  nesteAction: string;
  nesteFrist: string;
  internKommentar: string;
}

const EMPTY_FORM: FormState = {
  bedriftsnavn: '',
  nettside: '',
  orgNumber: '',
  adresse: '',
  postnummer: '',
  by: '',
  bransje: '',
  kontaktperson: '',
  epost: '',
  telefon: '',
  kortBeskrivelse: '',
  status: 'Lead',
  ansvarlig: 'Vetle G.',
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
  const [enrichError, setEnrichError] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  function set(field: keyof FormState, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleEnrich() {
    const input = url.trim();
    if (!input) return;
    setLoading(true);
    setEnrichError('');
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input }),
      });
      if (!res.ok) throw new Error('Feil fra server');
      const data: EnrichResult = await res.json();
      setForm((p) => ({
        ...p,
        bedriftsnavn: data.bedriftsnavn || p.bedriftsnavn,
        nettside: data.nettside || p.nettside,
        orgNumber: data.orgNumber || p.orgNumber,
        adresse: data.adresse || p.adresse,
        postnummer: data.postnummer || p.postnummer,
        by: data.by || p.by,
        bransje: data.bransje || p.bransje,
        epost: data.epost || p.epost,
        telefon: data.telefon || p.telefon,
        kortBeskrivelse: data.kortBeskrivelse || p.kortBeskrivelse,
      }));
      setEnriched(true);
    } catch {
      setEnrichError('Klarte ikke hente info. Fyll inn manuelt.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    const id = generateClientId();

    const newClient = {
      id,
      bedrift: form.bedriftsnavn,
      kontaktperson: form.kontaktperson,
      epost: form.epost,
      telefon: form.telefon,
      nettside: form.nettside,
      bransje: form.bransje,
      orgNumber: form.orgNumber,
      adresse: form.adresse,
      postnummer: form.postnummer,
      by: form.by,
      kortBeskrivelse: form.kortBeskrivelse,
      status: form.status as PipelineStage,
      pakke: '',
      verdi: 0,
      ansvarlig: form.ansvarlig,
      prioritet: form.prioritet as Priority,
      betalingsstatus: 'Ikke betalt' as const,
      kontraktstatus: 'Ikke signert' as const,
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
          type: 'status' as const,
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
    } as Client;

    addClient(newClient);
    router.push(`/kunder/${id}`);
  }

  return (
    <>
      <Topbar
        title="Ny kunde"
        subtitle="Legg til bedrift i Fujii Admin"
        actions={
          <Link href="/kunder" className="text-xs text-gray-500 hover:text-zinc-900">
            ← Tilbake
          </Link>
        }
      />

      <main className="flex-1 p-6">
        <form onSubmit={handleSubmit} className="max-w-xl space-y-5">

          {/* URL enrichment */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-zinc-900 mb-1">Hent bedriftsinfo automatisk</h2>
            <p className="text-xs text-gray-500 mb-3">
              Lim inn nettstedet — vi henter navn, adresse og kontaktinfo fra nettsiden og Brønnøysundregistrene.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEnrich(); } }}
                placeholder="https://bedrift.no"
                className="input flex-1"
              />
              <button
                type="button"
                onClick={handleEnrich}
                disabled={loading || !url.trim()}
                className="px-4 py-2 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Henter…
                  </span>
                ) : 'Hent info'}
              </button>
            </div>
            {enriched && <p className="text-xs text-green-600 mt-2">✓ Info hentet. Sjekk og juster om nødvendig.</p>}
            {enrichError && <p className="text-xs text-orange-600 mt-2">{enrichError}</p>}
          </div>

          {/* Company info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-900">Bedriftsinformasjon</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Bedriftsnavn *" htmlFor="bedriftsnavn" span2>
                <input id="bedriftsnavn" value={form.bedriftsnavn} onChange={(e) => set('bedriftsnavn', e.target.value)} required className="input" placeholder="Firma AS" />
              </FormField>
              <FormField label="Nettside" htmlFor="nettside">
                <input id="nettside" value={form.nettside} onChange={(e) => set('nettside', e.target.value)} className="input" placeholder="https://eksempel.no" />
              </FormField>
              <FormField label="Org.nr" htmlFor="orgNumber">
                <input id="orgNumber" value={form.orgNumber} onChange={(e) => set('orgNumber', e.target.value)} className="input" placeholder="999 999 999" />
              </FormField>
              <FormField label="Bransje" htmlFor="bransje">
                <input id="bransje" value={form.bransje} onChange={(e) => set('bransje', e.target.value)} className="input" placeholder="Eks: E-handel, Restaurant..." />
              </FormField>
              <FormField label="By" htmlFor="by">
                <input id="by" value={form.by} onChange={(e) => set('by', e.target.value)} className="input" placeholder="Oslo" />
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
              <FormField label="Kort om bedriften" htmlFor="kortBeskrivelse" span2>
                <textarea id="kortBeskrivelse" value={form.kortBeskrivelse} onChange={(e) => set('kortBeskrivelse', e.target.value)} className="input resize-none" rows={2} placeholder="Hva gjør bedriften?" />
              </FormField>
            </div>
          </div>

          {/* Pipeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-900">Oppfølging</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <FormField label="Prioritet" htmlFor="prioritet">
                <select id="prioritet" value={form.prioritet} onChange={(e) => set('prioritet', e.target.value)} className="input">
                  {PRIORITET_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </FormField>
              <FormField label="Neste frist" htmlFor="nesteFrist">
                <input id="nesteFrist" type="date" value={form.nesteFrist} onChange={(e) => set('nesteFrist', e.target.value)} className="input" />
              </FormField>
              <FormField label="Neste action" htmlFor="nesteAction" span2>
                <input id="nesteAction" value={form.nesteAction} onChange={(e) => set('nesteAction', e.target.value)} className="input" placeholder="Eks: Send tilbud, Book møte..." />
              </FormField>
              <FormField label="Intern kommentar" htmlFor="internKommentar" span2>
                <textarea id="internKommentar" value={form.internKommentar} onChange={(e) => set('internKommentar', e.target.value)} className="input resize-none" rows={2} placeholder="Kun synlig internt" />
              </FormField>
            </div>
          </div>

          <div className="flex items-center gap-3 pb-8">
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

function FormField({
  label,
  htmlFor,
  span2,
  children,
}: {
  label: string;
  htmlFor: string;
  span2?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
