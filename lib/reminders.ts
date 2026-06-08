import type { Client, RoundData } from './types';

export interface OptReminder {
  clientId: string;
  clientName: string;
  round: string;
  daysLeft: number;
  kampanjeLiveDato: string;
  deadlineDate: string;
  isOverdue: boolean;
}

/**
 * A campaign runs ~30 days. Optimized ads should be delivered ~5 days before
 * the campaign ends (day 25). We start reminding every 2 days from day 15.
 */
const CAMPAIGN_DAYS = 30;
const REMINDER_START_DAY = 15; // Start reminding after 15 days live

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function getOptReminders(clients: Client[]): OptReminder[] {
  const today = new Date().toISOString().split('T')[0];
  const reminders: OptReminder[] = [];

  for (const client of clients) {
    const rounds = client.roundData ?? {};

    for (const [roundName, rd] of Object.entries(rounds)) {
      if (!rd.kampanjeLive || !rd.kampanjeLiveDato) continue;
      // Skip if opt1 is already done
      if (rd.opt1Done) continue;

      const liveDate = rd.kampanjeLiveDato;
      const daysLive = daysBetween(liveDate, today);

      if (daysLive < REMINDER_START_DAY) continue;

      // Deadline = live date + CAMPAIGN_DAYS (approx end)
      const deadlineDate = new Date(liveDate);
      deadlineDate.setDate(deadlineDate.getDate() + CAMPAIGN_DAYS);
      const deadlineStr = deadlineDate.toISOString().split('T')[0];
      const daysLeft = daysBetween(today, deadlineStr);

      reminders.push({
        clientId: client.id,
        clientName: client.bedrift,
        round: roundName,
        daysLeft,
        kampanjeLiveDato: liveDate,
        deadlineDate: deadlineStr,
        isOverdue: daysLeft < 0,
      });
    }
  }

  // Sort: most urgent first
  return reminders.sort((a, b) => a.daysLeft - b.daysLeft);
}

export function shouldSendReminderToday(reminder: OptReminder): boolean {
  // Send every 2 days (when |daysLeft| is even or overdue)
  return reminder.daysLeft % 2 === 0;
}

export function buildReminderEmailHtml(
  reminder: OptReminder,
  schemaUrl: string,
): string {
  const urgency = reminder.isOverdue
    ? '🚨 FORFALT'
    : reminder.daysLeft <= 3
    ? '⚠️ Haster'
    : '📅 Påminnelse';

  const message = reminder.isOverdue
    ? `Fristen for å levere optimaliserte ads til <strong>${reminder.clientName}</strong> (${reminder.round}) har gått ut!`
    : `Det er kun <strong>${reminder.daysLeft} dager</strong> igjen til dere skal levere optimaliserte ads til <strong>${reminder.clientName}</strong> (${reminder.round}).`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #18181b;">
  <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <p style="font-size: 18px; font-weight: 700; margin: 0 0 8px;">${urgency}</p>
    <p style="font-size: 15px; margin: 0;">${message}</p>
  </div>
  <p>Kampanje live: <strong>${reminder.kampanjeLiveDato}</strong></p>
  <p>Estimert kampanjeslutt: <strong>${reminder.deadlineDate}</strong></p>
  ${schemaUrl ? `<p><a href="${schemaUrl}" style="background: #18181b; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 8px;">Åpne skjema for optimaliserte ads →</a></p>` : ''}
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="font-size: 12px; color: #71717a;">Fujii Admin – automatisk påminnelse</p>
</body>
</html>
  `.trim();
}
