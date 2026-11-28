import { getSiteAccess, getSessionToken } from '@/lib/guest-session';
import { getInvitation } from '@/lib/invitations/validation';
import { paystackConfigured, getSiteUrl } from '@/lib/paystack';
import { createPaystackGift } from '@/lib/gifts';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host) {
    try {
      const oHost = new URL(origin).host;
      if (oHost !== host && !oHost.endsWith('vercel.app')) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {}
  }

  if (!paystackConfigured()) {
    return Response.json({ error: 'Online payments are currently unavailable. Please check back soon or send via M-Pesa.' }, { status: 503 });
  }

  if (!rateLimit(`gift-any:${clientIp(req)}`, 40, 10 * 60_000)) {
    return Response.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429 });
  }

  const access = await getSiteAccess();
  if (!access.allowed) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const data = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const amount = Number(data.amount);
  const rawEmail = String(data.email ?? '').trim();
  const name = String(data.name ?? '').trim();
  const phone = String(data.phone ?? '').trim();
  const notes = String(data.notes ?? '').trim();
  const channel = (data.channel === 'mobile_money' || data.channel === 'card') ? data.channel : 'all';

  if (!Number.isFinite(amount) || amount < 10) {
    return Response.json({ error: 'Please enter a valid gift amount (at least KES 10).' }, { status: 400 });
  }

  const cleanDigits = phone.replace(/\D/g, '');
  const email =
    rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)
      ? rawEmail
      : `${cleanDigits || 'guest'}@abigaelandbrenton.com`;

  if (!rateLimit(`gift-create:${clientIp(req)}`, 10, 10 * 60_000)) {
    return Response.json({ error: 'Too many attempts from this connection. Please wait a few minutes.' }, { status: 429 });
  }

  let guestId: string | null = null;
  const token = await getSessionToken();
  if (token) {
    const inv = await getInvitation(token).catch(() => null);
    if (inv && inv.status === 'valid') guestId = inv.guest.id;
  }

  try {
    const { authorizationUrl, reference } = await createPaystackGift(
      {
        amount,
        email,
        name,
        phone,
        notes,
        guestId,
        channel,
      },
      getSiteUrl(req),
    );

    return Response.json({ ok: true, url: authorizationUrl, reference });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Could not initialize Paystack payment.' }, { status: 500 });
  }
}
