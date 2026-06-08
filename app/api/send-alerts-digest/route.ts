import { NextRequest, NextResponse } from 'next/server';
import type { Alert } from '@/lib/types';

/**
 * POST /api/send-alerts-digest
 *
 * Body:
 *   alerts: Alert[]       – generated from generateAlerts()
 *   recipients: string[]  – e.g. ["vg@fujii.no", "mhs@fujii.no"]
 *
 * Requires env vars:
 *   RESEND_API_KEY
 *   EMAIL_FROM  (default: "Fujii Admin <noreply@fujii.no>")
 */
export async function POST(req: NextRequest) {
  try {
    const { alerts, recipients } = (await req.json()) as {
      alerts: Alert[];
      recipients: string[];
    };

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM ?? 'Fujii Admin <noreply@fujii.no>';

    if (!apiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY er ikke satt' }, { status: 500 });
    }

    if (!alerts?.length) {
      return NextResponse.json({ skipped: true, reason: 'Ingen varsler å sende' });
    }

    const critical = alerts.filter((a) => a.severity === 'critical');
    const high = alerts.filter((a) => a.severity === 'high');
    const medium = alerts.filter((a) => a.severity === 'medium');
    const low = alerts.filter((a) => a.severity === 'low');

    const today = new Date().toLocaleDateString('nb-NO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    function severityBlock(label: string, color: string, items: Alert[]): string {
      if (!items.length) return '';
      return `
        <div style="margin-bottom:24px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block;"></div>
            <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#71717a;">${label} (${items.length})</span>
          </div>
          ${items.map((a) => `
            <div style="border:1px solid #e4e4e7;border-radius:10px;padding:14px 16px;margin-bottom:8px;background:#fff;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div>
                  <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#18181b;">${a.clientName}</p>
                  <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#3f3f46;">${a.title}</p>
                  <p style="margin:0 0 6px;font-size:13px;color:#52525b;">${a.description}</p>
                  <p style="margin:0;font-size:12px;color:#71717a;font-style:italic;">→ ${a.recommendedAction}</p>
                </div>
                ${a.assignedTo ? `<span style="font-size:11px;background:#f4f4f5;color:#52525b;padding:2px 8px;border-radius:20px;white-space:nowrap;margin-left:12px;">${a.assignedTo}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:620px;margin:0 auto;padding:24px;color:#18181b;background:#f9f9f9;">

  <div style="background:#18181b;border-radius:12px;padding:24px 28px;margin-bottom:24px;">
    <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#fff;">Fujii Admin</p>
    <p style="margin:0;font-size:13px;color:#a1a1aa;">Daglig varseloversikt · ${today}</p>
  </div>

  <div style="background:#fff;border-radius:12px;padding:20px 24px;margin-bottom:16px;border:1px solid #e4e4e7;">
    <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#18181b;">
      ${alerts.length} åpne varsler
      ${critical.length ? `<span style="background:#fee2e2;color:#b91c1c;font-size:11px;padding:2px 8px;border-radius:20px;margin-left:8px;">${critical.length} kritiske</span>` : ''}
    </p>

    ${severityBlock('Kritiske varsler', '#ef4444', critical)}
    ${severityBlock('Høy prioritet', '#f97316', high)}
    ${severityBlock('Medium prioritet', '#eab308', medium)}
    ${severityBlock('Lav prioritet / Muligheter', '#3b82f6', low)}
  </div>

  <hr style="border:none;border-top:1px solid #e4e4e7;margin:20px 0;">
  <p style="font-size:11px;color:#a1a1aa;text-align:center;">Fujii Admin – automatisk daglig varsel</p>

</body>
</html>
    `.trim();

    const subject = critical.length
      ? `🚨 ${critical.length} kritiske varsler – Fujii Admin (${today.split(' ').slice(0, 2).join(' ')})`
      : `📋 ${alerts.length} åpne varsler – Fujii Admin`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to: recipients, subject, html }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, sent: alerts.length, data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
