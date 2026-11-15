import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/site/PageHero';
import PrivateAccess from '@/components/PrivateAccess';
import { getSiteAccess } from '@/lib/guest-session';
import { weddingDay } from '@/lib/content';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Programme — Abigael & Brenton' };

export default async function Programme() {
  const access = await getSiteAccess();
  if (!access.allowed) return <PrivateAccess reason={access.reason} />;

  return (
    <>
      <PageHero eyebrow="Programme" title={weddingDay.title} sub={`${weddingDay.weekday}, ${weddingDay.date}`} image="/photos/hero2.jpg" position="center" />
      <section className="reveal section">
        <p className="eyebrow">{weddingDay.weekday} · {weddingDay.date}</p>
        <h2>The order of the day</h2>
        <p className="lead">{weddingDay.summary}</p>
        <div className="timeline">
          {weddingDay.events.map((e, i) => (
            <div className="t" key={e.time + e.title} style={{ animationDelay: `${i * 90}ms` }}>
              <time>{e.time}</time>
              <div><h3>{e.title}</h3><p>{e.text}</p></div>
            </div>
          ))}
        </div>
        <Link className="btn solid" href="/rsvp">RSVP</Link>
      </section>
    </>
  );
}
