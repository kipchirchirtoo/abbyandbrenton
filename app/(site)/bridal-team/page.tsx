import type { Metadata } from 'next';
import PageHero from '@/components/site/PageHero';
import PrivateAccess from '@/components/PrivateAccess';
import { getSiteAccess } from '@/lib/guest-session';
import { bridalMembers, bridalStory } from '@/lib/content';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'The Party — Abigael & Brenton' };

const photo = (n: string) => `/photos/gallery/${n}`;

export default async function BridalTeam() {
  const access = await getSiteAccess();
  if (!access.allowed) return <PrivateAccess reason={access.reason} />;

  const groom = bridalMembers.filter((m) => m.side === 'groom');
  const bride = bridalMembers.filter((m) => m.side === 'bride');

  return (
    <>
      <PageHero eyebrow="The party" title="The Party" sub="The friends and family standing beside us." image={photo('bridal-3.jpg')} position="center" />

      <section className="reveal section">
        <p className="eyebrow">The party’s story</p>
        <h2>{bridalStory.title}</h2>
        <div className="divider" />
        {bridalStory.paragraphs.map((p) => <p key={p.slice(0, 24)} className="lead para">{p}</p>)}
        <p className="pull-quote">“{bridalStory.quote}”</p>
      </section>

      {[
        { title: 'The Groomsmen', sub: 'Brenton’s brothers in arms', list: groom, label: 'Groomsman' },
        { title: 'The Bridesmaids', sub: 'Abigael’s sisters at heart', list: bride, label: 'Bridesmaid' },
      ].map((g) => {
        const cards = g.list.length > 0 ? g.list : Array.from({ length: 6 }, () => null);
        return (
          <section key={g.title} className="reveal section wide party-block">
            <p className="eyebrow">{g.sub}</p>
            <h2>{g.title}</h2>
            <div className="divider" />
            <div className="party-grid">
              {cards.map((m, i) => (
                <figure key={m ? m.name : i} className={m ? '' : 'is-placeholder'}>
                  <div className="party-photo">
                    {m?.photo ? <img src={m.photo} alt={m.name} loading="lazy" /> : (
                      <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="24" r="11" /><path d="M10 58c2-14 12-21 22-21s20 7 22 21z" /></svg>
                    )}
                  </div>
                  <figcaption><b>{m ? m.name : 'Name coming soon'}</b><span>{m ? m.role : g.label}</span></figcaption>
                </figure>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
