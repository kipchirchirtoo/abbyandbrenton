import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';
import type { InvitationStatus } from '@/lib/types';

export type AdminGuest = {
  id: string;
  full_name: string;
  email: string;
  guest_limit: number;
  invitation_status: InvitationStatus;
  email_sent_at: string | null;
  rsvp: null | {
    attending: boolean;
    attending_count: number;
    dietary_requirements: string | null;
    message: string | null;
    updated_at: string;
    attendees: string[];
  };
};

/** Never selects token_hash: hashes do not leave the server. */
export async function getAdminGuests(): Promise<AdminGuest[]> {
  const { data, error } = await getAdminClient()
    .from('wedding_guests')
    .select(
      'id,full_name,email,guest_limit,invitation_status,email_sent_at,wedding_rsvps(attending,attending_count,dietary_requirements,message,updated_at,wedding_rsvp_attendees(full_name))',
    )
    .order('full_name');
  if (error) throw new Error('Could not load guests.');
  return (data ?? []).map((g) => {
    const raw = g.wedding_rsvps as unknown;
    const r = (Array.isArray(raw) ? raw[0] : raw) as
      | {
          attending: boolean;
          attending_count: number;
          dietary_requirements: string | null;
          message: string | null;
          updated_at: string;
          wedding_rsvp_attendees: { full_name: string }[];
        }
      | null
      | undefined;
    return {
      id: g.id,
      full_name: g.full_name,
      email: g.email,
      guest_limit: g.guest_limit,
      invitation_status: g.invitation_status as InvitationStatus,
      email_sent_at: g.email_sent_at,
      rsvp: r
        ? {
            attending: r.attending,
            attending_count: r.attending_count,
            dietary_requirements: r.dietary_requirements,
            message: r.message,
            updated_at: r.updated_at,
            attendees: (r.wedding_rsvp_attendees ?? []).map((a) => a.full_name),
          }
        : null,
    };
  });
}
