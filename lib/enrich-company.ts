/**
 * Mock company enrichment from website URL.
 *
 * TODO: Replace with real data sources:
 * - Website scraping for title/meta/email/phone
 * - Brønnøysundregistrene API for Norwegian company data
 * - OpenAI/LLM summary for company description
 */

export interface CompanyEnrichment {
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

const CITIES = [
  { by: 'Oslo', postnummer: '0150' },
  { by: 'Bergen', postnummer: '5003' },
  { by: 'Trondheim', postnummer: '7010' },
  { by: 'Stavanger', postnummer: '4005' },
  { by: 'Drammen', postnummer: '3015' },
  { by: 'Tromsø', postnummer: '9008' },
];

const STREETS = [
  'Storgata', 'Kongens gate', 'Kirkegata', 'Torggata',
  'Industrigata', 'Parkveien', 'Bredgata', 'Nygata',
];

const FIRST_NAMES = ['Erik', 'Lars', 'Kari', 'Anne', 'Ole', 'Ingrid', 'Per', 'Hanne', 'Tor', 'Nina'];
const LAST_NAMES = ['Hansen', 'Olsen', 'Johansen', 'Larsen', 'Berg', 'Nilsen', 'Andersen', 'Dahl', 'Holm', 'Strand'];

type IndustryProfile = {
  industry: string;
  description: (name: string) => string;
};

const INDUSTRY_KEYWORDS: Array<{ keywords: string[]; profile: IndustryProfile }> = [
  {
    keywords: ['vask', 'clean', 'renhold', 'rengj'],
    profile: {
      industry: 'Rengjøring & Vask',
      description: (n) => `${n} tilbyr profesjonelle rengjørings- og vasketjenester til private og bedrifter. Vi er kjent for grundig jobbing og pålitelig service.`,
    },
  },
  {
    keywords: ['bil', 'auto', 'motor', 'kjøretøy', 'verksted'],
    profile: {
      industry: 'Bil & Transport',
      description: (n) => `${n} er en etablert aktør innen bilbransjen med fokus på service, salg og reparasjon av kjøretøy.`,
    },
  },
  {
    keywords: ['cafe', 'kaffe', 'kaffebar', 'restaurant', 'mat', 'food', 'burger', 'pizza', 'spis'],
    profile: {
      industry: 'Mat & Drikke',
      description: (n) => `${n} serverer kvalitetsmat og drikke i hyggelige omgivelser. Vi har fokus på lokale råvarer og god kundekontakt.`,
    },
  },
  {
    keywords: ['trening', 'gym', 'fitness', 'sport', 'helse', 'løpe', 'yoga', 'body'],
    profile: {
      industry: 'Fitness & Helse',
      description: (n) => `${n} er et moderne trenings- og helsesenter med fokus på resultater, velvære og personlig oppfølging.`,
    },
  },
  {
    keywords: ['tech', 'software', 'digital', 'data', 'app', 'web', 'it', 'saas', 'system'],
    profile: {
      industry: 'Teknologi & Software',
      description: (n) => `${n} utvikler digitale løsninger og teknologiprodukter som hjelper bedrifter med å jobbe smartere og mer effektivt.`,
    },
  },
  {
    keywords: ['bygg', 'anlegg', 'tømrer', 'rør', 'elektro', 'maler', 'snekker', 'håndverk'],
    profile: {
      industry: 'Bygg & Håndverk',
      description: (n) => `${n} leverer profesjonelle håndverkertjenester med høy kvalitet og god kommunikasjon gjennom hele prosjektet.`,
    },
  },
  {
    keywords: ['frisør', 'skjønnhet', 'hår', 'negl', 'spa', 'salong', 'makeup', 'beauty'],
    profile: {
      industry: 'Skjønnhet & Velvære',
      description: (n) => `${n} er en moderne salong som tilbyr et bredt spekter av skjønnhets- og velværetjenester i behagelige omgivelser.`,
    },
  },
  {
    keywords: ['eiendom', 'bolig', 'leilighet', 'hus', 'megler', 'utleie'],
    profile: {
      industry: 'Eiendom',
      description: (n) => `${n} jobber med kjøp, salg og utleie av eiendom med et kundeorientert fokus og sterk lokal markedskunnskap.`,
    },
  },
  {
    keywords: ['klær', 'mote', 'fashion', 'stil', 'sko', 'dress', 'clothing'],
    profile: {
      industry: 'Mote & Klær',
      description: (n) => `${n} selger kvalitetsklær og motetilbehør med en tydelig stil og sterk identitet i markedet.`,
    },
  },
  {
    keywords: ['dyr', 'kjæledyr', 'hund', 'katt', 'pet', 'veterinær'],
    profile: {
      industry: 'Dyr & Kjæledyr',
      description: (n) => `${n} tilbyr produkter og tjenester for kjæledyr, med fokus på dyrehelse og fornøyde eiere.`,
    },
  },
];

function extractDomain(url: string): string {
  let domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
  domain = domain.split('/')[0];
  domain = domain.replace(/\.(no|com|org|net|io)$/, '');
  return domain;
}

function formatCompanyName(domain: string): string {
  const parts = domain.split(/[-_]/).filter(Boolean);
  const capitalized = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  const base = capitalized.join(' ');
  return base.endsWith('AS') ? base : `${base} AS`;
}

function detectIndustry(domain: string): IndustryProfile {
  const lower = domain.toLowerCase();
  for (const { keywords, profile } of INDUSTRY_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) {
      return profile;
    }
  }
  return {
    industry: 'Tjenester & Konsulting',
    description: (n) => `${n} leverer profesjonelle tjenester med fokus på kvalitet, effektivitet og langsiktige kundeforhold.`,
  };
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function generateOrgNumber(seed: number): string {
  const base = 800000000 + (seed % 199999999);
  return base.toString();
}

export function enrichCompanyFromUrl(url: string): CompanyEnrichment {
  const domain = extractDomain(url);
  const seed = hashCode(domain);
  const companyName = formatCompanyName(domain);
  const industryProfile = detectIndustry(domain);
  const city = pick(CITIES, seed);
  const street = pick(STREETS, seed + 1);
  const streetNum = ((seed % 80) + 1).toString();
  const firstName = pick(FIRST_NAMES, seed + 2);
  const lastName = pick(LAST_NAMES, seed + 3);
  const contactPerson = `${firstName} ${lastName}`;
  const normalizedDomain = domain.toLowerCase().replace(/[-_]/g, '') + '.no';

  return {
    bedriftsnavn: companyName,
    nettside: url.startsWith('http') ? url : `https://${url}`,
    orgNumber: generateOrgNumber(seed),
    adresse: `${street} ${streetNum}`,
    postnummer: city.postnummer,
    by: city.by,
    land: 'Norge',
    bransje: industryProfile.industry,
    kontaktperson: contactPerson,
    epost: `${firstName.toLowerCase()}@${normalizedDomain}`,
    telefon: `+47 ${((seed % 900) + 400).toString().padStart(3, '0')} ${((seed % 90) + 10).toString()} ${((seed % 900) + 100).toString()}`,
    kortBeskrivelse: industryProfile.description(companyName),
  };
}
