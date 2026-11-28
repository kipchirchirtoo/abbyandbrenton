import { getGiftByReference, applyPaystackGiftResult } from '@/lib/gifts';
import { verifyTransaction, paystackConfigured } from '@/lib/paystack';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ref = url.searchParams.get('reference');
  if (!ref || !ref.startsWith('GF-')) {
    return Response.json({ error: 'Invalid reference' }, { status: 400 });
  }

  let gift = await getGiftByReference(ref);
  if (!gift) {
    return Response.json({ error: 'Gift not found' }, { status: 404 });
  }

  if (gift.status === 'pending' && paystackConfigured()) {
    const v = await verifyTransaction(ref).catch(() => null);
    if (v && v.status === 'success') {
      await applyPaystackGiftResult(ref, {
        success: true,
        amountMinor: v.amountMinor,
        currency: v.currency,
        id: v.id,
      });
      gift = (await getGiftByReference(ref)) ?? gift;
    }
  }

  return Response.json({
    status: gift.status,
    amount: gift.amount,
    giverName: gift.giver_name || 'Generous Friend',
    receipt: gift.mpesa_receipt || gift.checkout_request_id,
  });
}
