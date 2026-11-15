import 'server-only';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function renderInvitationEmail(opts: { name: string; link: string; guestLimit: number }) {
  const firstName = opts.name.trim().split(/\s+/)[0] || 'friend';
  const name = esc(firstName);
  const link = esc(opts.link);
  const plusLine =
    opts.guestLimit > 1
      ? `Your invitation is reserved for you and ${opts.guestLimit - 1} additional guest${opts.guestLimit > 2 ? 's' : ''}.`
      : 'Your invitation is reserved for you.';

  const subject = 'A special invitation from Abigael & Brenton ❤️';

  const html = `<!doctype html>
<html><body style="margin:0;background:#faf6ef;font-family:Georgia,'Times New Roman',serif;color:#3b3a35">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ef;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fffdf8;border:1px solid #eadfc9">
<tr><td align="center" style="background:#5f7052;padding:36px 24px">
  <div style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#e8e1cf">Wedding invitation</div>
  <div style="font-size:38px;font-style:italic;color:#f1dfae;margin-top:10px">Abigael &amp; Brenton</div>
</td></tr>
<tr><td align="center" style="padding:36px 32px">
  <h1 style="font-weight:400;font-size:28px;margin:0 0 12px">You are invited, ${name}!</h1>
  <p style="font-size:16px;line-height:1.6;color:#7d7a70;margin:0 0 20px">We would be delighted to have you celebrate our special day with us.</p>
  <p style="font-size:18px;margin:0">Friday, 15 January 2027</p>
  <p style="font-size:16px;color:#7d7a70;margin:4px 0 24px">Sultan Palace · Kikambala, Mtwapa</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 24px">${esc(plusLine)}<br>Open your private invitation to view the details and confirm your attendance.</p>
  <a href="${link}" style="display:inline-block;background:#5f7052;color:#ffffff;text-decoration:none;padding:14px 34px;font-size:13px;letter-spacing:3px;text-transform:uppercase">Open my invitation</a>
  <p style="font-size:13px;color:#7d7a70;margin:28px 0 0">Kindly reply by 15 December 2026.</p>
  <p style="font-size:12px;color:#9a968a;margin:20px 0 0;line-height:1.5">Your invitation link is personal. Please do not forward it.<br>If the button doesn't work, copy this link into your browser:<br><span style="word-break:break-all">${link}</span></p>
</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `You are invited, ${firstName}!`,
    '',
    'Abigael & Brenton would be delighted to have you celebrate their special day.',
    'Friday, 15 January 2027 · Sultan Palace, Kikambala, Mtwapa',
    plusLine,
    '',
    `Open your private invitation: ${opts.link}`,
    'Kindly reply by 15 December 2026.',
    '',
    'Your invitation link is personal. Please do not forward it.',
  ].join('\n');

  return { subject, html, text };
}
