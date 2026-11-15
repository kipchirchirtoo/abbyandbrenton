import { NextResponse } from 'next/server';
import { getInvitation } from '@/lib/invitations/validation';
import { GUEST_COOKIE } from '@/lib/guest-session';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Opening a private invitation link:
 *  1. validate the token server-side,
 *  2. store it in an httpOnly cookie,
 *  3. redirect to the site so the token disappears from the address bar, history and Referer headers.
 */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const to = (path: string) => NextResponse.redirect(new URL(path, req.url), 303);

  if (!rateLimit(`invite:${clientIp(req)}`, 30, 10 * 60_000)) return to('/access?reason=invalid');

  let result;
  try {
    result = await getInvitation(token);
  } catch {
    return to('/access?reason=unavailable');
  }
  if (result.status !== 'valid') return to(`/access?reason=${result.status}`);

  const res = to('/');
  const expires = result.guest.token_expires_at ? new Date(result.guest.token_expires_at).getTime() : Infinity;
  const maxAge = Math.max(60, Math.min(60 * 24 * 3600, Math.floor((expires - Date.now()) / 1000)));
  res.cookies.set(GUEST_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
  return res;
}
