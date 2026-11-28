import { getSiteAccess, getSessionToken } from '@/lib/guest-session';
import { getInvitation } from '@/lib/invitations/validation';
import { paystackConfigured } from '@/lib/paystack';
import { chargePaystackMpesaGift } from '@/lib/gifts';
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
    return Response.json({ error: 'Payment gateway is currently initializing. Please try again shortly or use the manual number.' }, { status: 503 });
  }

  if (!rateLimit(`gift-charge:${clientIp(req)}`, 20, 10 * 60_000)) {
    return Response.json({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429 });
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
  const phone = String(data.phone ?? '').trim();
  const name = String(data.name ?? '').trim();
  const email = String(data.email ?? '').trim();
  const notes = String(data.notes ?? '').trim();

  if (!Number.isFinite(amount) || amount < 10) {
    return Response.json({ error: 'Please enter a valid gift amount (at least KES 10).' }, { status: 400 });
  }

  if (!phone || phone.replace(/\D/g, '').length < 9) {
    return Response.json({ error: 'Please enter a valid Safaricom phone number, e.g. 0712 345 678.' }, { status: 400 });
  }

  let guestId: string | null = null;
  const token = await getSessionToken();
  if (token) {
    const inv = await getInvitation(token).catch(() => null);
    if (inv && inv.status === 'valid') guestId = inv.guest.id;
  }

  try {
    const res = await chargePaystackMpesaGift({
      amount,
      phone,
      name,
      email,
      notes,
      guestId,
    });

    return Response.json(res);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Could not trigger M-Pesa prompt.' },
      { status: 500 },
    );
  }
}
