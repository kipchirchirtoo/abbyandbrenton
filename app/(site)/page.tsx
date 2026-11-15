import Link from 'next/link';
import HeroSlideshow from '@/components/site/HeroSlideshow';
import TravelScene from '@/components/site/TravelScene';
import Countdown, { AddToCalendar } from '@/components/site/Countdown';
import GalleryPreview from '@/components/site/GalleryPreview';
import PrivateAccess from '@/components/PrivateAccess';
import { getSiteAccess } from '@/lib/guest-session';
import { couple, venue, weddingDay } from '@/lib/content';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const access = await getSiteAccess();
  if (!access.allowed) return <PrivateAccess reason={access.reason} />;
  const guest = access.guest;
  const mapQ = encodeURIComponent(venue.mapQuery).replace(/%20/g, '+');

  return (
    <>
      <header className="hero">
        <HeroSlideshow />
        <TravelScene />
        <div className="hero-content">
          <p className="eyebrow">A destination wedding · together with their families</p>
          <h1 className="script">
            {couple.bride}<span className="amp">&amp;</span>{couple.groom}
          </h1>
          <p className="date">Friday · 15 January 2027</p>
          <p className="date sub">{venue.name} · {venue.area}</p>
          <div className="hero-cta">
            <Link href="/rsvp" className="btn solid light">RSVP now</Link>
            <Link href="/programme" className="btn ghost">See the programme</Link>
          </div>
        </div>
        <span className="scroll">Scroll ↓</span>
      </header>

      {guest && (
        <section className="reveal section guest-banner">
          <p className="eyebrow verified">✓ Invitation verified</p>
          <h2>Dear {guest.name},</h2>
          <p className="lead">You are personally invited to celebrate the wedding of {couple.bride} &amp; {couple.groom}.</p>
          <div className="divider" />
          <p className="date-line">Friday, 15 January 2027</p>
          <p className="lead">{venue.name} · {venue.area}</p>
          <p className="seats">Invitation for {guest.guestLimit} guest{guest.guestLimit === 1 ? '' : 's'}</p>
          <Link className="btn solid" href="/rsvp">Kindly confirm your attendance</Link>
        </section>
      )}

      <section className="reveal section">
        <p className="eyebrow">Save the date</p>
        <h2>Counting down to forever</h2>
        <Countdown />
        <AddToCalendar />
      </section>

      <section className="reveal section">
        <p className="eyebrow">The wedding day</p>
        <h2>{weddingDay.weekday}, {weddingDay.date}</h2>
        <div className="timeline compact">
          {weddingDay.events.map((e) => (
            <div className="t" key={e.time + e.title}>
              <time>{e.time}</time>
              <div><h3>{e.title}</h3><p>{e.text}</p></div>
            </div>
          ))}
        </div>
        <Link className="btn" href="/programme">View the programme</Link>
      </section>

      <GalleryPreview />

      <section className="reveal section wide split">
        <div className="split-img" style={{ backgroundImage: "url('/photos/gallery/bride-2.jpg')" }} />
        <div className="split-text">
          <p className="eyebrow">Dress code</p>
          <h2>Elegant · Coastal · Garden Chic</h2>
          <p className="lead">Champagne, warm taupe, soft mocha, dusty rose, terracotta or antique gold. Please avoid white, olive green, black, beige and any colour not in our palette.</p>
          <Link className="btn" href="/dress-code">See the dress code</Link>
        </div>
      </section>

      <section className="reveal section wide split flip">
        <div className="split-img" style={{ backgroundImage: "url('/photos/gallery/venue-3.jpg')" }} />
        <div className="split-text">
          <p className="eyebrow">The venue</p>
          <h2>{venue.name}</h2>
          <p className="lead">{venue.area}, {venue.country}. Ceremony at 2:00 PM, reception at 5:00 PM.</p>
          <Link className="btn" href="/location">Location &amp; directions</Link>
          <a className="btn" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${mapQ}`}>Open in Maps</a>
        </div>
      </section>

      <section className="reveal cta-band">
        <p className="eyebrow">Kindly reply by 30 December 2026</p>
        <h2>We can’t wait to celebrate with you</h2>
        <Link className="btn solid light" href="/rsvp">RSVP now</Link>
      </section>
    </>
  );
}
