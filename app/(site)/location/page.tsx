import type { Metadata } from 'next';
import PageHero from '@/components/site/PageHero';
import SketchMap from '@/components/site/SketchMap';
import { AddToCalendar } from '@/components/site/Countdown';
import PrivateAccess from '@/components/PrivateAccess';
import { getSiteAccess } from '@/lib/guest-session';
import { venue } from '@/lib/content';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Location — Abigael & Brenton' };

export default async function Location() {
  const access = await getSiteAccess();
  if (!access.allowed) return <PrivateAccess reason={access.reason} />;
  const q = encodeURIComponent(venue.mapQuery).replace(/%20/g, '+');

  return (
    <>
      <PageHero eyebrow="Location" title={venue.name} sub={`${venue.area}, ${venue.country}`} image="/photos/gallery/venue-3.jpg" position="center" />

      <section className="reveal section wide">
        <div className="cards">
          <div className="card-d"><h3>Ceremony</h3><p>Friday · 2:00 PM<br />Guests welcome from 1:30 PM</p></div>
          <div className="card-d"><h3>Reception</h3><p>Friday · 5:00 PM<br />{venue.name}</p></div>
          <div className="card-d"><h3>Address</h3><p>{venue.name}<br />{venue.area}<br />{venue.country}</p></div>
        </div>
        <div className="map-card">
          <SketchMap name={venue.name} />
          <div className="map-card-body">
            <p className="eyebrow">{venue.area}</p>
            <h3>{venue.name}</h3>
            <p>{venue.country}</p>
            <a className="btn solid pill" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${q}`}>Get directions ›</a>
          </div>
        </div>
        <iframe className="map" loading="lazy" title="Venue map" referrerPolicy="no-referrer" src={`https://www.google.com/maps?q=${q}&output=embed`} />
        <div className="btn-row">
          <a className="btn solid" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${q}`}>Get directions</a>
          <a className="btn" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${q}`}>Open in Maps</a>
          <AddToCalendar />
        </div>
      </section>
    </>
  );
}
