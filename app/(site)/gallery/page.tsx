import type { Metadata } from 'next';
import PageHero from '@/components/site/PageHero';
import Gallery, { type GalleryData } from '@/components/site/Gallery';
import PrivateAccess from '@/components/PrivateAccess';
import { getSiteAccess } from '@/lib/guest-session';
import data from '@/lib/gallery.json';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Gallery — Abigael & Brenton' };

export default async function GalleryPage() {
  const access = await getSiteAccess();
  if (!access.allowed) return <PrivateAccess reason={access.reason} />;

  const gallery = data as unknown as GalleryData;
  const total = Object.values(gallery).reduce((n, list) => n + list.length, 0);

  return (
    <>
      <PageHero
        eyebrow="Gallery"
        title="Moments we love"
        sub={`${total} photos: our proposal, the groom, the bride, our family, our bridal team and the places we celebrate.`}
        image="/photos/proposal/hero-3.jpg"
        collage={[
          { src: '/photos/proposal/story-1.jpg', pos: 'center 22%' },
          { src: '/photos/gallery/bride-1.jpg', pos: 'center 25%' },
          { src: '/photos/gallery/groom-1.jpg', pos: 'center 22%' },
          { src: '/photos/proposal/story-2.jpg', pos: 'center 30%' },
        ]}
      />
      <section className="reveal section wide">
        <Gallery data={gallery} />
      </section>
    </>
  );
}
