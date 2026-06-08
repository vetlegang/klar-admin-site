import type { PipelineStage, Priority, PaymentStatus, ContractStatus, TaskStatus } from '@/lib/types';

const stageColors: Record<PipelineStage, string> = {
  'Lead': 'bg-gray-100 text-gray-700',
  'Kontaktet': 'bg-sky-100 text-sky-700',
  'Møte booket': 'bg-blue-100 text-blue-700',
  'Tilbud sendt': 'bg-amber-100 text-amber-700',
  'Prøvepakke betalt': 'bg-lime-100 text-lime-700',
  'Onboarding': 'bg-teal-100 text-teal-700',
  'Runde 1 produksjon': 'bg-cyan-100 text-cyan-700',
  'Ads live / testing': 'bg-green-100 text-green-700',
  'Runde 2': 'bg-indigo-100 text-indigo-700',
  'Egendefinert pakke': 'bg-violet-100 text-violet-700',
  'Fast kunde / retainer': 'bg-purple-100 text-purple-700',
  'Pauset': 'bg-orange-100 text-orange-700',
  'Sagt opp': 'bg-rose-100 text-rose-700',
  'Avsluttet': 'bg-gray-200 text-gray-600',
  'Tapt': 'bg-red-100 text-red-700',
};

const priorityColors: Record<Priority, string> = {
  'Lav': 'bg-gray-100 text-gray-600',
  'Medium': 'bg-yellow-100 text-yellow-700',
  'Høy': 'bg-red-100 text-red-700',
  'Kritisk': 'bg-red-100 text-red-800 font-semibold',
};

const paymentColors: Record<PaymentStatus, string> = {
  'Betalt': 'bg-green-100 text-green-700',
  'Ikke betalt': 'bg-red-100 text-red-700',
  'Venter': 'bg-yellow-100 text-yellow-700',
};

const contractColors: Record<ContractStatus, string> = {
  'Signert': 'bg-green-100 text-green-700',
  'Ikke signert': 'bg-red-100 text-red-700',
  'Sendt': 'bg-yellow-100 text-yellow-700',
};

const taskStatusColors: Record<TaskStatus, string> = {
  'Åpen': 'bg-gray-100 text-gray-700',
  'Pågår': 'bg-blue-100 text-blue-700',
  'Ferdig': 'bg-green-100 text-green-700',
};

interface StageBadgeProps { value: PipelineStage }
interface PriorityBadgeProps { value: Priority }
interface PaymentBadgeProps { value: PaymentStatus }
interface ContractBadgeProps { value: ContractStatus }
interface TaskStatusBadgeProps { value: TaskStatus }

function base(color: string, label: string) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

export function StageBadge({ value }: StageBadgeProps) {
  return base(stageColors[value], value);
}

export function PriorityBadge({ value }: PriorityBadgeProps) {
  return base(priorityColors[value], value);
}

export function PaymentBadge({ value }: PaymentBadgeProps) {
  return base(paymentColors[value], value);
}

export function ContractBadge({ value }: ContractBadgeProps) {
  return base(contractColors[value], value);
}

export function TaskStatusBadge({ value }: TaskStatusBadgeProps) {
  return base(taskStatusColors[value], value);
}
