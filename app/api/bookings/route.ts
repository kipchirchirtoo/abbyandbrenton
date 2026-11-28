import { getAdminClient } from '@/lib/supabase/admin';
import { getSessionToken, getSiteAccess } from '@/lib/guest-session';
import { getInvitation } from '@/lib/invitations/validation';
import { newReference, parseBooking, roomsLeft } from '@/lib/bookings';
import { initializeTransaction, paystackConfigured, getSiteUrl } from '@/lib/paystack';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Creates a pending booking (price computed on the server) and a Paystack checkout.
 * Returns { url } for the browser to redirect to. Nothing is confirmed until Paystack confirms payment.
 */
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
    return Response.json({ error: 'Online booking is not available yet. Please check back soon.' }, { status: 503 });
  }
  // Loose limit on every request (so form typos don't lock a guest out); strict limit below applies only to real bookings.
  if (!rateLimit(`book-any:${clientIp(req)}`, 60, 10 * 60_000)) {
    return Response.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429 });
  }
  const access = await getSiteAccess();
  if (!access.allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const parsed = parseBooking(body);
  if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 });
  const { input, hotel, room, nights, total } = parsed;
  // Each valid request creates a database row and a Paystack checkout, so it is limited more tightly.
  if (!rateLimit(`book-create:${clientIp(req)}`, 8, 10 * 60_000)) {
    return Response.json({ error: 'Too many bookings from this connection. Please wait a few minutes.' }, { status: 429 });
  }

  const left = (await roomsLeft(room.id, { fresh: true }))[room.id] ?? 0;
  if (left < input.rooms) {
    return Response.json(
      { error: left === 0 ? `Sorry, ${room.name} is fully booked.` : `Only ${left} ${room.name} unit${left === 1 ? ' is' : 's are'} left. Please choose fewer rooms.` },
      { status: 409 },
    );
  }

  let guestId: string | null = null;
  const token = await getSessionToken();
  if (token) {
    const inv = await getInvitation(token).catch(() => null);
    if (inv && inv.status === 'valid') guestId = inv.guest.id;
  }

  const db = getAdminClient();
  const reference = newReference();
  const { error: insertError } = await db.from('wedding_bookings').insert({
    reference,
    guest_id: guestId,
    full_name: input.fullName,
    email: input.email,
    phone: input.phone,
    hotel_id: hotel.id,
    hotel_name: hotel.name,
    room_id: room.id,
    room_name: room.name,
    check_in: input.checkIn,
    check_out: input.checkOut,
    nights,
    rooms: input.rooms,
    guests: input.guests,
    notes: input.notes || null,
    currency: 'KES',
    price_per_night: room.pricePerNight,
    total,
  });
  if (insertError) return Response.json({ error: 'We could not save your booking. Please try again.' }, { status: 500 });

  // Re-check after saving: if two guests raced for the last unit, the later one is cancelled instead of overbooking.
  if (((await roomsLeft(room.id, { fresh: true }))[room.id] ?? 0) === 0) {
    const { data: mine } = await db.from('wedding_bookings').select('created_at').eq('reference', reference).maybeSingle();
    const { data: earlier } = await db
      .from('wedding_bookings')
      .select('rooms')
      .eq('room_id', room.id)
      .or('status.in.(paid,review),status.eq.pending')
      .lt('created_at', (mine as { created_at: string } | null)?.created_at ?? new Date().toISOString());
    const before = (earlier ?? []).reduce((n: number, b: { rooms: number }) => n + b.rooms, 0);
    const cap = (room.units ?? 99) - (room.reserved ?? 0);
    if (before + input.rooms > cap) {
      await db.from('wedding_bookings').update({ status: 'cancelled', payment_note: 'Sold out before payment started.', updated_at: new Date().toISOString() }).eq('reference', reference);
      return Response.json({ error: `Sorry, ${room.name} has just sold out.` }, { status: 409 });
    }
  }

  try {
    const site = getSiteUrl(req);
    const { authorizationUrl } = await initializeTransaction({
      email: input.email,
      amountMinor: total * 100,
      currency: 'KES',
      reference,
      callbackUrl: `${site}/stay/booking/${reference}`,
      metadata: { hotel: hotel.name, room: room.name, nights, rooms: input.rooms, guest: input.fullName },
    });
    return Response.json({ ok: true, url: authorizationUrl, reference });
  } catch {
    await db.from('wedding_bookings').update({ status: 'failed', payment_note: 'Could not start Paystack checkout.', updated_at: new Date().toISOString() }).eq('reference', reference);
    return Response.json({ error: 'We could not start the payment. Please try again in a moment.' }, { status: 502 });
  }
}
