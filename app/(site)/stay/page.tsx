import type { Metadata } from 'next';
import PageHero from '@/components/site/PageHero';
import RoomRequest from '@/components/site/RoomRequest';
import PrivateAccess from '@/components/PrivateAccess';
import { getSiteAccess } from '@/lib/guest-session';
import { stay } from '@/lib/content';

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
        <div className="cards two">
          {stay.options.map((o) => (
            <div key={o.name} className="card-d stay-card">
              <span className="tag">{o.tag}</span>
              <h3>{o.name}</h3>
              <p>{o.note}</p>
              <a className="btn" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.mapQuery).replace(/%20/g, '+')}`}>
                View on map
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="reveal section" id="request">
        <p className="eyebrow">Request a room</p>
        <h2>Tell us your dates</h2>
        <RoomRequest defaultName={access.guest?.name ?? ''} />
        <p className="hint">This opens WhatsApp with your details filled in. Nothing is booked until the team confirms with you.</p>
      </section>
    </>
  );
}
