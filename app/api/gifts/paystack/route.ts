import { getSiteAccess, getSessionToken } from '@/lib/guest-session';
import { getInvitation } from '@/lib/invitations/validation';
import { paystackConfigured } from '@/lib/paystack';
import { createPaystackGift } from '@/lib/gifts';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!paystackConfigured() || !process.env.NEXT_PUBLIC_SITE_URL) {
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
  const email = String(data.email ?? '').trim();
  const name = String(data.name ?? '').trim();
  const phone = String(data.phone ?? '').trim();
  const notes = String(data.notes ?? '').trim();

  if (!Number.isFinite(amount) || amount < 10) {
    return Response.json({ error: 'Please enter a valid gift amount (at least KES 10).' }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Please provide a valid email address so Paystack can send your receipt.' }, { status: 400 });
  }

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
    const { authorizationUrl, reference } = await createPaystackGift({
      amount,
      email,
      name,
      phone,
      notes,
      guestId,
    });

    return Response.json({ ok: true, url: authorizationUrl, reference });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Could not initialize Paystack payment.' }, { status: 500 });
  }
}
