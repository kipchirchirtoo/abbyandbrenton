import 'server-only';
import { randomBytes } from 'node:crypto';
import { getAdminClient } from '@/lib/supabase/admin';
import { stay, type Hotel, type Room } from '@/lib/content';
import { sendBookingConfirmation } from '@/lib/email/booking-confirmation';

export type BookingStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'review';

export type BookingRow = {
  id: string;
  reference: string;
  guest_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  hotel_id: string;
  hotel_name: string;
  room_id: string;
  room_name: string;
  check_in: string;
  check_out: string;
  nights: number;
  rooms: number;
  guests: number;
  notes: string | null;
  currency: string;
  price_per_night: number;
  total: number;
  status: BookingStatus;
  payment_note: string | null;
  paid_at: string | null;
  created_at: string;
};

/** Rooms guests may book. Unpublished rooms are hidden, unless BOOKING_PREVIEW=true (for previewing the sample UI only). */
export const bookingPreview = () => process.env.BOOKING_PREVIEW === 'true';

export function bookableHotels(): Hotel[] {
  const preview = bookingPreview();
  return stay.hotels
    .map((h) => ({ ...h, rooms: h.rooms.filter((r) => r.published || preview) }))
    .filter((h) => h.rooms.length > 0);
}

export function findRoom(hotelId: string, roomId: string): { hotel: Hotel; room: Room } | null {
  const hotel = bookableHotels().find((h) => h.id === hotelId);
  const room = hotel?.rooms.find((r) => r.id === roomId);
  return hotel && room ? { hotel, room } : null;
}

/** Short, unguessable, human-friendly reference. Doubles as the Paystack transaction reference. */
export const newReference = () => `AB-${randomBytes(6).toString('hex').toUpperCase()}`;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const dayNumber = (iso: string) => Math.round(Date.parse(iso + 'T00:00:00Z') / 86_400_000);

export type BookingInput = {
  hotelId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
  fullName: string;
  email: string;
  phone: string;
  notes: string;
};

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Validates untrusted input and computes the price on the server. The client never supplies a price. */
export function parseBooking(
  body: unknown,
): { error: string } | { input: BookingInput; hotel: Hotel; room: Room; nights: number; total: number } {
  if (!body || typeof body !== 'object') return { error: 'Invalid request.' };
  const b = body as Record<string, unknown>;
  const input: BookingInput = {
    hotelId: clean(b.hotelId, 60),
    roomId: clean(b.roomId, 60),
    checkIn: clean(b.checkIn, 10),
    checkOut: clean(b.checkOut, 10),
    rooms: Number(b.rooms),
    guests: Number(b.guests),
    fullName: clean(b.fullName, 100),
    email: clean(b.email, 254).toLowerCase(),
    phone: clean(b.phone, 20).replace(/[^\d+()\-\s]/g, ''),
    notes: clean(b.notes, 300),
  };

  const found = findRoom(input.hotelId, input.roomId);
  if (!found) return { error: 'That room is not available to book.' };
  if (!input.fullName) return { error: 'Please enter your full name.' };
  if (!EMAIL_RE.test(input.email)) return { error: 'Please enter a valid email address.' };
  if (input.phone.replace(/\D/g, '').length < 9) return { error: 'Please enter a valid phone number.' };
  if (!DATE_RE.test(input.checkIn) || !DATE_RE.test(input.checkOut) || Number.isNaN(dayNumber(input.checkIn)) || Number.isNaN(dayNumber(input.checkOut))) {
    return { error: 'Please choose valid check-in and check-out dates.' };
  }
  const nights = dayNumber(input.checkOut) - dayNumber(input.checkIn);
  if (nights < 1) return { error: 'Check-out must be after check-in.' };
  if (nights > 14) return { error: 'You can book up to 14 nights online.' };
  if (input.checkIn < stay.minDate || input.checkOut > stay.maxDate) {
    return { error: 'Those dates are outside the booking window for this wedding.' };
  }
  if (!Number.isInteger(input.rooms) || input.rooms < 1 || input.rooms > 5) return { error: 'You can book between 1 and 5 rooms online.' };
  if (!Number.isInteger(input.guests) || input.guests < 1) return { error: 'Please enter the number of guests.' };
  if (input.guests > input.rooms * found.room.capacity) {
    return { error: `That room sleeps up to ${found.room.capacity} guests. Please add another room.` };
  }
  const total = found.room.pricePerNight * nights * input.rooms;
  return { input, hotel: found.hotel, room: found.room, nights, total };
}

/**
 * Marks a booking paid after Paystack says so. Idempotent. The amount and currency MUST match what the
 * server priced; otherwise the booking is flagged for review and NOT confirmed.
 */
export async function applyPaystackResult(
  reference: string,
  result: { success: boolean; amountMinor: number; currency: string; id: string },
): Promise<'paid' | 'review' | 'failed' | 'ignored'> {
  const db = getAdminClient();
  const { data: booking } = await db.from('wedding_bookings').select('*').eq('reference', reference).maybeSingle<BookingRow>();
  if (!booking) return 'ignored';
  if (booking.status === 'paid') return 'paid';
  const now = new Date().toISOString();

  if (!result.success) {
    if (booking.status === 'pending') {
      await db.from('wedding_bookings').update({ status: 'failed', updated_at: now }).eq('reference', reference).eq('status', 'pending');
    }
    return 'failed';
  }

  const expected = booking.total * 100;
  if (result.amountMinor !== expected || result.currency !== booking.currency) {
    await db
      .from('wedding_bookings')
      .update({
        status: 'review',
        payment_note: `Paystack reported ${result.currency} ${(result.amountMinor / 100).toLocaleString('en-KE')} but the booking total is ${booking.currency} ${booking.total.toLocaleString('en-KE')}.`,
        paystack_id: result.id,
        updated_at: now,
      })
      .eq('reference', reference);
    return 'review';
  }

  // Only move forward from pending / failed / review. A cancelled booking that gets paid must be reviewed by a human.
  const nextStatus = booking.status === 'cancelled' ? 'review' : 'paid';
  const { data: updated } = await db
    .from('wedding_bookings')
    .update({
      status: nextStatus,
      paid_at: now,
      paystack_id: result.id,
      payment_note: nextStatus === 'review' ? 'Payment received for a booking that was cancelled.' : null,
      updated_at: now,
    })
    .eq('reference', reference)
    .neq('status', 'paid')
    .select('*')
    .maybeSingle<BookingRow>();

  if (updated && nextStatus === 'paid') {
    // Best effort: never let an email problem undo a confirmed payment.
    sendBookingConfirmation(updated).catch(() => {});
  }
  return nextStatus;
}
