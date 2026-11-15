import { getInvitation } from '@/lib/invitations/validation';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** Lets the client confirm an invitation is still valid. Returns no token data. */
export async function POST(req: Request) {
  if (!rateLimit(`validate:${clientIp(req)}`, 30, 10 * 60_000)) {
    return Response.json({ valid: false }, { status: 429 });
  }
  let token: unknown;
  try {
    token = ((await req.json()) as { token?: unknown }).token;
  } catch {
    return Response.json({ valid: false }, { status: 400 });
  }
  try {
    const result = await getInvitation(token);
    if (result.status !== 'valid') return Response.json({ valid: false, reason: result.status });
    return Response.json({
      valid: true,
      name: result.guest.full_name,
      guestLimit: result.guest.guest_limit,
      status: result.guest.invitation_status,
    });
  } catch {
    return Response.json({ valid: false }, { status: 500 });
  }
}
