import type { Metadata } from 'next';
import SiteShell from '@/components/site/SiteShell';
import PrivateAccess from '@/components/PrivateAccess';
import { getSiteAccess, isPrivateMode } from '@/lib/guest-session';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  // In private mode nothing about the event may appear in <head> (search/link previews).
  if (isPrivateMode()) {
    return { title: 'Private invitation', robots: { index: false, follow: false, nocache: true } };
  }
  return {
    title: 'Abigael & Brenton — Wedding Invitation',
    description: 'Join us as Abigael & Brenton get married on 15 January 2027 at Sultan Palace, Kikambala, Mtwapa.',
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const access = await getSiteAccess();
  // Private mode + no valid invitation: render only the neutral screen (no menu, no event details).
  // Each page ALSO checks access, because pages can be requested without this layout.
  if (!access.allowed) return <PrivateAccess reason={access.reason} />;
  return <SiteShell guestName={access.guest?.name}>{children}</SiteShell>;
}
