import 'server-only';
import type { ResponseRecord } from '@/lib/rsvp/store';
import type { CardData } from '@/lib/rsvp/types';
import { qrDataUrl, qrTargetUrl } from '@/lib/rsvp/qr';

/** Builds the guest-facing card data (including a freshly rendered QR image). */
export async function buildCard(r: ResponseRecord, origin: string): Promise<CardData> {
  const people = r.guests.length ? r.guests : [];
  const companions = people.filter((g) => !g.isPrimary).map((g) => ({ fullName: g.fullName, category: g.category }));
  return {
    reference: r.reference,
    fullName: r.fullName,
    attending: r.attending,
    adults: r.adults,
    children: r.children,
    total: r.attending ? r.adults + r.children : 0,
    companions,
    qrDataUrl: r.attending ? await qrDataUrl(qrTargetUrl(origin, r.qrToken)) : null,
    accommodation: r.stay ? { roomName: r.stay.roomName, units: r.stay.units, status: r.stay.status } : null,
  };
}
