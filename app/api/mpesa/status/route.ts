import { getAdminClient } from '@/lib/supabase/admin';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** Lets the gift page poll the result of its own prompt. Returns only a status string. */
export async function GET(req: Request) {
  if (!rateLimit(`stk-status:${clientIp(req)}`, 60, 5 * 60_000)) {
    return Response.json({ status: 'pending' }, { status: 429 });
  }
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^[A-Za-z0-9_\-]{10,60}$/.test(id)) return Response.json({ status: 'unknown' }, { status: 400 });
  const { data } = await getAdminClient()
    .from('wedding_gifts')
    .select('status')
    .eq('checkout_request_id', id)
    .maybeSingle();
  return Response.json({ status: data?.status ?? 'unknown' });
}
