export type PipelineStage =
  | 'Lead'
  | 'Kontaktet'
  | 'Møte booket'
  | 'Tilbud sendt'
  | 'Prøvepakke betalt'
  | 'Onboarding'
  | 'Runde 1 produksjon'
  | 'Ads live / testing'
  | 'Runde 2'
  | 'Egendefinert pakke'
  | 'Fast kunde / retainer'
  | 'Pauset'
  | 'Sagt opp'
  | 'Avsluttet'
  | 'Tapt';

export const PIPELINE_STAGES: PipelineStage[] = [
  'Lead',
  'Kontaktet',
  'Møte booket',
  'Tilbud sendt',
  'Prøvepakke betalt',
  'Onboarding',
  'Runde 1 produksjon',
  'Ads live / testing',
  'Runde 2',
  'Egendefinert pakke',
  'Fast kunde / retainer',
  'Pauset',
  'Sagt opp',
  'Avsluttet',
  'Tapt',
];

export type ShootOption = 'ingen_shoot' | 'shoot_hos_dere' | 'shoot_med_ugc';

export type Priority = 'Lav' | 'Medium' | 'Høy' | 'Kritisk';
export type PaymentStatus = 'Betalt' | 'Ikke betalt' | 'Venter';
export type ContractStatus = 'Signert' | 'Ikke signert' | 'Sendt';
export type TaskStatus = 'Åpen' | 'Pågår' | 'Ferdig';
export type ActivityType = 'notat' | 'status' | 'oppgave' | 'epost' | 'møte';

export type AlertType =
  | 'forfalt_frist'
  | 'mangler_neste_action'
  | 'lead_ikke_fulgt_opp'
  | 'mote_ingen_oppfolging'
  | 'tilbud_ikke_fulgt_opp'
  | 'faktura_mangler'
  | 'onboarding_mangler'
  | 'kontrakt_mangler'
  | 'content_mangler'
  | 'status_stille'
  | 'sjekk_resultater'
  | 'send_rapport'
  | 'foreslaa_runde2'
  | 'offboarding_takkemail'
  | 'offboarding_faktura'
  | 'offboarding_leveranse';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'open' | 'done' | 'snoozed';

export interface Alert {
  id: string;
  clientId: string;
  clientName: string;
  type: AlertType;
  title: string;
  description: string;
  severity: AlertSeverity;
  assignedTo: string;
  dueDate?: string;
  createdAt: string;
  status: AlertStatus;
  actionLabel: string;
  recommendedAction: string;
}

export interface Activity {
  id: string;
  dato: string;
  type: ActivityType;
  tekst: string;
  bruker: string;
}

export interface Task {
  id: string;
  tittel: string;
  klientId: string;
  klientNavn: string;
  ansvarlig: string;
  frist: string | null;
  status: TaskStatus;
  prioritet: Priority;
}

export interface Client {
  id: string;
  bedrift: string;
  kontaktperson: string;
  epost: string;
  telefon: string;
  nettside: string;
  bransje: string;
  status: PipelineStage;
  pakke: string;
  verdi: number;
  ansvarlig: string;
  prioritet: Priority;
  betalingsstatus: PaymentStatus;
  kontraktstatus: ContractStatus;
  contentMottatt: boolean;
  adsLive: boolean;
  sistKontaktet: string;
  nesteAction: string;
  nesteFrist: string | null;
  notater: string;
  aktivitetslogg: Activity[];
  oppgaver: Task[];
  shootOption?: ShootOption;
  // New operational fields
  invoiceSent: boolean;
  onboardingComplete: boolean;
  metaAccessReceived: boolean;
  brandAssetsReceived: boolean;
  adsLiveDate?: string;
  resultsChecked: boolean;
  reportSent: boolean;
  statusChangedAt: string;
  round1Results?: 'unknown' | 'poor' | 'ok' | 'good' | 'great';
  offboardingEmailSent: boolean;
  finalInvoiceSent: boolean;
  deliveryCompleted: boolean;
  cancellationReason?: string;
  // Round & campaign tracking
  currentRound?: string;
  roundData?: Record<string, RoundData>;
  campaigns?: Campaign[];
}

export interface TeamMember {
  id: string;
  navn: string;
  initialer: string;
  rolle: string;
  epost: string;
  notificationsEnabled: boolean;
  notificationTypes: {
    overdueAlerts: boolean;
    missingActions: boolean;
    invoiceReminders: boolean;
    followUpReminders: boolean;
    onboardingReminders: boolean;
    reportReminders: boolean;
  };
}

export interface Package {
  id: string;
  navn: string;
  beskrivelse: string;
  pris: number | string;
  innhold: string[];
  farge: string;
  tag: string;
}

// ─── Campaign / Round types ───────────────────────────────────────────────────

export type MetaObjective =
  | 'Salg'
  | 'Leads'
  | 'Trafikk'
  | 'Kjennskap / Rekkevidde'
  | 'App-installasjon'
  | 'Videovisninger'
  | 'Engasjement';

export const META_OBJECTIVES: MetaObjective[] = [
  'Salg',
  'Leads',
  'Trafikk',
  'Kjennskap / Rekkevidde',
  'App-installasjon',
  'Videovisninger',
  'Engasjement',
];

export const ROUND_OPTIONS = [
  'Testpakke',
  'Runde 2',
  'Runde 3',
  'Runde 4',
  'Runde 5',
] as const;
export type ClientRound = (typeof ROUND_OPTIONS)[number];

export const AD_SPEND_OPTIONS: number[] = Array.from(
  { length: 46 },
  (_, i) => 5000 + i * 1000,
); // 5000 – 50 000 NOK

export interface CampaignResults {
  revenue?: number;       // NOK – for Salg → ROAS = revenue / adSpend
  leads?: number;
  clicks?: number;
  impressions?: number;
  reach?: number;
  videoViews?: number;
  engagements?: number;
  conversions?: number;
}

export interface Campaign {
  id: string;
  round: string;
  objective: MetaObjective;
  startDate: string;
  endDate?: string;
  productUrl?: string;
  adSpend: number;
  results: CampaignResults;
  roas?: number;          // auto: revenue / adSpend
  cpl?: number;           // cost per lead: adSpend / leads
  notes?: string;
  createdAt: string;
}

export interface RoundData {
  startDate?: string;
  // Testpakke only
  metaSetupDone?: boolean;
  metaSetupDate?: string;
  kontraktSignert?: boolean;
  kontraktDato?: string;
  // All rounds
  addSpendBetalt?: boolean;
  addSpendDato?: string;
  serviceInvoiceSent?: boolean;
  serviceInvoiceDato?: string;
  kampanjeLive?: boolean;
  kampanjeLiveDato?: string;
  opt1Done?: boolean;
  opt1Dato?: string;
  opt1MoteBooket?: boolean;
  opt1MoteDato?: string;
  opt2Done?: boolean;
  opt2Dato?: string;
  opt2MoteBooket?: boolean;
  opt2MoteDato?: string;
}
