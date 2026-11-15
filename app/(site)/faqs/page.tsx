import type { Metadata } from 'next';
import PageHero from '@/components/site/PageHero';
import Faq from '@/components/site/Faq';
import PrivateAccess from '@/components/PrivateAccess';
import { getSiteAccess } from '@/lib/guest-session';
import { faqs } from '@/lib/content';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'FAQs — Abigael & Brenton' };

export default async function Faqs() {
  const access = await getSiteAccess();
  if (!access.allowed) return <PrivateAccess reason={access.reason} />;

  return (
    <>
      <PageHero eyebrow="FAQs" title="Good to know" sub="Everything you need before the big day." image="/photos/hero4.jpg" position="center" />
      <section className="reveal section">
        <Faq items={faqs} />
      </section>
    </>
  );
}
