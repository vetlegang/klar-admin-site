import { NextRequest, NextResponse } from 'next/server';

export interface EnrichResult {
  bedriftsnavn: string;
  nettside: string;
  orgNumber: string;
  adresse: string;
  postnummer: string;
  by: string;
  land: string;
  bransje: string;
  kontaktperson: string;
  epost: string;
  telefon: string;
  kortBeskrivelse: string;
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

function cleanCompanyName(title: string): string {
  return title
    .replace(/\s*[-|–|—|·|•]\s*.*/g, '')
    .replace(/\s*\|.*/g, '')
    .replace(/^(hjem|home|velkomment|welcome)\s*[-|–]?\s*/i, '')
    .trim();
}

function extractEmails(html: string): string[] {
  const matches = html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? [];
  return matches.filter((e) =>
    !e.includes('example.') &&
    !e.includes('sentry.') &&
    !e.includes('@w3.org') &&
    !e.includes('@schema.org') &&
    !e.includes('@jquery') &&
    !e.includes('@2x') &&
    !e.endsWith('.png') &&
    !e.endsWith('.jpg') &&
    e.length < 80
  );
}

function extractPhones(html: string): string[] {
  // Norwegian phone patterns: 8 digits, optionally with +47 prefix
  const matches = html.match(/(\+47[\s\-]?)?[2-9]\d[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2}/g) ?? [];
  return matches.map((p) => p.trim()).filter((p) => p.replace(/\D/g, '').length >= 8);
}

async function fetchWebsite(url: string): Promise<Partial<EnrichResult>> {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
  const result: Partial<EnrichResult> = { nettside: normalizedUrl };

  try {
    const res = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return result;

    const html = await res.text();

    // Company name from <title>
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      const cleaned = cleanCompanyName(titleMatch[1].trim());
      if (cleaned.length > 1 && cleaned.length < 80) {
        result.bedriftsnavn = cleaned;
      }
    }

    // Meta description
    const metaDesc =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,300})["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']{10,300})["'][^>]+name=["']description["']/i);
    if (metaDesc) {
      result.kortBeskrivelse = metaDesc[1].trim();
    }

    // OG title as fallback
    if (!result.bedriftsnavn) {
      const ogTitle = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
      if (ogTitle) result.bedriftsnavn = ogTitle[1].trim();
    }

    // Emails
    const emails = extractEmails(html);
    if (emails.length) result.epost = emails[0];

    // Phones
    const phones = extractPhones(html);
    if (phones.length) result.telefon = phones[0];

  } catch {
    // silent
  }

  return result;
}

async function fetchBrreg(query: string): Promise<Partial<EnrichResult>> {
  const result: Partial<EnrichResult> = {};
  try {
    const url = `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(query)}&page=0&size=3`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return result;

    const data = await res.json() as {
      _embedded?: { enheter?: Array<{
        navn: string;
        organisasjonsnummer: string;
        naeringskode1?: { beskrivelse: string };
        forretningsadresse?: { adresse?: string[]; postnummer?: string; poststed?: string; land?: string };
      }>};
    };

    const company = data?._embedded?.enheter?.[0];
    if (!company) return result;

    result.bedriftsnavn = result.bedriftsnavn ?? company.navn;
    result.orgNumber = company.organisasjonsnummer;
    result.bransje = company.naeringskode1?.beskrivelse ?? '';
    result.adresse = company.forretningsadresse?.adresse?.[0] ?? '';
    result.postnummer = company.forretningsadresse?.postnummer ?? '';
    result.by = company.forretningsadresse?.poststed ?? '';
    result.land = company.forretningsadresse?.land ?? 'Norge';

  } catch {
    // silent
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url?.trim()) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 });
    }

    const domain = extractDomain(url);
    const domainRoot = domain.split('.')[0]; // e.g. "fujii" from "fujii.no"

    // Run website fetch and brreg search in parallel
    const [siteData, brregData] = await Promise.all([
      fetchWebsite(url),
      fetchBrreg(domainRoot),
    ]);

    // Merge: site data first, brreg fills in gaps
    const merged: EnrichResult = {
      bedriftsnavn: siteData.bedriftsnavn ?? brregData.bedriftsnavn ?? '',
      nettside: siteData.nettside ?? `https://${domain}`,
      orgNumber: brregData.orgNumber ?? '',
      adresse: brregData.adresse ?? '',
      postnummer: brregData.postnummer ?? '',
      by: brregData.by ?? '',
      land: brregData.land ?? 'Norge',
      bransje: brregData.bransje ?? '',
      kontaktperson: '',
      epost: siteData.epost ?? '',
      telefon: siteData.telefon ?? '',
      kortBeskrivelse: siteData.kortBeskrivelse ?? '',
    };

    // If brreg found a better company name, prefer it (more official)
    if (brregData.bedriftsnavn && !siteData.bedriftsnavn) {
      merged.bedriftsnavn = brregData.bedriftsnavn;
    }

    return NextResponse.json(merged);
  } catch {
    return NextResponse.json({ error: 'Enrichment failed' }, { status: 500 });
  }
}
