import { NextRequest, NextResponse } from 'next/server';
import { buildReminderEmailHtml } from '@/lib/reminders';
import type { OptReminder } from '@/lib/reminders';

/**
 * POST /api/send-reminder
 *
 * Body:
 *   reminder: OptReminder
 *   recipients: string[]  (e.g. ["vetle@klyr.no", "markus@klyr.no"])
 *   schemaUrl?: string
 *
 * Requires env vars:
 *   RESEND_API_KEY   – your Resend API key (https://resend.com)
 *   EMAIL_FROM       – sender address (must be verified in Resend, e.g. "Klyr Admin <noreply@klyr.no>")
 */
export async function POST(req: NextRequest) {
  try {
    const { reminder, recipients, schemaUrl = '' } = (await req.json()) as {
      reminder: OptReminder;
      recipients: string[];
      schemaUrl?: string;
    };

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM ?? 'Klyr Admin <noreply@klyr.no>';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY er ikke satt i .env.local' },
        { status: 500 },
      );
    }

    const html = buildReminderEmailHtml(reminder, schemaUrl);
    const subject = reminder.isOverdue
      ? `🚨 FORFALT: Optimaliserte ads til ${reminder.clientName} (${reminder.round})`
      : `📅 ${reminder.daysLeft} dager til optimaliserte ads – ${reminder.clientName}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
