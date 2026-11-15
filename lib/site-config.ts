/** Public (browser-safe) wedding settings. Edit here, or override with NEXT_PUBLIC_* env vars. */
export const siteConfig = {
  weddingDate: new Date('2027-01-15T14:00:00+03:00'),
  rsvpDeadline: '30 December 2026',
  venueQuery: 'Sultan Palace Kikambala Mtwapa Kenya',
  // Google Form that collects RSVPs. Set NEXT_PUBLIC_RSVP_FORM_URL (the form's "Send" link). When set, the RSVP page
  // sends guests to the form instead of the built-in fallback form.
  rsvpFormUrl: process.env.NEXT_PUBLIC_RSVP_FORM_URL ?? '',
  // Public (non-invitation) RSVP fallbacks, used only when the site is not in private mode.
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '',
  sheetUrl:
    process.env.NEXT_PUBLIC_SHEET_URL ??
    'https://script.google.com/macros/s/AKfycbyPGJ70OnVomJ_x5sPLwIUW3cXAnjy87wwijNwErkAsJGQl3B_8Z9MYkxT7caWYXkmkWA/exec',
  rsvpEmail: process.env.NEXT_PUBLIC_RSVP_EMAIL ?? 'kiprutobrenton@gmail.com',
};
