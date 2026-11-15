import type { Metadata } from 'next';
import PageHero from '@/components/site/PageHero';
import PrivateAccess from '@/components/PrivateAccess';
import { getSiteAccess } from '@/lib/guest-session';
import { bridalMembers, bridalStory } from '@/lib/content';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Bridal Team — Abigael & Brenton' };

const photo = (n: string) => `/photos/gallery/${n}`;

export default async function BridalTeam() {
  const access = await getSiteAccess();
  if (!access.allowed) return <PrivateAccess reason={access.reason} />;

  const groom = bridalMembers.filter((m) => m.side === 'groom');
  const bride = bridalMembers.filter((m) => m.side === 'bride');

  return (
    <>
      <PageHero eyebrow="Bridal team" title="Our people" sub="The friends and family standing beside us." image={photo('bridal-3.jpg')} position="center" />

      <section className="reveal section">
        <p className="eyebrow">Bridal team story</p>
        <h2>{bridalStory.title}</h2>
        <div className="divider" />
        {bridalStory.paragraphs.map((p) => <p key={p.slice(0, 24)} className="lead para">{p}</p>)}
        <p className="pull-quote">“{bridalStory.quote}”</p>
      </section>

      <section className="reveal section wide">
        <div className="team-grid">
          <figure>
            <div className="team-photo"><img src={photo('bridal-1.jpg')} alt="The groomsmen" loading="lazy" /></div>
            <figcaption><b>The Groomsmen</b><span>Brenton&apos;s brothers in arms</span></figcaption>
          </figure>
          <figure>
            <div className="team-photo"><img src={photo('bridal-4.jpg')} alt="The bridesmaids" loading="lazy" /></div>
            <figcaption><b>The Bridesmaids</b><span>Abigael&apos;s sisters at heart</span></figcaption>
          </figure>
        </div>
        <div className="team-grid wide-row">
          <figure>
            <div className="team-photo land"><img src={photo('bridal-8.jpg')} alt="The bridal party together" loading="lazy" /></div>
            <figcaption><b>Together</b><span>One team, one celebration</span></figcaption>
          </figure>
        </div>
      </section>

      {bridalMembers.length > 0 && (
        <section className="reveal section wide">
          <div className="members">
            {[['Groom’s side', groom], ['Bride’s side', bride]].map(([title, list]) => (
              (list as typeof groom).length > 0 && (
                <div key={title as string}>
                  <h3>{title as string}</h3>
                  <ul>
                    {(list as typeof groom).map((m) => <li key={m.name}><b>{m.name}</b><span>{m.role}</span></li>)}
                  </ul>
                </div>
              )
            ))}
          </div>
        </section>
      )}
    </>
  );
}
