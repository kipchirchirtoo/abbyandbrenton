import { requireAdminApi } from '@/lib/admin-auth';
import { setRsvpMode } from '@/lib/rsvp/state';

export const dynamic = 'force-dynamic';

/** Admin: 'auto' follows the deadline; 'open' reopens RSVPs after it; 'closed' closes them immediately. */
export async function POST(req: Request) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  const b = (await req.json().catch(() => ({}))) as { mode?: unknown };
  if (b.mode !== 'auto' && b.mode !== 'open' && b.mode !== 'closed') return Response.json({ error: 'Invalid mode.' }, { status: 400 });
  try {
    await setRsvpMode(b.mode);
    return Response.json({ ok: true, mode: b.mode });
  } catch {
    return Response.json({ error: 'Could not update the setting.' }, { status: 500 });
  }
}
