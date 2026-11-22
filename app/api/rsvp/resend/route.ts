import { rateLimit, clientIp } from '@/lib/rate-limit';
import { isEmail } from '@/lib/rsvp/validation';
import { getResponseByEmail, markEmailSent, rotateViewToken } from '@/lib/rsvp/store';
import { siteOrigin } from '@/lib/rsvp/qr';
import { sendRsvpEmail } from '@/lib/email/rsvp-invitation';

export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * "Email me my invitation": sends a fresh private link to the address on the RSVP.
 * The reply is the same whether or not an RSVP exists, so this cannot be used to find out who has replied.
 */
export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) return json({ error: 'Forbidden' }, 403);
  if (!rateLimit(`rsvp-resend-ip:${clientIp(req)}`, 6, 60 * 60_000)) return json({ error: 'Too many requests. Please try again later.' }, 429);

  let email = '';
  try {
    const b = (await req.json()) as { email?: unknown };
    email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  if (!isEmail(email)) return json({ error: 'Please enter a valid email address.' }, 400);
  if (!rateLimit(`rsvp-resend-email:${email}`, 3, 60 * 60_000)) return json({ error: 'Too many requests. Please try again later.' }, 429);

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
    return json({ error: 'Email delivery is not set up yet, so we cannot email your link. Please contact the couple.' }, 503);
  }

  const generic = { ok: true, message: 'If an RSVP exists for that email address, we have sent your invitation link to it.' };
  try {
    const record = await getResponseByEmail(email);
    if (!record || !record.attending) return json(generic);
    const { token, rollback } = await rotateViewToken(record.id);
    const site = siteOrigin(req);
    const outcome = await sendRsvpEmail(record, { viewUrl: `${site}/invitation/${token}`, qrImageUrl: `${site}/api/qr/${record.qrToken}`, kind: 'link' });
    if (outcome !== 'sent') {
      await rollback(); // keep the previous link working
      return json({ error: 'We could not send the email just now. Please try again later.' }, 502);
    }
    await markEmailSent(record.id, 'link').catch(() => {});
    return json(generic);
  } catch {
    return json({ error: 'We could not send the email just now. Please try again later.' }, 502);
  }
}
