import type { Metadata } from 'next';
import PageHero from '@/components/site/PageHero';
import PrivateAccess from '@/components/PrivateAccess';
import { getSiteAccess } from '@/lib/guest-session';
import { dressCode } from '@/lib/content';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Dress Code — Abigael & Brenton' };

export default async function DressCode() {
  const access = await getSiteAccess();
  if (!access.allowed) return <PrivateAccess reason={access.reason} />;

  return (
    <>
      <PageHero eyebrow="Dress code & theme" title={dressCode.headline} sub={dressCode.theme} image="/photos/gallery/bride-2.jpg" position="center 20%" />

      <section className="reveal section">
        <p className="eyebrow">Our theme</p>
        <h2>Warm, natural elegance</h2>
        <div className="divider" />
        <p className="lead">{dressCode.intro}</p>
      </section>

      <section className="reveal section wide">
        <p className="eyebrow">Official guest colour palette</p>
        <h2>Wear these six colours</h2>
        <div className="swatches">
          {dressCode.palette.map((c) => (
            <div key={c.name} className="swatch">
              <span style={{ background: c.color }} />
              <b>{c.name}</b>
              <small>{c.color}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="reveal section wide">
        <div className="cards two">
          <div className="card-d left">
            <h3>For ladies</h3>
            <ul className="tick">{dressCode.ladies.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <div className="card-d left">
            <h3>For gentlemen</h3>
            <ul className="tick">{dressCode.gentlemen.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="reveal section wide avoid-section">
        <p className="eyebrow">Colours to avoid</p>
        <h2>Please do not wear</h2>
        <div className="swatches">
          {dressCode.avoid.map((c) => (
            <div key={c.name} className="swatch avoid">
              <span style={c.color === 'rainbow' ? undefined : { background: c.color }} className={c.color === 'rainbow' ? 'rainbow' : ''} />
              <b>{c.name}</b>
              <small>{c.note}</small>
            </div>
          ))}
        </div>
        <p className="hint strong">If a colour is not in the palette above, please leave it for another occasion.</p>
      </section>

      <section className="reveal section">
        <p className="pull-quote">{dressCode.summary}</p>
      </section>

    </>
  );
}
