import type { Metadata } from 'next';
import PageHero from '@/components/site/PageHero';
import StayBooking from '@/components/site/StayBooking';
import VillaGallery from '@/components/site/VillaGallery';
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
      <PageHero eyebrow="Accommodation" title="Stay with us" sub="Rest, celebrate and make a weekend of it." image="/photos/villa/v-80.jpg" collage={[
        { src: '/photos/villa/v-80.jpg', pos: 'center 45%' },
        { src: '/photos/villa/v-76.jpg', pos: 'center 55%' },
        { src: '/photos/villa/v-59.jpg', pos: 'center 45%' },
        { src: '/photos/villa/v-27.jpg', pos: 'center 60%' },
      ]} />

      <section className="reveal section">
        <p className="lead">{stay.intro}</p>
      </section>

      {stay.hotels.filter((h) => h.gallery?.length).map((h) => (
        <section key={h.id} className="reveal section wide">
          <p className="eyebrow">{h.area}</p>
          <h2>{h.name}</h2>
          <p className="lead">{h.description}</p>
          <VillaGallery name={h.name} photos={h.gallery!} />
        </section>
      ))}

      <section className="reveal section wide" id="rooms">
        <p className="eyebrow">Choose your stay</p>
        <h2>Rooms &amp; booking</h2>
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
