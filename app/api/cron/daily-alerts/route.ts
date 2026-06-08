import { NextRequest, NextResponse } from 'next/server';
import { generateAlerts } from '@/lib/generate-alerts';
import type { Client } from '@/lib/types';

/**
 * GET /api/cron/daily-alerts
 *
 * Called daily by Vercel Cron (see vercel.json).
 * Reads client list from KV, generates alerts, sends digest email.
 *
 * Requires env vars:
 *   RESEND_API_KEY
 *   EMAIL_FROM
 *   ALERT_RECIPIENTS   – comma-separated: "vg@fujii.no,mhs@fujii.no"
 *   KV_REST_API_URL
 *   KV_REST_API_TOKEN
 *   CRON_SECRET        – set this in Vercel, add as Authorization header in vercel.json
 */
export async function GET(req: NextRequest) {
  // Protect the endpoint
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM ?? 'Fujii Admin <noreply@fujii.no>';
    const recipientsRaw = process.env.ALERT_RECIPIENTS ?? '';
    const recipients = recipientsRaw.split(',').map((e) => e.trim()).filter(Boolean);

    if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY mangler' }, { status: 500 });
    if (!recipients.length) return NextResponse.json({ error: 'ALERT_RECIPIENTS mangler' }, { status: 500 });

    // Read clients from KV
    let clients: Client[] = [];
    if (kvUrl && kvToken) {
      const kvRes = await fetch(`${kvUrl}/get/fujii_clients`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
      if (kvRes.ok) {
        const { result } = await kvRes.json();
        if (result) clients = JSON.parse(result);
      }
    }

    if (!clients.length) {
      return NextResponse.json({ skipped: true, reason: 'Ingen kunder i KV' });
    }

    const alerts = generateAlerts(clients);
    const actionable = alerts.filter((a) => a.severity === 'critical' || a.severity === 'high');

    if (!actionable.length) {
      return NextResponse.json({ skipped: true, reason: 'Ingen kritiske/høy varsler i dag' });
    }

    // Call the digest endpoint internally
    const origin = req.nextUrl.origin;
    const digestRes = await fetch(`${origin}/api/send-alerts-digest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alerts: actionable, recipients }),
    });

    const data = await digestRes.json();
    return NextResponse.json({ ok: true, sent: actionable.length, data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
