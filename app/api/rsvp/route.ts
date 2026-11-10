import { getAdminClient } from '@/lib/supabase/admin';
import { getInvitation, parseRsvpBody } from '@/lib/invitations/validation';
import { getSessionToken } from '@/lib/guest-session';
import { hashInvitationToken, isWellFormedToken } from '@/lib/invitations/tokens';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Same-origin only (the guest cookie is SameSite=Lax; this is defence in depth).
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Rate limit per IP, and separately per invitation, to blunt automated submissions.
  if (!rateLimit(`rsvp-ip:${clientIp(req)}`, 10, 10 * 60_000)) {
    return Response.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429 });
  }

  const token = await getSessionToken();
  if (!isWellFormedToken(token)) {
    return Response.json({ error: 'Please open your personal invitation link to reply.' }, { status: 403 });
  }
  if (!rateLimit(`rsvp-token:${hashInvitationToken(token)}`, 8, 10 * 60_000)) {
    return Response.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }

  try {
    // Server-side verification again: never trust the page that rendered the form.
    const invitation = await getInvitation(token);
    if (invitation.status !== 'valid') {
      return Response.json({ error: 'This invitation link is no longer active.' }, { status: 403 });
    }

    const parsed = parseRsvpBody(body, invitation.guest.guest_limit);
    if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 });
    const r = parsed.value;

    // Single atomic database function: validates again under a row lock, upserts, updates status.
    const { error } = await getAdminClient().rpc('submit_wedding_rsvp', {
      p_guest_id: invitation.guest.id,
      p_attending: r.attending,
      p_attendee_names: r.attendeeNames,
      p_dietary: r.dietary,
      p_message: r.message,
    });
    if (error) {
      const known = ['revoked', 'expired', 'invalid_guest_count'].find((k) => error.message.includes(k));
      if (known === 'invalid_guest_count') {
        return Response.json({ error: 'The number of guests exceeds your invitation.' }, { status: 400 });
      }
      if (known) return Response.json({ error: 'This invitation link is no longer active.' }, { status: 403 });
      throw new Error('rsvp_rpc_failed');
    }
    return Response.json({ ok: true, attending: r.attending });
  } catch {
    // Deliberately generic: never echo tokens or internal errors.
    return Response.json({ error: 'Something went wrong. Please try again shortly.' }, { status: 500 });
  }
}
