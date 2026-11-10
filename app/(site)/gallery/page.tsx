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

  return (
    <>
      <PageHero eyebrow="Gallery" title="Moments we love" sub="The groom, the bride, our family, our bridal team and the places we celebrate." image="/photos/hero5.jpg" />
      <section className="reveal section wide">
        <Gallery data={data as unknown as GalleryData} />
      </section>
    </>
  );
}
