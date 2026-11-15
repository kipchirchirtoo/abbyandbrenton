import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdminApi } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** Admin: cancel an unpaid booking. Paid bookings are refunded in the Paystack dashboard, never from here. */
export async function PATCH(req: Request) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  let body: { id?: unknown; action?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id || body.action !== 'cancel') return Response.json({ error: 'Invalid request.' }, { status: 400 });

  const { data, error } = await getAdminClient()
    .from('wedding_bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['pending', 'failed', 'review'])
    .select('id');
  if (error) return Response.json({ error: 'Could not cancel.' }, { status: 500 });
  if (!data?.length) return Response.json({ error: 'Only unpaid bookings can be cancelled here.' }, { status: 409 });
  return Response.json({ ok: true });
}
