import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';
import { hashInvitationToken, isWellFormedToken } from './tokens';
import type { GuestRow, ExistingRsvp } from '@/lib/types';

export type InvitationResult =
  | { status: 'valid'; guest: GuestRow; existing: ExistingRsvp | null }
  | { status: 'invalid' | 'revoked' | 'expired' };

/** Looks up an invitation by raw token. The raw token is never logged or stored. */
export async function getInvitation(token: unknown): Promise<InvitationResult> {
  if (!isWellFormedToken(token)) return { status: 'invalid' };

  const db = getAdminClient();
  const { data: guest, error } = await db
    .from('wedding_guests')
    .select('*')
    .eq('token_hash', hashInvitationToken(token))
    .maybeSingle<GuestRow>();

  if (error) throw new Error('Invitation lookup failed.'); // message deliberately excludes the token
  if (!guest) return { status: 'invalid' };
  if (guest.invitation_status === 'revoked') return { status: 'revoked' };
  if (guest.token_expires_at && new Date(guest.token_expires_at).getTime() < Date.now()) {
    return { status: 'expired' };
  }

  const { data: rsvp } = await db
    .from('wedding_rsvps')
    .select('id, attending, dietary_requirements, message')
    .eq('guest_id', guest.id)
    .maybeSingle();

  let existing: ExistingRsvp | null = null;
  if (rsvp) {
    const { data: attendees } = await db
      .from('wedding_rsvp_attendees')
      .select('full_name')
      .eq('rsvp_id', rsvp.id);
    existing = {
      attending: rsvp.attending,
      attendeeNames: (attendees ?? []).map((a) => a.full_name),
      dietary: rsvp.dietary_requirements ?? '',
      message: rsvp.message ?? '',
    };
  }
  return { status: 'valid', guest, existing };
}

export type RsvpInput = {
  attending: boolean;
  attendeeNames: string[];
  dietary: string;
  message: string;
};

const clean = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

/** Validates an untrusted RSVP body. Returns an error string or the cleaned input. */
export function parseRsvpBody(body: unknown, guestLimit: number): { error: string } | { value: RsvpInput } {
  if (!body || typeof body !== 'object') return { error: 'Invalid request.' };
  const b = body as Record<string, unknown>;
  if (typeof b.attending !== 'boolean') return { error: 'Please choose whether you will attend.' };

  let names: string[] = [];
  if (b.attending) {
    if (!Array.isArray(b.attendeeNames)) return { error: 'Please enter the name of each guest.' };
    names = b.attendeeNames.map((n) => clean(n, 100));
    if (names.length < 1 || names.some((n) => !n)) return { error: 'Please enter the name of each guest.' };
    if (names.length > guestLimit) {
      return { error: `Your invitation is for up to ${guestLimit} guest${guestLimit === 1 ? '' : 's'}.` };
    }
  }
  return {
    value: {
      attending: b.attending,
      attendeeNames: names,
      dietary: clean(b.dietary, 300),
      message: clean(b.message, 1000),
    },
  };
}
