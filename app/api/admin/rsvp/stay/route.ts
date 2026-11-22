import { requireAdminApi } from '@/lib/admin-auth';
import { setStayStatus } from '@/lib/rsvp/store';

export const dynamic = 'force-dynamic';

/** Admin: confirm, decline or cancel an accommodation request (or put it back to pending). */
export async function POST(req: Request) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  const b = (await req.json().catch(() => ({}))) as { responseId?: unknown; status?: unknown };
  const allowed = ['pending', 'confirmed', 'declined', 'cancelled'];
  if (typeof b.responseId !== 'string' || typeof b.status !== 'string' || !allowed.includes(b.status)) {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  try {
    await setStayStatus(b.responseId, b.status as 'pending' | 'confirmed' | 'declined' | 'cancelled');
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Could not update the accommodation request.' }, { status: 500 });
  }
}
