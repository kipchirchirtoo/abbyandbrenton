/** Public (browser-safe) wedding settings. Edit here, or override with NEXT_PUBLIC_* env vars. */
export const siteConfig = {
  weddingDate: new Date('2027-01-15T14:00:00+03:00'),
  rsvpDeadline: '15 December 2026',
  venueQuery: 'Sultan Palace Kikambala Mtwapa Kenya',
  // Public (non-invitation) RSVP fallbacks, used only when the site is not in private mode.
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '',
  sheetUrl:
    process.env.NEXT_PUBLIC_SHEET_URL ??
    'https://script.google.com/macros/s/AKfycbyPGJ70OnVomJ_x5sPLwIUW3cXAnjy87wwijNwErkAsJGQl3B_8Z9MYkxT7caWYXkmkWA/exec',
  rsvpEmail: process.env.NEXT_PUBLIC_RSVP_EMAIL ?? 'kiprutobrenton@gmail.com',
};
