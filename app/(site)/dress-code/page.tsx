import type { Metadata } from 'next';
import PageHero from '@/components/site/PageHero';
import PrivateAccess from '@/components/PrivateAccess';
import { getSiteAccess } from '@/lib/guest-session';
import { dressCode, days } from '@/lib/content';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Dress Code — Abigael & Brenton' };

export default async function DressCode() {
  const access = await getSiteAccess();
  if (!access.allowed) return <PrivateAccess reason={access.reason} />;

  return (
    <>
      <PageHero eyebrow="Dress code" title={dressCode.headline} sub="Elegant, comfortable and ready to dance." image="/photos/gallery/bride-2.jpg" position="center 20%" />

      <section className="reveal section">
        <p className="lead">{dressCode.intro}</p>
        <div className="swatches">
          {dressCode.palette.map((c) => (
            <div key={c.name} className="swatch">
              <span style={{ background: c.color }} />
              <small>{c.name}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="reveal section wide">
        <div className="cards">
          <div className="card-d"><h3>Ladies</h3><p>{dressCode.ladies}</p></div>
          <div className="card-d"><h3>Gentlemen</h3><p>{dressCode.gentlemen}</p></div>
          <div className="card-d"><h3>Please avoid</h3><p>{dressCode.avoid}</p></div>
        </div>
      </section>

      <section className="reveal section">
        <p className="eyebrow">Each day</p>
        <h2>What to wear, day by day</h2>
        <ul className="dress-list">
          {days.map((d) => (
            <li key={d.key}><b>{d.weekday}</b><span>{d.dress}</span></li>
          ))}
        </ul>
      </section>
    </>
  );
}
