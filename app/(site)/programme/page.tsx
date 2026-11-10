import type { Metadata } from 'next';
import PageHero from '@/components/site/PageHero';
import DaysTabs from '@/components/site/DaysTabs';
import PrivateAccess from '@/components/PrivateAccess';
import { getSiteAccess } from '@/lib/guest-session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'The Days — Abigael & Brenton' };

export default async function Programme() {
  const access = await getSiteAccess();
  if (!access.allowed) return <PrivateAccess reason={access.reason} />;

  return (
    <>
      <PageHero eyebrow="Programme" title="Thursday · Friday · Saturday" sub="Three days to celebrate love, family and friendship." image="/photos/hero2.jpg" position="center" />
      <section className="reveal section wide">
        <DaysTabs initial="friday" />
      </section>
    </>
  );
}
