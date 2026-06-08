import type { ShootOption } from './types';

export interface ShootAddOn {
  id: ShootOption;
  label: string;
  extraPrice: number;
  totalPrice: number;
  description: string;
}

export interface KlyrPackage {
  id: string;
  navn: string;
  beskrivelse: string;
  basePrice: number;
  originalPrice: number;
  discountLabel: string;
  deliverables: string[];
  shootAddOns: ShootAddOn[];
  tag: string;
}

export const KLYR_PACKAGES: KlyrPackage[] = [
  {
    id: 'provepakke',
    navn: 'Prøvepakke',
    beskrivelse:
      '20 unike Meta-creatives for Facebook og Instagram. Laget av eksisterende materiale, produktbilder, UGC, stock/AI og grafisk produksjon. Fysisk shoot er ikke inkludert som standard.',
    basePrice: 5000,
    originalPrice: 10000,
    discountLabel: '50% rabatt',
    deliverables: [
      '20 unike Meta-creatives',
      '10 stillbilder + 10 video-ads',
      'Ulike hooks og vinkler per ad',
      'Optimalisert for Facebook og Instagram',
      'Klart til bruk i annonseringen',
      'Ingen binding',
    ],
    shootAddOns: [
      {
        id: 'ingen_shoot',
        label: 'Ingen shoot',
        extraPrice: 0,
        totalPrice: 5000,
        description:
          'Vi bruker eksisterende materiale, produktbilder, UGC, stock/AI og grafisk produksjon.',
      },
      {
        id: 'shoot_hos_dere',
        label: 'Shoot hos dere',
        extraPrice: 3000,
        totalPrice: 8000,
        description:
          'Vi kommer til dere og filmer/fotograferer enkelt materiale. UGC-person er ikke inkludert.',
      },
      {
        id: 'shoot_med_ugc',
        label: 'Shoot med UGC',
        extraPrice: 5000,
        totalPrice: 10000,
        description:
          'Vi kommer til dere og filmer med UGC-person/creator.',
      },
    ],
    tag: 'Første runde',
  },
];

export const PROVEPAKKE = KLYR_PACKAGES[0];

export function getShootAddOn(shootOption: ShootOption): ShootAddOn {
  const addOn = PROVEPAKKE.shootAddOns.find((s) => s.id === shootOption);
  if (!addOn) throw new Error(`Unknown shoot option: ${shootOption}`);
  return addOn;
}

export function computeTotalPrice(shootOption: ShootOption): number {
  return getShootAddOn(shootOption).totalPrice;
}

export function shootOptionLabel(shootOption: ShootOption): string {
  return getShootAddOn(shootOption).label;
}
