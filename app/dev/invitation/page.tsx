import { notFound } from 'next/navigation';
import InvitationCard from '@/components/rsvp/InvitationCard';
import { qrDataUrl, qrTargetUrl } from '@/lib/rsvp/qr';
import type { CardData } from '@/lib/rsvp/types';

export const dynamic = 'force-dynamic';

/** Development-only preview of the invitation card with SAMPLE names. Returns 404 in production. */
export default async function PreviewInvitation() {
  if (process.env.NODE_ENV === 'production') notFound();
  const card: CardData = {
    reference: 'AB-7K3QMX',
    fullName: 'Wanjiru Mwangi',
    attending: true,
    adults: 2,
    children: 1,
    total: 3,
    companions: [
      { fullName: 'James Mwangi', category: 'adult' },
      { fullName: 'Zawadi Mwangi', category: 'child' },
    ],
    qrDataUrl: await qrDataUrl(qrTargetUrl('http://localhost:3000', 'SAMPLEsampleSAMPLE1234')),
    accommodation: { roomName: '2 Bedroom Apartment', units: 1, status: 'pending' },
  };
  return (
    <main className="standalone">
      <p className="eyebrow">Preview (sample data)</p>
      <InvitationCard card={card} viewUrl="http://localhost:3000/invitation/sample" />
    </main>
  );
}
