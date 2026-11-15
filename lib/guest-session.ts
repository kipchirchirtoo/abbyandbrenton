import 'server-only';
import { cookies } from 'next/headers';
import { getInvitation, type InvitationResult } from '@/lib/invitations/validation';
import type { GuestInfo } from '@/lib/types';

/** httpOnly cookie that holds the guest's invitation token after they open their private link. */
export const GUEST_COOKIE = 'wedding_guest';

export type SiteAccess =
  | { allowed: true; guest: GuestInfo | null }
  | { allowed: false; reason: 'invalid' | 'revoked' | 'expired' | 'unavailable' };

export const isPrivateMode = () => process.env.PRIVATE_MODE === 'true';

export async function getSessionToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(GUEST_COOKIE)?.value;
}

/**
 * Decides whether the current visitor may see the wedding site.
 * - PRIVATE_MODE=true : a valid, unrevoked, unexpired invitation cookie is required.
 * - otherwise         : everyone may view; a valid cookie just personalises the site.
 * Call this in EVERY page (not only the layout): pages can be fetched on their own via RSC requests.
 */
export async function getSiteAccess(): Promise<SiteAccess> {
  const priv = isPrivateMode();
  const token = await getSessionToken();

  if (!token) return priv ? { allowed: false, reason: 'invalid' } : { allowed: true, guest: null };

  let result: InvitationResult | { status: 'unavailable' };
  try {
    result = await getInvitation(token);
  } catch {
    return priv ? { allowed: false, reason: 'unavailable' } : { allowed: true, guest: null };
  }
  if (result.status !== 'valid') {
    return priv ? { allowed: false, reason: result.status } : { allowed: true, guest: null };
  }
  return {
    allowed: true,
    guest: { name: result.guest.full_name, guestLimit: result.guest.guest_limit, existing: result.existing },
  };
}
