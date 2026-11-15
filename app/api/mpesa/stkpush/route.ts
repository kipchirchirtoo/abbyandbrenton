import { getAdminClient } from '@/lib/supabase/admin';
import { mpesaConfigured, normalizeKenyanPhone, maskPhone, stkPush } from '@/lib/mpesa';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { getSiteAccess } from '@/lib/guest-session';
import { getSessionToken } from '@/lib/guest-session';
import { getInvitation } from '@/lib/invitations/validation';

export const dynamic = 'force-dynamic';

const MIN = 10;
const MAX = 150_000;

export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) return Response.json({ error: 'Forbidden' }, { status: 403 });

  if (!mpesaConfigured()) {
    return Response.json({ error: 'not_configured' }, { status: 501 });
  }
  if (!rateLimit(`stk-ip:${clientIp(req)}`, 5, 15 * 60_000)) {
    return Response.json({ error: 'Too many attempts. Please wait a few minutes.' }, { status: 429 });
  }
  // Respect private mode: only invited guests can trigger a prompt.
  const access = await getSiteAccess();
  if (!access.allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });

  let body: { phone?: unknown; amount?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const phone = typeof body.phone === 'string' ? normalizeKenyanPhone(body.phone) : null;
  const amount = Number(body.amount);
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
  if (!phone) return Response.json({ error: 'Enter a valid Safaricom number, e.g. 0712 345 678.' }, { status: 400 });
  if (!Number.isInteger(amount) || amount < MIN || amount > MAX) {
    return Response.json({ error: `Enter an amount between KES ${MIN} and KES ${MAX.toLocaleString('en-KE')}.` }, { status: 400 });
  }
  if (!rateLimit(`stk-phone:${phone}`, 3, 15 * 60_000)) {
    return Response.json({ error: 'Too many prompts to this number. Please wait a few minutes.' }, { status: 429 });
  }

  try {
    const { checkoutRequestId, merchantRequestId } = await stkPush({ phone, amount });

    let guestId: string | null = null;
    const token = await getSessionToken();
    if (token) {
      const inv = await getInvitation(token).catch(() => null);
      if (inv && inv.status === 'valid') guestId = inv.guest.id;
    }
    await getAdminClient().from('wedding_gifts').insert({
      checkout_request_id: checkoutRequestId,
      merchant_request_id: merchantRequestId,
      amount,
      phone_masked: maskPhone(phone), // the full number is never stored
      giver_name: name || null,
      guest_id: guestId,
    });
    return Response.json({ ok: true, id: checkoutRequestId });
  } catch {
    return Response.json({ error: 'We could not start the M-Pesa prompt. Please try again, or send to the number shown.' }, { status: 502 });
  }
}
