import { stay } from '@/lib/content';
import { MAX_PARTY } from '@/lib/rsvp/config';

/* Pure validation shared by the server (authoritative) and the browser (instant feedback). */

export type GuestCategory = 'adult' | 'child';
export type GuestInput = { fullName: string; category: GuestCategory; dietary: string };
export type StayInput = {
  roomType: string;
  units: number;
  checkIn: string;
  checkOut: string;
  occupantCount: number;
  occupantNames: string[];
  requests: string;
};
export type RsvpSubmission = {
  idempotencyKey: string;
  fullName: string;
  email: string;
  whatsapp: string; // normalised E.164
  attending: boolean;
  guests: GuestInput[]; // accompanying people only
  adults: number; // includes the primary guest
  children: number;
  dietary: string;
  accessibility: string;
  specialRequests: string;
  message: string;
  stay: StayInput | null;
};

export type StayRoomOption = { id: string; name: string; price: number };
/** The five accommodation categories and their fixed prices (per unit, NOT per night). */
export const stayRooms = (): StayRoomOption[] =>
  stay.hotels.flatMap((h) => h.rooms).map((r) => ({ id: r.id, name: r.name, price: r.pricePerNight }));

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const cleanMultiline = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/\r/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max) : '';

/** A full name: at least two words, letters plus ' . - only. */
export function isFullName(name: string): boolean {
  if (name.length < 3 || name.length > 100) return false;
  if (!/^[\p{L}][\p{L}\p{M}'’.\- ]*$/u.test(name)) return false;
  return name.split(' ').filter((w) => w.replace(/[^\p{L}]/gu, '').length >= 1).length >= 2;
}

export function isEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/.test(email);
}

/**
 * Turns what a guest typed into E.164 (+254712345678), or null when it cannot be a real number.
 * Accepts Kenyan formats (0712 345 678, 254712345678, +254 712 345 678) and international numbers (+44 7700 900123).
 */
export function normalizePhone(input: string, defaultCode = '+254'): string | null {
  let s = input.trim().replace(/[\s().\-]/g, '');
  if (!s) return null;
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (!s.startsWith('+')) {
    if (/^0[17]\d{8}$/.test(s) && defaultCode === '+254') s = '+254' + s.slice(1);
    else if (/^254[17]\d{8}$/.test(s)) s = '+' + s;
    else if (defaultCode && /^\d+$/.test(s)) s = defaultCode + s.replace(/^0+/, '');
    else return null;
  }
  if (!/^\+[1-9]\d{7,14}$/.test(s)) return null;
  // Kenya: +254 then a 9 digit number starting 7 or 1.
  if (s.startsWith('+254') && !/^\+254[17]\d{8}$/.test(s)) return null;
  return s;
}

const isoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00Z'));

export type ParseResult = { ok: true; value: RsvpSubmission } | { ok: false; error: string; field?: string };
const fail = (error: string, field?: string): ParseResult => ({ ok: false, error, field });

/**
 * Validates an untrusted RSVP body. `maxParty` is the most people this RSVP may cover
 * (the invitation's limit for personal links, otherwise MAX_PARTY).
 */
export function parseSubmission(body: unknown, maxParty = MAX_PARTY): ParseResult {
  if (!body || typeof body !== 'object') return fail('Invalid request.');
  const b = body as Record<string, unknown>;

  const fullName = clean(b.fullName, 100);
  if (!isFullName(fullName)) return fail('Please enter your full legal name (first and last name).', 'fullName');

  const email = clean(b.email, 254).toLowerCase();
  if (!isEmail(email)) return fail('Please enter a valid email address.', 'email');

  const whatsapp = normalizePhone(clean(b.whatsapp, 30), '+254');
  if (!whatsapp) return fail('Please enter a valid WhatsApp number including the country code, for example +254 712 345 678.', 'whatsapp');

  if (typeof b.attending !== 'boolean') return fail('Please tell us whether you will attend.', 'attending');
  const attending = b.attending;

  const idempotencyKey = clean(b.idempotencyKey, 64);
  const dietary = clean(b.dietary, 300);
  const accessibility = clean(b.accessibility, 300);
  const specialRequests = cleanMultiline(b.specialRequests, 500);
  const message = cleanMultiline(b.message, 1000);

  const base = { idempotencyKey, fullName, email, whatsapp, dietary, accessibility, specialRequests, message };
  if (!attending) {
    return { ok: true, value: { ...base, attending: false, guests: [], adults: 0, children: 0, stay: null } };
  }

  const rawGuests = Array.isArray(b.guests) ? b.guests : [];
  if (rawGuests.length + 1 > maxParty) return fail(`This RSVP can cover up to ${maxParty} people including you.`, 'guests');
  const guests: GuestInput[] = [];
  for (let i = 0; i < rawGuests.length; i++) {
    const g = rawGuests[i] as Record<string, unknown>;
    const name = clean(g?.fullName, 100);
    if (!isFullName(name)) return fail(`Please enter the full name of guest ${i + 1} (first and last name).`, `guest-${i}`);
    const category: GuestCategory = g?.category === 'child' ? 'child' : 'adult';
    guests.push({ fullName: name, category, dietary: clean(g?.dietary, 300) });
  }
  const adults = 1 + guests.filter((g) => g.category === 'adult').length;
  const children = guests.filter((g) => g.category === 'child').length;

  let stayInput: StayInput | null = null;
  const s = b.stay as Record<string, unknown> | null | undefined;
  if (s && typeof s === 'object') {
    const room = stayRooms().find((r) => r.id === clean(s.roomType, 40));
    if (!room) return fail('Please choose an accommodation type.', 'stay-roomType');
    const units = Number(s.units);
    if (!Number.isInteger(units) || units < 1 || units > 10) return fail('Please enter how many units you need (1 to 10).', 'stay-units');
    const checkIn = clean(s.checkIn, 10);
    const checkOut = clean(s.checkOut, 10);
    if (!isoDate(checkIn) || !isoDate(checkOut)) return fail('Please choose your check-in and check-out dates.', 'stay-checkIn');
    if (checkIn < stay.minDate || checkOut > stay.maxDate) return fail('Those dates are outside the accommodation window for this wedding.', 'stay-checkIn');
    if (checkOut <= checkIn) return fail('Check-out must be after check-in.', 'stay-checkOut');
    const occupantCount = Number(s.occupantCount);
    if (!Number.isInteger(occupantCount) || occupantCount < 1 || occupantCount > 40) return fail('Please enter the number of people who will stay.', 'stay-occupantCount');
    const names = (Array.isArray(s.occupantNames) ? s.occupantNames : []).map((n) => clean(n, 100));
    if (names.length !== occupantCount) return fail('Please give the full name of every person who will stay.', 'stay-occupants');
    for (let i = 0; i < names.length; i++) {
      if (!isFullName(names[i])) return fail(`Please enter the full name of occupant ${i + 1} (first and last name).`, `stay-occupant-${i}`);
    }
    stayInput = { roomType: room.id, units, checkIn, checkOut, occupantCount, occupantNames: names, requests: cleanMultiline(s.requests, 500) };
  }

  return { ok: true, value: { ...base, attending: true, guests, adults, children, stay: stayInput } };
}

/** Estimated accommodation amount: the category price × units. Never multiplied by nights. */
export function estimateStay(roomType: string, units: number): { name: string; unitPrice: number; amount: number } | null {
  const r = stayRooms().find((x) => x.id === roomType);
  return r ? { name: r.name, unitPrice: r.price, amount: r.price * units } : null;
}
