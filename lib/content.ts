/**
 * ALL editable wedding content lives here. Items marked TODO are sensible placeholders —
 * replace them with your real details.
 */

export const couple = {
  bride: 'Abigael',
  groom: 'Brenton',
  hashtag: '#AbigaelAndBrenton2027',
};

export const venue = {
  name: 'Sultan Palace',
  area: 'Kikambala, Mtwapa',
  country: 'Kenya',
  mapQuery: 'Sultan Palace Kikambala Mtwapa Kenya',
};

/** Main menu. Order = order in the menu. */
export const nav = [
  { href: '/', label: 'The Day' },
  { href: '/our-story', label: 'Our Story' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/bridal-team', label: 'Bridal Team' },
  { href: '/programme', label: 'Programme' },
  { href: '/dress-code', label: 'Dress Code' },
  { href: '/location', label: 'Location' },
  { href: '/stay', label: 'Book a Room' },
  { href: '/faqs', label: 'FAQs' },
  { href: '/gift', label: 'M-Pesa Gift' },
  { href: '/rsvp', label: 'RSVP' },
] as const;

/* ---------------- The wedding day (Friday only) ---------------- */
export type DayEvent = { time: string; title: string; text: string };

export const weddingDay = {
  weekday: 'Friday',
  date: '15 January 2027',
  title: 'The Wedding Day',
  summary: 'The ceremony, the reception and a night of celebration.',
  events: [
    { time: '1:30 PM', title: 'Guest arrival', text: 'Welcome drinks in the garden.' },
    { time: '2:00 PM', title: 'Ceremony', text: 'Exchange of vows.' },
    { time: '3:30 PM', title: 'Photos & cocktails', text: 'Canapés and live acoustic music.' },
    { time: '5:00 PM', title: 'Reception dinner', text: 'Speeches, toasts and the first dance.' },
    { time: '9:00 PM', title: 'Dancing', text: 'Party until late.' },
  ] as DayEvent[],
};

/* ---------------- Dress code ---------------- */
export const dressCode = {
  headline: 'Elegant · Coastal · Garden Chic',
  theme: 'Sophisticated, romantic, warm and natural.',
  intro:
    'Guests are invited to wear elegant, breathable and comfortable outfits suited to a garden and coastal wedding. Think warm neutrals, earthy tones, soft romantic colours and flowing fabrics.',
  summary:
    'Dress elegantly in champagne, warm taupe, soft mocha, dusty rose, terracotta or antique gold, and embrace a relaxed but sophisticated coastal garden-chic look.',
  /** Official guest colour palette. */
  palette: [
    { name: 'Champagne', color: '#E7D2B5' },
    { name: 'Warm Taupe', color: '#B39886' },
    { name: 'Soft Mocha', color: '#8F6B56' },
    { name: 'Dusty Rose', color: '#C5898E' },
    { name: 'Terracotta', color: '#B56346' },
    { name: 'Antique Gold', color: '#C9A65B' },
  ],
  ladies: [
    'Flowing, elegant dresses',
    'Satin, chiffon or silk-blend fabrics',
    'Long dresses, midi dresses or sophisticated evening dresses',
    'Lightweight, breathable fabrics',
    'Colours taken from the official wedding palette',
  ],
  gentlemen: [
    'Tailored suits or smart linen outfits',
    'Lightweight shirts and trousers',
    'Cream, taupe, mocha, terracotta or champagne combinations',
    'Smart, polished and comfortable footwear',
  ],
  /** Colours to avoid. `color` is only used to draw the swatch. */
  avoid: [
    { name: 'White', color: '#ffffff', note: 'Reserved for the bride' },
    { name: 'Olive green', color: '#6b7a3a', note: 'Reserved for the bridal party' },
    { name: 'Black', color: '#141414', note: 'Keeps the look light and cohesive' },
    { name: 'Beige', color: '#d8c8a8', note: 'Too close to our champagne. Please choose champagne instead' },
    { name: 'Any other colour', color: 'rainbow', note: 'Please keep to the six colours of the palette' },
  ],
};

/* ---------------- FAQs ---------------- */
// TODO: review each answer and edit to match your plans.
export const faqs: { q: string; a: string }[] = [
  { q: 'When and where is the wedding?', a: 'Friday, 15 January 2027 at Sultan Palace, Kikambala, Mtwapa. Guests are welcome from 1:30 PM and the ceremony begins at 2:00 PM.' },
  { q: 'What is the dress code?', a: 'Elegant, coastal garden chic. Please wear champagne, warm taupe, soft mocha, dusty rose, terracotta or antique gold. Please avoid white, olive green, black, beige and any colour not in our palette. See the Dress Code page for details.' },
  { q: 'How do I RSVP, and by when?', a: 'Use the RSVP page. Kindly reply by 15 December 2026 so we can plan seating and catering.' },
  { q: 'Can I bring a plus one or children?', a: 'Your personal invitation shows exactly how many guests it covers. If you need to change this, please contact us before the RSVP deadline.' },
  { q: 'Where can I stay?', a: 'You can book and pay for a room on the Book a Room page. We recommend booking early as the coast is busy in January.' },
  { q: 'Is there parking?', a: 'Yes. Please follow the ushers’ directions when you arrive. We encourage carpooling where you can.' },
  { q: 'Will photos be taken?', a: 'Our photographers will capture the day. Please enjoy the moment and share your favourites with ' + couple.hashtag + '.' },
  { q: 'How can I send a gift?', a: 'Your presence is the greatest gift. If you would like to contribute, use the M-Pesa Gift page.' },
  { q: 'Who do I contact with questions?', a: 'Please reach out to the couple or the bridal team and we will be glad to help.' },
];

/* ---------------- Bridal team ---------------- */
// TODO: add names/roles to show a list of people. Leave empty to hide the list.
export const bridalMembers: { name: string; role: string; side: 'bride' | 'groom' }[] = [];

export const bridalStory = {
  title: 'The people who made us who we are',
  paragraphs: [
    'Behind every great love story is a circle of people who laughed with us, prayed for us and carried us through every season. Our bridal team is that circle.',
    'They are the friends who listened to the late-night worries, the ones who showed up with food, with laughter and with the right words at the right time. They have been part of our story long before the proposal, and we could not imagine standing at the altar without them.',
    'To our bridesmaids and groomsmen: thank you for your love, your time and your joy. We are so grateful to have you beside us on our day.',
  ],
  quote: 'We did not choose them because they are perfect for the wedding. We chose them because they are perfect for us.',
};

/* ---------------- Stay / rooms (booked and paid on the website via Paystack) ---------------- */
/**
 * HOW TO ADD YOUR REAL HOTELS AND ROOMS
 *  1. Replace the sample entries below with the real hotel(s) and room types.
 *  2. Put the pictures in /public/photos/rooms/ and set `image: '/photos/rooms/<file>.jpg'`.
 *  3. Set `published: true` on every room you want guests to be able to book, and remove `sample: true`.
 * Prices are WHOLE KES per room per night. The server always recomputes the total; the browser never sets a price.
 * Rooms with `published: false` are hidden from guests and cannot be booked.
 */
export type Room = {
  id: string;
  name: string;
  description: string;
  pricePerNight: number; // whole KES
  capacity: number; // max guests per room
  image?: string;
  published: boolean;
  sample?: boolean;
};
export type Hotel = { id: string; name: string; area: string; description: string; image?: string; mapQuery: string; rooms: Room[] };

export const stay = {
  intro:
    'We would love for you to stay close and celebrate with us. Choose your room, pay securely online, and your booking is confirmed straight away.',
  currency: 'KES',
  // Dates guests may book between (inclusive of check-in, exclusive of check-out day beyond max).
  minDate: '2027-01-12',
  maxDate: '2027-01-19',
  defaultCheckIn: '2027-01-15',
  defaultCheckOut: '2027-01-16',
  hotels: [
    {
      id: 'sultan-palace',
      name: 'Sultan Palace',
      area: 'Kikambala, Mtwapa',
      description: 'Hotel details and photos coming soon.',
      mapQuery: 'Sultan Palace Kikambala Mtwapa Kenya',
      rooms: [
        // SAMPLE ONLY: placeholders so the booking flow can be previewed. Not real rooms or prices.
        { id: 'standard', name: 'Standard Room', description: 'Sample room (details to come).', pricePerNight: 10000, capacity: 2, published: false, sample: true },
        { id: 'deluxe', name: 'Deluxe Room', description: 'Sample room (details to come).', pricePerNight: 15000, capacity: 3, published: false, sample: true },
      ],
    },
  ] as Hotel[],
};

/* ---------------- Gifts ---------------- */
export const gift = {
  // The M-Pesa number that gifts go to (shown to guests).
  mpesaNumber: '0716355462',
  mpesaDisplay: '0716 355 462',
  accountName: 'Abigael & Brenton Wedding',
};

