import { requireAdminApi } from '@/lib/admin-auth';
import { checkInGuests, getResponseById, undoCheckIn } from '@/lib/rsvp/store';

export const dynamic = 'force-dynamic';

/**
 * Admin only. Checks in a whole invitation ('all') or specific people. Already-checked-in people are never
 * checked in twice: they are returned with their original time so the screen can say "Already checked in".
 */
export async function POST(req: Request) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  const b = (await req.json().catch(() => ({}))) as { responseId?: unknown; guestIds?: unknown; action?: unknown };
  if (typeof b.responseId !== 'string') return Response.json({ error: 'Invalid request.' }, { status: 400 });
  const ids: string[] | 'all' =
    b.guestIds === 'all' ? 'all' : Array.isArray(b.guestIds) && b.guestIds.every((x) => typeof x === 'string') ? (b.guestIds as string[]) : [];
  if (ids !== 'all' && ids.length === 0) return Response.json({ error: 'Choose who to check in.' }, { status: 400 });

  try {
    if (b.action === 'undo') {
      await undoCheckIn(b.responseId, ids);
      return Response.json({ ok: true, record: await getResponseById(b.responseId) });
    }
    const outcome = await checkInGuests(b.responseId, ids, 'admin');
    return Response.json({ ok: true, changed: outcome.changed.length, already: outcome.already, record: await getResponseById(b.responseId) });
  } catch (e) {
    if (e instanceof Error && e.message === 'not_attending') return Response.json({ error: 'This guest declined, so they cannot be checked in.' }, { status: 400 });
    return Response.json({ error: 'Check-in failed. Please try again.' }, { status: 500 });
  }
}
