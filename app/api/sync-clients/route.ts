import { NextRequest, NextResponse } from 'next/server';
import type { Client } from '@/lib/types';

/**
 * POST /api/sync-clients
 *
 * Called client-side after every customer save/update.
 * Stores the full client list in Vercel KV so the cron job can access it.
 *
 * Requires env var:
 *   KV_REST_API_URL   – from Vercel KV dashboard
 *   KV_REST_API_TOKEN – from Vercel KV dashboard
 */
export async function POST(req: NextRequest) {
  try {
    const { clients } = (await req.json()) as { clients: Client[] };

    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    if (!kvUrl || !kvToken) {
      // KV not configured yet — silently ignore (app still works via localStorage)
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Store using Vercel KV REST API (no SDK needed)
    const res = await fetch(`${kvUrl}/set/fujii_clients`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kvToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(JSON.stringify(clients)), // KV stores strings
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    return NextResponse.json({ ok: true, count: clients.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
