import type { Metadata } from 'next';
import PageHero from '@/components/site/PageHero';
import GiftForm from '@/components/site/GiftForm';
import PrivateAccess from '@/components/PrivateAccess';
import { getSiteAccess } from '@/lib/guest-session';
import { mpesaConfigured } from '@/lib/mpesa';
import { paystackConfigured, verifyTransaction } from '@/lib/paystack';
import { applyPaystackGiftResult, getGiftByReference } from '@/lib/gifts';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Wedding Gift — Abigael & Brenton' };

export default async function Gift({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const access = await getSiteAccess();
  if (!access.allowed) return <PrivateAccess reason={access.reason} />;

  const { reference, trxref } = await searchParams;
  const ref = reference || trxref;

  let verifiedGift: { amount: number; giverName: string; receipt: string } | null = null;

  if (ref && (ref.startsWith('GF-') || ref.startsWith('GIFT-')) && paystackConfigured()) {
    const v = await verifyTransaction(ref).catch(() => null);
    if (v && v.status === 'success') {
      await applyPaystackGiftResult(ref, {
        success: true,
        amountMinor: v.amountMinor,
        currency: v.currency,
        id: v.id,
      });
      const g = await getGiftByReference(ref);
      if (g && g.status === 'success') {
        verifiedGift = {
          amount: g.amount,
          giverName: g.giver_name || 'Generous Friend',
          receipt: g.mpesa_receipt || ref,
        };
      }
    }
  }

  return (
    <>
      <PageHero
        eyebrow="With gratitude"
        title="Send a gift"
        sub="Your presence is the greatest gift. If you wish to bless us further, you can do it here."
        image="/photos/g2.jpg"
        position="center 30%"
      />
      <section className="reveal section wide">
        <GiftForm
          stkEnabled={mpesaConfigured()}
          paystackEnabled={paystackConfigured()}
          defaultName={access.guest?.name ?? ''}
          verifiedGift={verifiedGift}
        />
      </section>
    </>
  );
}
