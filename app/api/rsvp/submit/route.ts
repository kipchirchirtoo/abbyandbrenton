import { getSessionToken, isPrivateMode } from '@/lib/guest-session';
import { getInvitation } from '@/lib/invitations/validation';
import { isWellFormedToken } from '@/lib/invitations/tokens';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { getRsvpStatus } from '@/lib/rsvp/state';
import { parseSubmission } from '@/lib/rsvp/validation';
import { MAX_PARTY } from '@/lib/rsvp/config';
import { createRsvp, getResponseById, markEmailSent, RsvpError } from '@/lib/rsvp/store';
import { buildCard } from '@/lib/rsvp/card';
import { siteOrigin } from '@/lib/rsvp/qr';
import { sendRsvpEmail } from '@/lib/email/rsvp-invitation';
import type { SubmitResult } from '@/lib/rsvp/types';

export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Saves an RSVP. Everything is checked HERE (the browser is never trusted):
 * deadline, same-origin, rate limits, full validation, duplicate protection. The database then re-checks the deadline
 * and writes the RSVP, guests and accommodation request in a single transaction.
 */
export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) return json({ error: 'Forbidden' }, 403);

  if (!rateLimit(`rsvp-submit-ip:${clientIp(req)}`, 20, 10 * 60_000)) {
    return json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, 429);
  }

  const length = Number(req.headers.get('content-length') ?? 0);
  if (length > 80_000) return json({ error: 'That request is too large.' }, 413);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  // Bot trap: real guests never see or fill this field.
  if (body && typeof body === 'object' && (body as Record<string, unknown>).website) return json({ error: 'Invalid request.' }, 400);

  // 1. The deadline, decided on the server from the server clock and the admin setting.
  const status = await getRsvpStatus();
  if (!status.open) return json({ error: 'RSVPs are now closed.', closed: true }, 403);

  // 2. Personal-invitation visitors reply as themselves, within their invitation's guest limit.
  let guestId: string | null = null;
  let maxParty = MAX_PARTY;
  const token = await getSessionToken();
  if (isWellFormedToken(token)) {
    const inv = await getInvitation(token).catch(() => null);
    if (inv && inv.status === 'valid') {
      guestId = inv.guest.id;
      maxParty = Math.min(MAX_PARTY, inv.guest.guest_limit);
    }
  }
  if (isPrivateMode() && !guestId) return json({ error: 'Please open your personal invitation link to reply.' }, 403);

  const parsed = parseSubmission(body, maxParty);
  if (!parsed.ok) return json({ error: parsed.error, field: parsed.field }, 400);
  const sub = parsed.value;

  // 3. Per-person brake on top of the per-IP one.
  if (!rateLimit(`rsvp-submit-who:${guestId ?? sub.email}`, 6, 60 * 60_000)) {
    return json({ error: 'Too many attempts for this RSVP. Please try again later.' }, 429);
  }

  try {
    const created = await createRsvp(sub, { guestId });
    const record = await getResponseById(created.id);
    if (!record) throw new Error('missing_after_insert');

    const site = siteOrigin(req);
    const viewUrl = sub.attending ? `${site}/invitation/${created.viewToken}` : null;
    const card = await buildCard(record, site);

    // Email is best effort and reported honestly: the guest already has their card on screen either way.
    const emailStatus = await sendRsvpEmail(record, {
      viewUrl: viewUrl ?? site,
      qrImageUrl: `${site}/api/qr/${record.qrToken}`,
      kind: 'confirmation',
    });
    if (emailStatus === 'sent') await markEmailSent(record.id, 'confirmation').catch(() => {});

    const result: SubmitResult = { ok: true, card, viewUrl, emailStatus };
    return json(result);
  } catch (e) {
    if (e instanceof RsvpError) {
      if (e.code === 'closed') return json({ error: 'RSVPs are now closed.', closed: true }, 403);
      if (e.code === 'duplicate_email') {
        return json({ error: 'An RSVP with this email address has already been received. Use “Email me my invitation” below to get your link again.', code: 'duplicate_email' }, 409);
      }
      if (e.code === 'duplicate_submission') return json({ error: 'Your RSVP was already received.', code: 'duplicate_submission' }, 409);
      if (e.code === 'stay_unavailable') return json({ error: e.message, field: 'stay-units' }, 409);
    }
    // Deliberately generic: never echo internal errors.
    return json({ error: 'We could not save your RSVP just now. Please try again in a moment.' }, 503);
  }
}
