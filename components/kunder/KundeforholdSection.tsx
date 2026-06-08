'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateOffboardingEmail } from '@/lib/email-templates';
import { deleteClient, updateClient } from '@/lib/customer-store';
import type { Client } from '@/lib/types';

type LocalStatus = Client['status'] | null;

interface Props {
  client: Client;
}

export default function KundeforholdSection({ client }: Props) {
  const router = useRouter();
  const [statusOverride, setStatusOverride] = useState<LocalStatus>(null);
  const [showSagtOppModal, setShowSagtOppModal] = useState(false);
  const [showAvsluttModal, setShowAvsluttModal] = useState(false);
  const [showSlettModal, setShowSlettModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [offboardingDone, setOffboardingDone] = useState(false);

  // Avslutt fields
  const [aarsak, setAarsak] = useState('');
  const [sluttFaktura, setSluttFaktura] = useState(false);
  const [altLevert, setAltLevert] = useState(false);

  const currentStatus = statusOverride ?? client.status;
  const emailTemplate = generateOffboardingEmail(client, client.ansvarlig);
  const mailtoLink = `mailto:${emailTemplate.to}?subject=${encodeURIComponent(emailTemplate.subject)}&body=${encodeURIComponent(emailTemplate.body)}`;

  function handleSagtOpp() {
    const today = new Date().toISOString().split('T')[0];
    setStatusOverride('Sagt opp');
    updateClient(client.id, { status: 'Sagt opp', statusChangedAt: today });
    setShowSagtOppModal(false);
    setShowEmailModal(true);
  }

  function handleAvslutt() {
    const today = new Date().toISOString().split('T')[0];
    setStatusOverride('Avsluttet');
    updateClient(client.id, {
      status: 'Avsluttet',
      statusChangedAt: today,
      cancellationReason: aarsak || undefined,
      finalInvoiceSent: sluttFaktura,
      deliveryCompleted: altLevert,
    });
    setShowAvsluttModal(false);
    setShowEmailModal(true);
  }

  function handleSlett() {
    deleteClient(client.id);
    setShowSlettModal(false);
    router.push('/kunder');
  }

  return (
    <div className="space-y-3">
      {/* Current relationship status */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div>
          <p className="text-xs text-gray-500">Nåværende status</p>
          <p className="text-sm font-medium text-zinc-900">{currentStatus}</p>
        </div>
        {(currentStatus === 'Sagt opp' || currentStatus === 'Avsluttet') && (
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
            {currentStatus === 'Sagt opp' ? 'Under offboarding' : 'Avsluttet'}
          </span>
        )}
      </div>

      {/* Offboarding checklist for Sagt opp */}
      {currentStatus === 'Sagt opp' && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
          <p className="text-xs font-semibold text-orange-800">Offboarding-sjekkliste</p>
          <label className="flex items-center gap-2 text-xs text-orange-700">
            <input type="checkbox" checked={offboardingDone} onChange={(e) => setOffboardingDone(e.target.checked)} className="accent-orange-600" />
            Takkemail sendt
          </label>
          <label className="flex items-center gap-2 text-xs text-orange-700">
            <input type="checkbox" checked={sluttFaktura} onChange={(e) => setSluttFaktura(e.target.checked)} className="accent-orange-600" />
            Siste faktura sendt
          </label>
          <label className="flex items-center gap-2 text-xs text-orange-700">
            <input type="checkbox" checked={altLevert} onChange={(e) => setAltLevert(e.target.checked)} className="accent-orange-600" />
            Alt levert
          </label>
          <button
            onClick={() => setShowEmailModal(true)}
            className="mt-1 text-xs text-orange-700 underline hover:text-orange-900"
          >
            Lag takk for samarbeidet-mail →
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {currentStatus !== 'Sagt opp' && currentStatus !== 'Avsluttet' && (
          <button
            onClick={() => setShowSagtOppModal(true)}
            className="px-3 py-1.5 border border-orange-300 text-orange-700 text-xs rounded-lg hover:bg-orange-50 transition-colors"
          >
            Marker som sagt opp
          </button>
        )}
        {currentStatus !== 'Avsluttet' && (
          <button
            onClick={() => setShowAvsluttModal(true)}
            className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors"
          >
            Avslutt kunde
          </button>
        )}
        <button
          onClick={() => setShowSlettModal(true)}
          className="px-3 py-1.5 border border-red-200 text-red-600 text-xs rounded-lg hover:bg-red-50 transition-colors"
        >
          Fjern kunde
        </button>
      </div>

      {/* Sagt opp modal */}
      {showSagtOppModal && (
        <Modal onClose={() => setShowSagtOppModal(false)}>
          <h3 className="text-sm font-semibold text-zinc-900 mb-2">Marker kunden som sagt opp?</h3>
          <p className="text-xs text-gray-600 mb-4">
            Dette flytter kunden ut av aktiv pipeline og oppretter en anbefalt offboarding-mail.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setShowSagtOppModal(false)} className="flex-1 px-3 py-2 border border-gray-200 text-xs rounded-lg">Avbryt</button>
            <button
              onClick={handleSagtOpp}
              className="flex-1 px-3 py-2 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700"
            >
              Marker som sagt opp
            </button>
          </div>
        </Modal>
      )}

      {/* Avslutt modal */}
      {showAvsluttModal && (
        <Modal onClose={() => setShowAvsluttModal(false)}>
          <h3 className="text-sm font-semibold text-zinc-900 mb-3">Avslutt kundeforhold</h3>
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Årsak</label>
              <input
                value={aarsak}
                onChange={(e) => setAarsak(e.target.value)}
                placeholder="Eks: Ikke fornøyd, budsjett, annen leverandør..."
                className="input text-xs"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={sluttFaktura} onChange={(e) => setSluttFaktura(e.target.checked)} className="accent-zinc-900" />
              Siste faktura sendt
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={altLevert} onChange={(e) => setAltLevert(e.target.checked)} className="accent-zinc-900" />
              Alt levert
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAvsluttModal(false)} className="flex-1 px-3 py-2 border border-gray-200 text-xs rounded-lg">Avbryt</button>
            <button
              onClick={handleAvslutt}
              className="flex-1 px-3 py-2 bg-zinc-900 text-white text-xs rounded-lg hover:bg-zinc-700"
            >
              Avslutt kunde
            </button>
          </div>
        </Modal>
      )}

      {/* Fjern/slett modal */}
      {showSlettModal && (
        <Modal onClose={() => setShowSlettModal(false)}>
          <h3 className="text-sm font-semibold text-red-700 mb-2">Fjern kunde?</h3>
          <p className="text-xs text-gray-600 mb-4">
            Er du sikker på at du vil fjerne denne kunden?
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Bruk &ldquo;Avslutt kunde&rdquo; i stedet hvis kunden har hatt et aktivt samarbeid, slik at historikken beholdes.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setShowSlettModal(false)} className="flex-1 px-3 py-2 border border-gray-200 text-xs rounded-lg">Avbryt</button>
            <button
              onClick={handleSlett}
              className="flex-1 px-3 py-2 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700"
            >
              Ja, fjern kunden
            </button>
          </div>
        </Modal>
      )}

      {/* Email modal */}
      {showEmailModal && (
        <Modal onClose={() => setShowEmailModal(false)}>
          <h3 className="text-sm font-semibold text-zinc-900 mb-3">Takk for samarbeidet-mail</h3>
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Emne</p>
            <p className="text-xs font-medium text-zinc-900 bg-gray-50 px-3 py-2 rounded-lg">{emailTemplate.subject}</p>
          </div>
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">Innhold</p>
            <pre className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 whitespace-pre-wrap font-sans leading-relaxed">
              {emailTemplate.body}
            </pre>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(emailTemplate.body)}
              className="flex-1 px-3 py-2 border border-gray-200 text-xs rounded-lg hover:bg-gray-50"
            >
              Kopier e-post
            </button>
            <a
              href={mailtoLink}
              className="flex-1 px-3 py-2 bg-zinc-900 text-white text-xs rounded-lg hover:bg-zinc-700 text-center"
            >
              Åpne i mailklient
            </a>
          </div>
          <button
            onClick={() => { setOffboardingDone(true); setShowEmailModal(false); }}
            className="w-full mt-2 px-3 py-2 border border-green-200 text-green-700 text-xs rounded-lg hover:bg-green-50"
          >
            Marker mail som sendt ✓
          </button>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative bg-white rounded-xl shadow-lg border border-gray-200 p-5 w-full max-w-md">
        {children}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-zinc-900 text-lg leading-none"
          aria-label="Lukk"
        >
          ×
        </button>
      </div>
    </div>
  );
}
