import type { Metadata } from 'next';
import WeddingSite from '@/components/WeddingSite';
import PrivateAccess from '@/components/PrivateAccess';
import { getInvitation, type InvitationResult } from '@/lib/invitations/validation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your private invitation — Abigael & Brenton',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let result: InvitationResult | { status: 'unavailable' };
  try {
    result = await getInvitation(token);
  } catch {
    // Never surface the error (it could contain request details); show a neutral screen.
    result = { status: 'unavailable' };
  }

  if (result.status !== 'valid') return <PrivateAccess reason={result.status} />;

  return (
    <WeddingSite
      token={token}
      guest={{
        name: result.guest.full_name,
        guestLimit: result.guest.guest_limit,
        existing: result.existing,
      }}
    />
  );
}
