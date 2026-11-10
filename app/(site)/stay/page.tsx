import type { Metadata } from 'next';
import PageHero from '@/components/site/PageHero';
import StayBooking from '@/components/site/StayBooking';
import PrivateAccess from '@/components/PrivateAccess';
import { getSiteAccess } from '@/lib/guest-session';
import { stay } from '@/lib/content';
import { bookableHotels, bookingPreview } from '@/lib/bookings';
import { paystackConfigured } from '@/lib/paystack';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Book a Room — Abigael & Brenton' };

export default async function Stay() {
  const access = await getSiteAccess();
  if (!access.allowed) return <PrivateAccess reason={access.reason} />;

  return (
    <>
      <PageHero eyebrow="Accommodation" title="Stay with us" sub="Rest, celebrate and make a weekend of it." image="/photos/gallery/venue-1.jpg" position="center" />

      <section className="reveal section">
        <p className="lead">{stay.intro}</p>
      </section>

      <section className="reveal section wide">
        <StayBooking
          hotels={bookableHotels()}
          paymentReady={paystackConfigured() && Boolean(process.env.NEXT_PUBLIC_SITE_URL)}
          preview={bookingPreview()}
          minDate={stay.minDate}
          maxDate={stay.maxDate}
          defaultCheckIn={stay.defaultCheckIn}
          defaultCheckOut={stay.defaultCheckOut}
          defaultName={access.guest?.name ?? ''}
        />
      </section>
    </>
  );
}
