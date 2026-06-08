import type { Client } from './types';

const STORAGE_KEY = 'klyr_clients';

export function getClients(): Client[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Client[]) : [];
  } catch {
    return [];
  }
}

function saveClients(clients: Client[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  // Silently sync to server (for cron job access) — fire and forget
  if (typeof window !== 'undefined') {
    fetch('/api/sync-clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clients }),
    }).catch(() => { /* ignore — app works fine without KV */ });
  }
}

export function getClient(id: string): Client | undefined {
  return getClients().find((c) => c.id === id);
}

export function addClient(client: Client): void {
  saveClients([...getClients(), client]);
}

export function updateClient(id: string, updates: Partial<Client>): void {
  saveClients(getClients().map((c) => (c.id === id ? { ...c, ...updates } : c)));
}

export function deleteClient(id: string): void {
  saveClients(getClients().filter((c) => c.id !== id));
}

export function generateClientId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
