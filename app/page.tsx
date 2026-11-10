import type { Metadata } from 'next';
import WeddingSite from '@/components/WeddingSite';
import PrivateAccess from '@/components/PrivateAccess';

// Read PRIVATE_MODE at request time, not build time.
export const dynamic = 'force-dynamic';

const isPrivate = () => process.env.PRIVATE_MODE === 'true';

export function generateMetadata(): Metadata {
  return isPrivate() ? { title: 'Private invitation', robots: { index: false, follow: false } } : {};
}

/**
 * PRIVATE_MODE=true  -> the public homepage shows only a private-access screen;
 *                       the wedding site is available through /invite/<token> only.
 * otherwise          -> the public site renders as before (Google Sheet / WhatsApp RSVP).
 */
export default function Home() {
  return isPrivate() ? <PrivateAccess /> : <WeddingSite />;
}
