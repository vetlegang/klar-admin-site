import { NextRequest, NextResponse } from 'next/server';

export interface ReportInput {
  bedrift: string;
  bransje?: string;
  roundName: string;
  adSpend: number;
  results: {
    revenue?: number;
    leads?: number;
    clicks?: number;
    impressions?: number;
    reach?: number;
    videoViews?: number;
    engagements?: number;
    conversions?: number;
  };
  period?: string; // e.g. "mai–juni 2026"
}

export interface ReportData {
  title: string;
  ingress: string;
  stats: { label: string; value: string; context: string; emoji: string }[];
  sections: { heading: string; body: string }[];
  nextRound: string;
  closingLine: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY mangler' }, { status: 500 });
  }

  const input: ReportInput = await req.json();
  const { bedrift, bransje, roundName, adSpend, results, period } = input;

  const roas = results.revenue && adSpend > 0
    ? (results.revenue / adSpend).toFixed(2)
    : null;
  const cpl = results.leads && adSpend > 0
    ? Math.round(adSpend / results.leads)
    : null;
  const ctr = results.clicks && results.impressions && results.impressions > 0
    ? ((results.clicks / results.impressions) * 100).toFixed(2)
    : null;

  const statsText = [
    adSpend ? `Ad spend: kr ${adSpend.toLocaleString('nb-NO')}` : null,
    results.revenue ? `Omsetning fra annonser: kr ${results.revenue.toLocaleString('nb-NO')}` : null,
    roas ? `ROAS: ${roas}` : null,
    results.leads ? `Leads: ${results.leads}` : null,
    cpl ? `Kostnad per lead (CPL): kr ${cpl}` : null,
    results.clicks ? `Klikk: ${results.clicks.toLocaleString('nb-NO')}` : null,
    results.impressions ? `Visninger: ${results.impressions.toLocaleString('nb-NO')}` : null,
    results.reach ? `Rekkevidde: ${results.reach.toLocaleString('nb-NO')} unike` : null,
    ctr ? `CTR: ${ctr}%` : null,
    results.videoViews ? `Videovisninger: ${results.videoViews.toLocaleString('nb-NO')}` : null,
    results.engagements ? `Engasjementer: ${results.engagements.toLocaleString('nb-NO')}` : null,
    results.conversions ? `Konverteringer: ${results.conversions}` : null,
  ].filter(Boolean).join('\n');

  const prompt = `Du er en ekspert på Meta-annonsering og skriver kampanjerapporter for Fujii, et norsk performance marketing-byrå.

Skriv en profesjonell og engasjerende kampanjerapport for følgende kampanje:

Bedrift: ${bedrift}
Bransje: ${bransje || 'ikke oppgitt'}
Kampanje: ${roundName}
Periode: ${period || 'siste periode'}

Resultater:
${statsText}

Skriv rapporten på norsk. Tonen skal være profesjonell men varm, og du skal feire de gode resultatene. Rapporten skal leses av kunden (bedriften), ikke av Fujii internt.

Returner BARE gyldig JSON i dette eksakte formatet (ingen markdown, ingen forklaring utenfor JSON):

{
  "title": "Kampanjerapport: [bedriftsnavn] – [periode]",
  "ingress": "2-3 setninger som feirer kampanjen og gir et positivt overblikk",
  "stats": [
    {
      "label": "Nøkkeltallnavn",
      "value": "Tallet formatert pent",
      "context": "1 setning som forklarer hva dette betyr og om det er bra (sammenlign med Meta-benchmark)",
      "emoji": "passende emoji"
    }
  ],
  "sections": [
    {
      "heading": "Hva fungerte bra",
      "body": "2-3 avsnitt om hva som gikk bra og hvorfor"
    },
    {
      "heading": "Hva tallene forteller oss",
      "body": "Forklar de viktigste tallene på vanlig norsk – hva betyr ROAS, CPL osv. for denne bedriften konkret"
    },
    {
      "heading": "Anbefalinger for neste runde",
      "body": "Konkrete, spesifikke anbefalinger basert på resultatene. Hva skal vi skalere, hva skal vi teste?"
    }
  ],
  "nextRound": "Én inspirerende setning om neste runde",
  "closingLine": "En avsluttende takk-setning fra Fujii"
}

Inkluder kun stats for tall som faktisk er oppgitt. ROAS over 2.0 er bra for Meta. CPL varierer per bransje men under 200 kr er sterkt. CTR over 1% er bra. Rekkevidde og videovisninger er branding-verdier.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: err }, { status: response.status });
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? '';

  try {
    const report: ReportData = JSON.parse(text);
    return NextResponse.json({ report });
  } catch {
    return NextResponse.json({ error: 'Claude returnerte ugyldig JSON', raw: text }, { status: 500 });
  }
}
