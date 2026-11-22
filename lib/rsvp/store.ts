import 'server-only';
import { randomBytes } from 'node:crypto';
import { getAdminClient } from '@/lib/supabase/admin';
import { generateInvitationToken, hashInvitationToken, isWellFormedToken } from '@/lib/invitations/tokens';
import { estimateStay, type RsvpSubmission } from '@/lib/rsvp/validation';
import { isWellFormedQr } from '@/lib/rsvp/qr';
import { roomsLeft } from '@/lib/bookings';

export type RsvpErrorCode = 'closed' | 'duplicate_email' | 'duplicate_submission' | 'stay_unavailable' | 'unavailable';
export class RsvpError extends Error {
  constructor(public code: RsvpErrorCode, message: string) {
    super(message);
  }
}

export type GuestRecord = {
  id: string;
  fullName: string;
  category: 'adult' | 'child';
  dietary: string | null;
  isPrimary: boolean;
  checkedInAt: string | null;
  checkedInBy: string | null;
};
export type StayRecord = {
  id: string;
  roomType: string;
  roomName: string;
  units: number;
  checkIn: string;
  checkOut: string;
  occupantsCount: number;
  occupantNames: string[];
  specialRequests: string | null;
  unitPrice: number;
  estimatedAmount: number;
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled';
  statusUpdatedAt: string | null;
};
export type ResponseRecord = {
  id: string;
  reference: string;
  qrToken: string;
  guestId: string | null;
  fullName: string;
  email: string;
  whatsapp: string;
  attending: boolean;
  adults: number;
  children: number;
  dietary: string | null;
  accessibility: string | null;
  specialRequests: string | null;
  message: string | null;
  emailSentAt: string | null;
  submittedAt: string;
  guests: GuestRecord[];
  stay: StayRecord | null;
};

/** token_hash columns are never selected, so they cannot leak. */
const COLUMNS =
  'id,reference,qr_token,guest_id,full_name,email,whatsapp,attending,adults,children,dietary,accessibility,special_requests,message,email_sent_at,submitted_at,' +
  'wedding_response_guests(id,position,full_name,category,dietary,is_primary,checked_in_at,checked_in_by),' +
  'wedding_stay_requests(id,room_type,room_name,units,check_in,check_out,occupants_count,occupant_names,special_requests,unit_price,estimated_amount,status,status_updated_at)';

