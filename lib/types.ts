/** Shapes shared between server and client code. Never include token data here. */

export type ExistingRsvp = {
  attending: boolean;
  attendeeNames: string[];
  dietary: string;
  message: string;
};

export type GuestInfo = {
  name: string;
  guestLimit: number;
  existing: ExistingRsvp | null;
};

export type InvitationStatus = 'pending' | 'sent' | 'accepted' | 'declined' | 'revoked';

export type GuestRow = {
  id: string;
  full_name: string;
  email: string;
  guest_limit: number;
  token_hash: string;
  invitation_status: InvitationStatus;
  token_expires_at: string | null;
  email_sent_at: string | null;
  created_at: string;
  updated_at: string;
};
