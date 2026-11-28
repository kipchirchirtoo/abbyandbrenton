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
  { href: '/bridal-team', label: 'The Party' },
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
  { q: 'How do I RSVP, and by when?', a: 'Use the RSVP page. Kindly reply by 30 December 2026 so we can plan seating and catering.' },
  { q: 'Can I bring a plus one or children?', a: 'Your personal invitation shows exactly how many guests it covers. If you need to change this, please contact us before the RSVP deadline.' },
  { q: 'Where can I stay?', a: 'You can book and pay for a room on the Book a Room page. We recommend booking early as the coast is busy in January.' },
  { q: 'Is there parking?', a: 'Yes. Please follow the ushers’ directions when you arrive. We encourage carpooling where you can.' },
  { q: 'Will photos be taken?', a: 'Our photographers will capture the day. Please enjoy the moment and share your favourites with ' + couple.hashtag + '.' },
  { q: 'How can I send a gift?', a: 'Your presence is the greatest gift. If you would like to contribute, use the Send a Gift page to pay securely with Paystack (card, Apple Pay, bank transfer) or M-Pesa.' },
  { q: 'Who do I contact with questions?', a: 'Please reach out to the couple or the bridal team and we will be glad to help.' },
];

/* ---------------- Bridal team ---------------- */
// Add each person here to replace a placeholder card on The Party page: { name: 'Full Name', role: 'Best man', side: 'groom' } (side 'bride' for bridesmaids).
// Add `photo: '/photos/...'` later when you have one. Until then the page shows "Name coming soon" placeholders.
export const bridalMembers: { name: string; role: string; side: 'bride' | 'groom'; photo?: string }[] = [];

export const bridalStory = {
  title: 'The people who made us who we are',
  paragraphs: [
    'Behind every great love story is a circle of people who laughed with us, prayed for us and carried us through every season. Our party is that circle.',
    'They are the friends who listened to the late-night worries, the ones who showed up with food, with laughter and with the right words at the right time. They have been part of our story long before the proposal, and we could not imagine standing at the altar without them.',
    'To our bridesmaids and groomsmen: thank you for your love, your time and your joy. We are so grateful to have you beside us on our day.',
  ],
  quote: 'We did not choose them because they are perfect for the wedding. We chose them because they are perfect for us.',
};

/* ---------------- Stay / rooms (booked and paid on the website via Paystack) ---------------- */
/**
 * HOW TO EDIT THE HOTEL AND ROOMS
 *  - Photos live in /public/photos/villa/ as v-01.jpg ... v-82.jpg (numbers = the order of your original folder).
 *    `v(12)` below means "photo number 12". Move numbers between lists to re-organise the photos.
 *  - Replace the room NAMES, DESCRIPTIONS, PRICES and CAPACITY with the real details (everything marked SAMPLE / TODO).
 *  - `published: true` rooms can be booked. (`sample: true` is only for placeholder rooms and shows a SAMPLE tag.)
 * Prices are WHOLE KES per UNIT for the stay (not per night). The server always recomputes the total; the browser never sets a price.
 * Rooms with `published: false` are hidden from guests and cannot be booked (their photos can still show in the gallery).
 */
const v = (n: number) => `/photos/villa/v-${String(n).padStart(2, '0')}.jpg`;

export type Room = {
  id: string;
  name: string;
  description: string;
  pricePerNight: number; // whole KES per UNIT (not per night; the field name is historic)
  capacity?: number; // max guests per unit (optional: only shown / enforced when known)
  image?: string; // cover photo
  images?: string[]; // all photos of this room (shown in a gallery when clicked)
  amenities?: string[]; // what the room includes, shown as a list on the card
  units?: number; // how many of this category exist for the wedding
  reserved?: number; // already reserved offline (not through this website)
  left?: number; // filled in by the server: units still free. Never edit.
  published: boolean;
  sample?: boolean;
};
export type Hotel = {
  id: string;
  name: string;
  area: string;
  description: string;
  image?: string;
  /** Photos of the property and its grounds, shown to every visitor even before booking opens. */
  gallery?: string[];
  mapQuery: string;
  rooms: Room[];
};

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
      id: 'villa',
      name: 'Sultan Palace',
      area: 'Kikambala, Mtwapa',
      description: 'Villas, town houses and apartments at Sultan Palace, Kikambala.',
      mapQuery: 'Sultan Palace Kikambala Mtwapa Kenya',
      image: v(80),
      // The villa, its pool, gardens and the grounds.
      gallery: [80, 73, 76, 77, 74, 78, 65, 71, 40, 41, 48, 49, 50, 51, 53, 20, 22, 24].map(v),
      rooms: [
        // The five Sultan Palace categories with their real prices (KES per UNIT, not per night) and unit counts.
        // Add `capacity: N` and `amenities: [...]` to a room when you have the real details: they are shown only when present.
        {
          id: 'villa',
          name: 'Villa',
          description: 'Villa accommodation at Sultan Palace, Kikambala.',
          pricePerNight: 50000,
          units: 7,
          reserved: 2,
          image: v(80),
          images: [80, 76, 73, 59, 64, 60, 72, 75, 67, 66, 79, 71, 78, 74, 77, 65, 57, 58, 62, 70, 68, 55, 61, 63, 56, 52, 54, 69].map(v),
          published: true,
        },
        {
          id: 'townhouse-3br',
          name: '3 Bedroom Town House',
          description: 'Three-bedroom town house at Sultan Palace, Kikambala.',
          pricePerNight: 20000,
          units: 13,
          reserved: 10,
          image: v(41),
          images: [41, 40, 39, 44, 47, 43, 42, 46, 45].map(v),
          published: true,
        },
        {
          id: 'apartment-3br',
          name: '3 Bedroom Apartment',
          description: 'Three-bedroom apartment at Sultan Palace, Kikambala.',
          pricePerNight: 18000,
          units: 7,
          reserved: 0,
          image: v(4),
          images: [4, 9, 10, 11, 12, 15, 18, 13, 17, 82, 14, 3, 5, 16, 2, 8, 1, 6, 7, 23].map(v),
          published: true,
        },
        {
          id: 'apartment-2br',
          name: '2 Bedroom Apartment',
          description: 'Two-bedroom apartment at Sultan Palace, Kikambala.',
          pricePerNight: 14000,
          units: 17,
          reserved: 0,
          image: v(27),
          images: [27, 28, 29, 33, 37, 30, 32, 36, 21, 31, 35, 26, 34, 38].map(v),
          published: true,
        },
        {
          id: 'apartment-1br',
          name: '1 Bedroom Apartment',
          description: 'One-bedroom apartment at Sultan Palace, Kikambala.',
          pricePerNight: 8000,
          units: 9,
          reserved: 0,
          image: v(21),
          images: [21, 31, 35, 34, 38].map(v),
          published: true,
        },
      ],
    },
  ] as Hotel[],
};

/* ---------------- Gifts ---------------- */
export const gift = {
  // Official Paybill details
  paybill: '862862',
  businessName: 'LIPWA SOLUTIONS',
  accountNumber: '0170230003880',
  accountName: 'BRENTON KIPRUTO',
  // Direct M-Pesa phone number
  mpesaNumber: '0716355642',
  mpesaDisplay: '0716 355 642',
};

