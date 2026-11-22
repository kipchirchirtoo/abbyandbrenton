/** Shared (browser-safe) RSVP settings. */

/**
 * RSVPs are open through 11:59:59 PM on 30 December 2026, Africa/Nairobi (UTC+3, no daylight saving),
 * so they close at the stroke of midnight: 31 December 2026, 00:00:00 in Nairobi. This instant is exclusive.
 * The database holds the same value (wedding_settings.rsvp_closes_at) and enforces it too.
 */
export const RSVP_CLOSES_AT = Date.parse('2026-12-31T00:00:00+03:00');
export const RSVP_DEADLINE_LABEL = '30 December 2026';
export const RSVP_TIMEZONE = 'Africa/Nairobi';

/** Largest party one RSVP may register (the primary guest plus everyone they bring). */
export const MAX_PARTY = 12;

export type RsvpMode = 'auto' | 'open' | 'closed';

export type RsvpStatus = {
  open: boolean;
  mode: RsvpMode;
  closesAt: number; // epoch ms
  serverNow: number; // epoch ms on the server when this was produced
};

/** Country calling codes offered in the form. Kenya first. */
export const COUNTRY_CODES: { code: string; label: string }[] = [
  { code: '+254', label: 'Kenya (+254)' },
  { code: '+255', label: 'Tanzania (+255)' },
  { code: '+256', label: 'Uganda (+256)' },
  { code: '+250', label: 'Rwanda (+250)' },
  { code: '+251', label: 'Ethiopia (+251)' },
  { code: '+27', label: 'South Africa (+27)' },
  { code: '+234', label: 'Nigeria (+234)' },
  { code: '+233', label: 'Ghana (+233)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+1', label: 'USA / Canada (+1)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+31', label: 'Netherlands (+31)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+91', label: 'India (+91)' },
  { code: '', label: 'Other (type the full number with +)' },
];
