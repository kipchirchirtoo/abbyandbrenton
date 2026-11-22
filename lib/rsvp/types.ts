/** What the invitation card needs. Contains the guest's own party only, never anyone else's details. */
export type CardData = {
  reference: string;
  fullName: string;
  attending: boolean;
  adults: number;
  children: number;
  total: number;
  /** Accompanying people (the primary guest is `fullName`). */
  companions: { fullName: string; category: 'adult' | 'child' }[];
  /** PNG data URL of the QR code (null for a declined RSVP). */
  qrDataUrl: string | null;
  accommodation: null | { roomName: string; units: number; status: 'pending' | 'confirmed' | 'declined' | 'cancelled' };
};

export type EmailStatus = 'sent' | 'not_configured' | 'failed';

export type SubmitResult = {
  ok: true;
  card: CardData;
  /** Secret link to the personalised invitation (null when the RSVP is a decline). */
  viewUrl: string | null;
  emailStatus: EmailStatus;
};
