import type { Metadata } from 'next';
import PageHero from '@/components/site/PageHero';
import GiftForm from '@/components/site/GiftForm';
import PrivateAccess from '@/components/PrivateAccess';
import { getSiteAccess } from '@/lib/guest-session';
import { mpesaConfigured } from '@/lib/mpesa';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'M-Pesa Gift — Abigael & Brenton' };

export default async function Gift() {
  const access = await getSiteAccess();
  if (!access.allowed) return <PrivateAccess reason={access.reason} />;

  return (
    <>
      <PageHero eyebrow="With gratitude" title="Send a gift" sub="Your presence is the greatest gift. If you wish to bless us further, you can do it here." image="/photos/g2.jpg" position="center 30%" />
      <section className="reveal section wide">
        <GiftForm stkEnabled={mpesaConfigured()} defaultName={access.guest?.name ?? ''} />
      </section>
    </>
  );
}
