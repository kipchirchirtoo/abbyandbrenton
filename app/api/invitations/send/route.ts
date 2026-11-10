import { Resend } from 'resend';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdminApi } from '@/lib/admin-auth';
import { generateInvitationToken } from '@/lib/invitations/tokens';
import { renderInvitationEmail } from '@/lib/email/wedding-invitation';
import type { GuestRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Invitation links stop working this long after the wedding date.
const EXPIRY = new Date('2027-01-22T00:00:00+03:00');

type SendResult = { id: string; ok: boolean; error?: string };

/**
 * Admin only. For each guest: rotate the token (old link stops working), email the new link.
 * Because only a hash is stored, "resend" always issues a fresh link.
 * If the email fails the previous token hash is restored, so an earlier working link is not lost.
 */
export async function POST(req: Request) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  if (!apiKey || !from || !siteUrl) {
    return Response.json(
      { error: 'Email is not configured (RESEND_API_KEY, RESEND_FROM and NEXT_PUBLIC_SITE_URL are required).' },
      { status: 500 },
    );
  }

  let guestIds: unknown;
  try {
    guestIds = ((await req.json()) as { guestIds?: unknown }).guestIds;
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!Array.isArray(guestIds) || guestIds.length === 0 || guestIds.length > 200 || guestIds.some((g) => typeof g !== 'string')) {
    return Response.json({ error: 'Provide between 1 and 200 guest ids.' }, { status: 400 });
  }

  const db = getAdminClient();
  const resend = new Resend(apiKey);
  const { data: guests, error } = await db.from('wedding_guests').select('*').in('id', guestIds as string[]);
  if (error) return Response.json({ error: 'Could not load guests.' }, { status: 500 });

  const results: SendResult[] = [];
  for (const guest of (guests ?? []) as GuestRow[]) {
    if (guest.invitation_status === 'revoked') {
      results.push({ id: guest.id, ok: false, error: 'Invitation is revoked. Restore it first.' });
      continue;
    }
    const { token, tokenHash } = generateInvitationToken();
    const { error: updateError } = await db
      .from('wedding_guests')
      .update({ token_hash: tokenHash, token_expires_at: EXPIRY.toISOString(), updated_at: new Date().toISOString() })
      .eq('id', guest.id);
    if (updateError) {
      results.push({ id: guest.id, ok: false, error: 'Could not save the new invitation link.' });
      continue;
    }

    const link = `${siteUrl}/invite/${token}`;
    const mail = renderInvitationEmail({ name: guest.full_name, link, guestLimit: guest.guest_limit });
    const { error: sendError } = await resend.emails.send({
      from,
      to: guest.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    if (sendError) {
      await db.from('wedding_guests').update({ token_hash: guest.token_hash }).eq('id', guest.id); // restore
      results.push({ id: guest.id, ok: false, error: 'Email provider rejected the message.' });
      continue;
    }

    const keepStatus = guest.invitation_status === 'accepted' || guest.invitation_status === 'declined';
    await db
      .from('wedding_guests')
      .update({
        email_sent_at: new Date().toISOString(),
        ...(keepStatus ? {} : { invitation_status: 'sent' }),
      })
      .eq('id', guest.id);
    results.push({ id: guest.id, ok: true });
  }

  return Response.json({ results });
}
