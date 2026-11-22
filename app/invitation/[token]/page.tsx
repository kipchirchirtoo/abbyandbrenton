import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import InvitationCard from '@/components/rsvp/InvitationCard';
import { getResponseByViewToken } from '@/lib/rsvp/store';
import { buildCard } from '@/lib/rsvp/card';
import { siteOrigin } from '@/lib/rsvp/qr';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Your invitation — Abigael & Brenton',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

/**
 * A guest's personal invitation, reached through their secret link (43 random characters; only a hash is stored).
 * This page is deliberately outside the main site layout so the link works on any device, even in private mode.
 */
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let record = null;
  let unavailable = false;
  try {
    record = await getResponseByViewToken(token);
  } catch {
    unavailable = true;
  }

  if (!record) {
    return (
      <main className="standalone">
        <div className="thanks-box">
          <p className="script">{unavailable ? 'One moment' : 'Link not found'}</p>
          <p className="lead">
            {unavailable
              ? 'We could not load your invitation just now. Please try again shortly.'
              : 'This invitation link is not valid. If you have RSVP’d, use “Email me my invitation” on the RSVP page to get a fresh link.'}
          </p>
          <Link className="btn" href="/rsvp">Go to RSVP</Link>
        </div>
      </main>
    );
  }

  const h = await headers();
  const origin = siteOrigin() || `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;

  if (!record.attending) {
    return (
      <main className="standalone">
        <div className="thanks-box">
          <p className="script">Thank you</p>
          <p className="lead">You let us know you cannot attend. We’ll miss you, and we’re grateful you replied.</p>
        </div>
      </main>
    );
  }

  const card = await buildCard(record, origin);
  return (
    <main className="standalone">
      <p className="eyebrow">Your personal invitation</p>
      <InvitationCard card={card} viewUrl={null} />
      <p className="hint center no-print">This page is private to you. Please do not share the link.</p>
    </main>
  );
}
