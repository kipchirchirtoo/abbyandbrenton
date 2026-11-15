import 'server-only';
import { Resend } from 'resend';
import type { BookingRow } from '@/lib/bookings';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const fmt = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Sends the guest a receipt. Silently does nothing when email is not configured. */
export async function sendBookingConfirmation(b: BookingRow): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) return;

  const total = `${b.currency} ${b.total.toLocaleString('en-KE')}`;
  const rows: [string, string][] = [
    ['Booking reference', b.reference],
    ['Hotel', b.hotel_name],
    ['Room', `${b.room_name} × ${b.rooms}`],
    ['Check-in', fmt(b.check_in)],
    ['Check-out', fmt(b.check_out)],
    ['Nights', String(b.nights)],
    ['Guests', String(b.guests)],
    ['Total paid', total],
  ];
  const html = `<!doctype html><html><body style="margin:0;background:#faf6ef;font-family:Georgia,serif;color:#3b3a35">
<table role="presentation" width="100%" style="padding:28px 12px"><tr><td align="center">
<table role="presentation" width="560" style="max-width:560px;width:100%;background:#fffdf8;border:1px solid #eadfc9">
<tr><td align="center" style="background:#5f7052;padding:28px"><div style="font-size:32px;font-style:italic;color:#f1dfae">Abigael &amp; Brenton</div>
<div style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#e8e1cf;margin-top:6px">Room booking confirmed</div></td></tr>
<tr><td style="padding:30px 32px">
<p style="font-size:17px;margin:0 0 18px">Dear ${esc(b.full_name)}, thank you. Your payment was received and your room is booked.</p>
<table role="presentation" width="100%" style="font-size:15px;border-collapse:collapse">
${rows.map(([k, v]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #efe6d3;color:#7d7a70">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #efe6d3;text-align:right">${esc(v)}</td></tr>`).join('')}
</table>
<p style="font-size:13px;color:#7d7a70;margin:22px 0 0">Please keep this email as your receipt and quote the reference if you contact us.</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = [`Dear ${b.full_name}, your room booking is confirmed.`, '', ...rows.map(([k, v]) => `${k}: ${v}`)].join('\n');

  await new Resend(key).emails.send({ from, to: b.email, subject: `Your room booking is confirmed (${b.reference})`, html, text });
}
