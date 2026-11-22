import { requireAdminApi } from '@/lib/admin-auth';
import { getResponseById, markEmailSent, rotateViewToken } from '@/lib/rsvp/store';
import { siteOrigin } from '@/lib/rsvp/qr';
import { sendRsvpEmail } from '@/lib/email/rsvp-invitation';

export const dynamic = 'force-dynamic';

/** Admin: email a guest a fresh private invitation link. Reports honestly when email is not configured or fails. */
export async function POST(req: Request) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
    return Response.json({ error: 'Email delivery is not configured (set RESEND_API_KEY and RESEND_FROM).' }, { status: 503 });
  }
  const b = (await req.json().catch(() => ({}))) as { responseId?: unknown };
  if (typeof b.responseId !== 'string') return Response.json({ error: 'Invalid request.' }, { status: 400 });
  const record = await getResponseById(b.responseId);
  if (!record) return Response.json({ error: 'RSVP not found.' }, { status: 404 });
  if (!record.attending) return Response.json({ error: 'This guest declined, so there is no invitation to send.' }, { status: 400 });

  const { token, rollback } = await rotateViewToken(record.id);
  const site = siteOrigin(req);
  const outcome = await sendRsvpEmail(record, { viewUrl: `${site}/invitation/${token}`, qrImageUrl: `${site}/api/qr/${record.qrToken}`, kind: 'link' });
  if (outcome !== 'sent') {
    await rollback();
    return Response.json({ error: 'The email could not be sent. The previous link still works.' }, { status: 502 });
  }
  await markEmailSent(record.id, 'link').catch(() => {});
  return Response.json({ ok: true });
}
