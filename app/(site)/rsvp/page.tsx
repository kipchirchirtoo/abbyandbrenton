import type { Metadata } from 'next';
import PageHero from '@/components/site/PageHero';
import RsvpSection from '@/components/RsvpSection';
import PrivateAccess from '@/components/PrivateAccess';
import { getSiteAccess } from '@/lib/guest-session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'RSVP — Abigael & Brenton' };

export default async function Rsvp() {
  const access = await getSiteAccess();
  if (!access.allowed) return <PrivateAccess reason={access.reason} />;

  return (
    <>
      <PageHero eyebrow="RSVP" title="Will you join us?" sub="Kindly reply by 30 December 2026." image="/photos/hero6.jpg" />
      <RsvpSection guest={access.guest} />
    </>
  );
}
