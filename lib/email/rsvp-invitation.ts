import 'server-only';
import { Resend } from 'resend';
import type { ResponseRecord } from '@/lib/rsvp/store';

export type EmailOutcome = 'sent' | 'not_configured' | 'failed';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * Emails the guest their personal invitation: thank-you, the party, a secure link to the card and the QR code.
 * Returns what REALLY happened: 'not_configured' when no email service is set up, 'failed' when sending fails.
 * Never claims success otherwise.
 */
export async function sendRsvpEmail(r: ResponseRecord, opts: { viewUrl: string; qrImageUrl: string; kind: 'confirmation' | 'link' }): Promise<EmailOutcome> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) return 'not_configured';

  const total = r.guests.length || (r.attending ? r.adults + r.children : 0);
  const names = r.guests.map((g) => `${g.fullName}${g.category === 'child' ? ' (child)' : ''}`);
  const first = r.fullName.split(' ')[0];

  const intro = !r.attending
    ? `Dear ${esc(first)}, thank you for letting us know. We are sorry you cannot join us, and we will be thinking of you on the day.`
    : opts.kind === 'link'
      ? `Dear ${esc(first)}, here is your personal invitation link, as you asked.`
      : `Dear ${esc(first)}, thank you for confirming. We are so happy you will celebrate with us.`;

  const rows: [string, string][] = [
    ['Reference', r.reference],
    ['Date', 'Friday, 15 January 2027'],
    ['Venue', 'Sultan Palace, Kikambala, Mtwapa'],
    ...(r.attending ? ([['Guests', `${total} (${r.adults} adult${r.adults === 1 ? '' : 's'}${r.children ? `, ${r.children} child${r.children === 1 ? '' : 'ren'}` : ''})`]] as [string, string][]) : []),
  ];

  const html = `<!doctype html><html><body style="margin:0;background:#f8ede4;font-family:Georgia,'Times New Roman',serif;color:#3b2a2c">
<table role="presentation" width="100%" style="padding:28px 12px"><tr><td align="center">
<table role="presentation" width="560" style="max-width:560px;width:100%;background:#fffaf5;border:1px solid #e6cfc0">
<tr><td align="center" style="background:#5c1a27;padding:30px 24px">
<div style="font-size:34px;font-style:italic;color:#f1dfae">Abigael &amp; Brenton</div>
<div style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#f0d9d0;margin-top:8px">${r.attending ? 'Your wedding invitation' : 'Thank you for replying'}</div></td></tr>
<tr><td style="padding:30px 32px">
<p style="font-size:17px;line-height:1.6;margin:0 0 20px">${intro}</p>
<table role="presentation" width="100%" style="font-size:15px;border-collapse:collapse">
${rows.map(([k, v]) => `<tr><td style="padding:9px 0;border-bottom:1px solid #efdccf;color:#8f6b56">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #efdccf;text-align:right">${esc(v)}</td></tr>`).join('')}
</table>
${r.attending ? `<p style="font-size:14px;color:#6d5558;margin:18px 0 0"><b>${esc(r.fullName)}</b>${names.length ? '<br>' + names.map(esc).join('<br>') : ''}</p>` : ''}
${r.attending ? `<p style="text-align:center;margin:28px 0 6px"><a href="${esc(opts.viewUrl)}" style="display:inline-block;background:#5c1a27;color:#fff;text-decoration:none;padding:14px 30px;border-radius:99px;font-size:14px;letter-spacing:2px;text-transform:uppercase">View my invitation</a></p>
<p style="text-align:center;margin:20px 0 0"><img src="${esc(opts.qrImageUrl)}" width="170" height="170" alt="Your check-in QR code" style="border:1px solid #e6cfc0"></p>
<p style="text-align:center;font-size:13px;color:#8f6b56;margin:8px 0 0">Your check-in QR code</p>
<p style="font-size:13px;color:#6d5558;line-height:1.6;margin:22px 0 0">Please save this email or download your invitation to your phone, and have the QR code ready when you arrive. The link above is private to you: please do not share it.</p>` : ''}
</td></tr></table></td></tr></table></body></html>`;

  const text = [
    `Dear ${first},`,
    '',
    !r.attending ? 'Thank you for letting us know. We are sorry you cannot join us.' : 'Thank you for confirming. We are so happy you will celebrate with us.',
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(r.attending ? ['', `Your private invitation: ${opts.viewUrl}`, 'Please save it and have the QR code ready on the day. Do not share the link.'] : []),
    '',
    'With love, Abigael & Brenton',
  ].join('\n');

  try {
    const res = await new Resend(key).emails.send({
      from,
      to: r.email,
      subject: r.attending ? `Your invitation to Abigael & Brenton's wedding (${r.reference})` : 'Thank you for your reply',
      html,
      text,
    });
    return res.error ? 'failed' : 'sent';
  } catch {
    return 'failed';
  }
}
