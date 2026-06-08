'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { PROVEPAKKE } from '@/lib/packages';
import { getClients } from '@/lib/customer-store';
import type { Client } from '@/lib/types';

export default function PakkerPage() {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    setClients(getClients());
  }, []);

  const pkg = PROVEPAKKE;
  const kundeCount = clients.filter((c) => c.pakke === pkg.navn).length;

  return (
    <>
      <Topbar title="Pakker" subtitle="Klyrs tjenestepakke" />
      <main className="flex-1 p-6">
        <div className="max-w-2xl space-y-6">

          {/* Main package card */}
          <div className="bg-white rounded-xl border-2 border-blue-200 p-6">
            <div className="flex items-start justify-between mb-1">
              <div>
                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 bg-blue-100 text-blue-700">
                  {pkg.tag}
                </span>
                <h2 className="text-lg font-semibold text-zinc-900">{pkg.navn}</h2>
              </div>
              <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                {pkg.discountLabel}
              </span>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed mb-5">{pkg.beskrivelse}</p>

            {/* Deliverables */}
            <div className="mb-5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Innhold</p>
              <ul className="space-y-1.5">
                {pkg.deliverables.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-gray-700">
                    <span className="text-green-500 mt-px shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Base price */}
            <div className="flex items-baseline gap-3 mb-6 pt-4 border-t border-gray-100">
              <span className="text-2xl font-semibold text-zinc-900">
                {pkg.basePrice.toLocaleString('nb-NO')} kr
              </span>
              <span className="text-sm text-gray-400 line-through">
                {pkg.originalPrice.toLocaleString('nb-NO')} kr
              </span>
              <span className="text-xs text-gray-400">eks. mva</span>
              <span className="ml-auto text-xs text-gray-500">
                {kundeCount} aktiv{kundeCount !== 1 ? 'e' : ''} kunde{kundeCount !== 1 ? 'r' : ''}
              </span>
            </div>

            {/* Shoot add-ons */}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Shoot-tilvalg</p>
              <div className="space-y-2">
                {pkg.shootAddOns.map((addon) => (
                  <div
                    key={addon.id}
                    className="flex items-start justify-between p-3 rounded-lg border border-gray-100 bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900">{addon.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{addon.description}</p>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className="text-sm font-semibold text-zinc-900">
                        {addon.totalPrice.toLocaleString('nb-NO')} kr
                      </p>
                      {addon.extraPrice > 0 && (
                        <p className="text-xs text-gray-400">
                          +{addon.extraPrice.toLocaleString('nb-NO')} kr
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Shoot-tilvalg er alternativer — ikke kumulative.
              </p>
            </div>
          </div>

          {/* Quick reference */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">Prissammendrag</h3>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100">
                {pkg.shootAddOns.map((addon) => (
                  <tr key={addon.id}>
                    <td className="py-2 text-gray-700">{pkg.navn} — {addon.label}</td>
                    <td className="py-2 text-right font-semibold text-zinc-900">
                      {addon.totalPrice.toLocaleString('nb-NO')} kr
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-3">Alle priser eks. mva. Meta-annonseforbruk kommer i tillegg.</p>
          </div>

        </div>
      </main>
    </>
  );
}