/* eslint-disable @typescript-eslint/no-explicit-any */
function toRecord(r: any): ResponseRecord {
  const stayRow = Array.isArray(r.wedding_stay_requests) ? r.wedding_stay_requests[0] : r.wedding_stay_requests;
  const guests: any[] = [...(r.wedding_response_guests ?? [])].sort((a, b) => a.position - b.position);
  return {
    id: r.id,
    reference: r.reference,
    qrToken: r.qr_token,
    guestId: r.guest_id,
    fullName: r.full_name,
    email: r.email,
    whatsapp: r.whatsapp,
    attending: r.attending,
    adults: r.adults,
    children: r.children,
    dietary: r.dietary,
    accessibility: r.accessibility,
    specialRequests: r.special_requests,
    message: r.message,
    emailSentAt: r.email_sent_at,
    submittedAt: r.submitted_at,
    guests: guests.map((g) => ({
      id: g.id,
      fullName: g.full_name,
      category: g.category,
      dietary: g.dietary,
      isPrimary: g.is_primary,
      checkedInAt: g.checked_in_at,
      checkedInBy: g.checked_in_by,
    })),
    stay: stayRow
      ? {
          id: stayRow.id,
          roomType: stayRow.room_type,
          roomName: stayRow.room_name,
          units: stayRow.units,
          checkIn: stayRow.check_in,
          checkOut: stayRow.check_out,
          occupantsCount: stayRow.occupants_count,
          occupantNames: stayRow.occupant_names ?? [],
          specialRequests: stayRow.special_requests,
          unitPrice: stayRow.unit_price,
          estimatedAmount: stayRow.estimated_amount,
          status: stayRow.status,
          statusUpdatedAt: stayRow.status_updated_at,
        }
      : null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I confusion
const newReference = () => {
  const bytes = randomBytes(6);
  return 'AB-' + Array.from(bytes, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join('');
};

/**
 * Saves a validated RSVP (the database function re-checks the deadline and writes everything in one transaction).
 * Returns the secret link token ONCE: only its hash is stored.
 */
export async function createRsvp(sub: RsvpSubmission, opts: { guestId?: string | null }) {
  let stayPayload: Record<string, unknown> | null = null;
  if (sub.stay) {
    const est = estimateStay(sub.stay.roomType, sub.stay.units);
    if (!est) throw new RsvpError('unavailable', 'Unknown accommodation type.');
    const left = (await roomsLeft(sub.stay.roomType).catch(() => ({} as Record<string, number>)))[sub.stay.roomType];
    if (left !== undefined && left < sub.stay.units) {
      throw new RsvpError('stay_unavailable', left === 0 ? `Sorry, ${est.name} is fully reserved.` : `Only ${left} ${est.name} unit${left === 1 ? ' is' : 's are'} left. Please request fewer units.`);
    }
    stayPayload = {
      room_type: sub.stay.roomType,
      room_name: est.name,
      units: sub.stay.units,
      check_in: sub.stay.checkIn,
      check_out: sub.stay.checkOut,
      occupants_count: sub.stay.occupantCount,
      occupant_names: sub.stay.occupantNames,
      special_requests: sub.stay.requests,
      unit_price: est.unitPrice,
      estimated_amount: est.amount, // price × units, deliberately NOT × nights
    };
  }

  const db = getAdminClient();
  for (let attempt = 0; attempt < 4; attempt++) {
    const { token, tokenHash } = generateInvitationToken();
    const qrToken = randomBytes(16).toString('base64url');
    const reference = newReference();
    const { data, error } = await db.rpc('submit_rsvp_response', {
      p: {
        reference,
        view_token_hash: tokenHash,
        qr_token: qrToken,
        idempotency_key: sub.idempotencyKey,
        guest_id: opts.guestId ?? '',
        full_name: sub.fullName,
        email: sub.email,
        whatsapp: sub.whatsapp,
        attending: sub.attending,
        adults: sub.adults,
        children: sub.children,
        dietary: sub.dietary,
        accessibility: sub.accessibility,
        special_requests: sub.specialRequests,
        message: sub.message,
        guests: sub.guests.map((g) => ({ full_name: g.fullName, category: g.category, dietary: g.dietary })),
        stay: stayPayload,
      },
    });
    if (!error) {
      const id = (data as { id: string }).id;
      // Keep the older private-invitation tables in step so the existing Guests / Invitations screens stay accurate.
      if (opts.guestId) {
        db.rpc('submit_wedding_rsvp', {
          p_guest_id: opts.guestId,
          p_attending: sub.attending,
          p_attendee_names: sub.attending ? [sub.fullName, ...sub.guests.map((g) => g.fullName)] : [],
          p_dietary: sub.dietary,
          p_message: sub.message,
        }).then(() => {}, () => {});
      }
      return { id, reference, viewToken: token, qrToken };
    }
    const m = error.message ?? '';
    if (m.includes('rsvp_closed')) throw new RsvpError('closed', 'RSVPs are closed.');
    if (m.includes('duplicate_email')) throw new RsvpError('duplicate_email', 'An RSVP with this email address already exists.');
    if (m.includes('duplicate_submission')) throw new RsvpError('duplicate_submission', 'This RSVP was already submitted.');
    if (m.includes('duplicate_reference') && attempt < 3) continue;
    throw new RsvpError('unavailable', 'RSVP is temporarily unavailable.');
  }
  throw new RsvpError('unavailable', 'RSVP is temporarily unavailable.');
}

export async function getResponseByViewToken(token: string): Promise<ResponseRecord | null> {
  if (!isWellFormedToken(token)) return null;
  const { data, error } = await getAdminClient().from('wedding_responses').select(COLUMNS).eq('view_token_hash', hashInvitationToken(token)).maybeSingle();
  if (error) throw new Error('lookup_failed');
  return data ? toRecord(data) : null;
}

export async function getResponseByQr(code: string): Promise<ResponseRecord | null> {
  if (!isWellFormedQr(code)) return null;
  const { data, error } = await getAdminClient().from('wedding_responses').select(COLUMNS).eq('qr_token', code).maybeSingle();
  if (error) throw new Error('lookup_failed');
  return data ? toRecord(data) : null;
}

export async function getResponseById(id: string): Promise<ResponseRecord | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await getAdminClient().from('wedding_responses').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error('lookup_failed');
  return data ? toRecord(data) : null;
}

export async function getResponseByEmail(email: string): Promise<ResponseRecord | null> {
  const { data, error } = await getAdminClient().from('wedding_responses').select(COLUMNS).eq('email', email.toLowerCase()).maybeSingle();
  if (error) throw new Error('lookup_failed');
  return data ? toRecord(data) : null;
}

export async function getAllResponses(): Promise<ResponseRecord[]> {
  const { data, error } = await getAdminClient().from('wedding_responses').select(COLUMNS).order('submitted_at', { ascending: false }).limit(5000);
  if (error) throw new Error('Could not load RSVPs.');
  return (data ?? []).map(toRecord);
}

/**
 * Replaces the secret link token (the old link stops working). Returns the new token and a rollback that restores
 * the old one, so a failed email never leaves a guest with a dead link.
 */
export async function rotateViewToken(responseId: string): Promise<{ token: string; rollback: () => Promise<void> }> {
  const db = getAdminClient();
  const { data: current, error: readError } = await db.from('wedding_responses').select('view_token_hash').eq('id', responseId).maybeSingle();
  if (readError || !current) throw new Error('Could not create a new link.');
  const previous = current.view_token_hash as string;
  const { token, tokenHash } = generateInvitationToken();
  const { error } = await db.from('wedding_responses').update({ view_token_hash: tokenHash, updated_at: new Date().toISOString() }).eq('id', responseId);
  if (error) throw new Error('Could not create a new link.');
  return {
    token,
    rollback: async () => {
      await db.from('wedding_responses').update({ view_token_hash: previous }).eq('id', responseId);
    },
  };
}

export async function markEmailSent(responseId: string, kind: 'confirmation' | 'link') {
  const now = new Date().toISOString();
  await getAdminClient()
    .from('wedding_responses')
    .update(kind === 'confirmation' ? { email_sent_at: now, last_link_sent_at: now } : { last_link_sent_at: now })
    .eq('id', responseId);
}

/** Case-insensitive search by name, phone, email, reference or any accompanying guest's name. */
export function matchesQuery(r: ResponseRecord, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const digits = needle.replace(/\D/g, '');
  const hay = [r.fullName, r.email, r.reference, ...r.guests.map((g) => g.fullName)].join(' ').toLowerCase();
  if (hay.includes(needle)) return true;
  return digits.length >= 4 && r.whatsapp.replace(/\D/g, '').includes(digits);
}

export type CheckInOutcome = { changed: string[]; already: GuestRecord[] };

/**
 * Checks people in. Only guests NOT yet checked in are updated (a conditional UPDATE), so scanning twice or two
 * devices racing can never double check-in; anyone already in is reported back with their original time.
 */
export async function checkInGuests(responseId: string, guestIds: string[] | 'all', by: string): Promise<CheckInOutcome> {
  const db = getAdminClient();
  const before = await getResponseById(responseId);
  if (!before || !before.attending) throw new Error('not_attending');
  const wanted = guestIds === 'all' ? before.guests.map((g) => g.id) : before.guests.filter((g) => guestIds.includes(g.id)).map((g) => g.id);
  if (wanted.length === 0) return { changed: [], already: [] };
  const { data, error } = await db
    .from('wedding_response_guests')
    .update({ checked_in_at: new Date().toISOString(), checked_in_by: by })
    .eq('response_id', responseId)
    .in('id', wanted)
    .is('checked_in_at', null)
    .select('id');
  if (error) throw new Error('checkin_failed');
  const changed = (data ?? []).map((d) => d.id as string);
  const already = before.guests.filter((g) => wanted.includes(g.id) && !changed.includes(g.id) && g.checkedInAt);
  return { changed, already };
}

export async function undoCheckIn(responseId: string, guestIds: string[] | 'all') {
  let q = getAdminClient().from('wedding_response_guests').update({ checked_in_at: null, checked_in_by: null }).eq('response_id', responseId);
  if (guestIds !== 'all') q = q.in('id', guestIds);
  const { error } = await q;
  if (error) throw new Error('undo_failed');
}

export async function setStayStatus(responseId: string, status: 'pending' | 'confirmed' | 'declined' | 'cancelled') {
  const { data, error } = await getAdminClient()
    .from('wedding_stay_requests')
    .update({ status, status_updated_at: new Date().toISOString() })
    .eq('response_id', responseId)
    .select('id');
  if (error || !data?.length) throw new Error('stay_update_failed');
}
