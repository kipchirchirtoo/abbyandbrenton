import { timingSafeEqual } from 'node:crypto';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type Item = { Name: string; Value?: string | number };

/**
 * Safaricom calls this URL with the payment result. It carries no signature, so the URL itself contains a
 * secret (MPESA_CALLBACK_SECRET). Only pending gifts that we created ourselves can be updated.
 */
export async function POST(req: Request, ctx: { params: Promise<{ secret: string }> }) {
  const { secret } = await ctx.params;
  const expected = process.env.MPESA_CALLBACK_SECRET ?? '';
  const a = Buffer.from(secret);
  const b = Buffer.from(expected);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const ok = Response.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  try {
    const body = await req.json();
    const cb = body?.Body?.stkCallback;
    const id = typeof cb?.CheckoutRequestID === 'string' ? cb.CheckoutRequestID : null;
    if (!id) return ok;

    const code = Number(cb.ResultCode);
    const items: Item[] = cb.CallbackMetadata?.Item ?? [];
    const receipt = items.find((i) => i.Name === 'MpesaReceiptNumber')?.Value;
    const status = code === 0 ? 'success' : code === 1032 ? 'cancelled' : 'failed';

    await getAdminClient()
      .from('wedding_gifts')
      .update({
        status,
        mpesa_receipt: receipt ? String(receipt).slice(0, 30) : null,
        result_desc: typeof cb.ResultDesc === 'string' ? cb.ResultDesc.slice(0, 200) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('checkout_request_id', id)
      .eq('status', 'pending');
  } catch {
    // Always acknowledge so Safaricom does not retry endlessly.
  }
  return ok;
}
