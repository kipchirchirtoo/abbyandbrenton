import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const response = (payload.response && typeof payload.response === 'object'
    ? payload.response
    : payload) as Record<string, unknown>;

  const externalRef = String(response.ExternalReference || payload.external_reference || '');
  const receipt = String(response.MpesaReceiptNumber || payload.mpesa_receipt || '');
  const statusStr = String(response.Status || payload.status || '').toLowerCase();
  const resultCode = Number(response.ResultCode ?? payload.result_code);
  const resultDesc = String(response.ResultDesc || payload.result_desc || 'PayHero M-Pesa transaction');

  if (!externalRef) {
    return Response.json({ ok: true, message: 'No reference' });
  }

  const db = getAdminClient();
  const isSuccess = statusStr === 'success' || resultCode === 0;

  if (isSuccess) {
    await db
      .from('wedding_gifts')
      .update({
        status: 'success',
        mpesa_receipt: receipt || externalRef,
        result_desc: resultDesc,
        updated_at: new Date().toISOString(),
      })
      .eq('checkout_request_id', externalRef);
  } else {
    await db
      .from('wedding_gifts')
      .update({
        status: 'failed',
        result_desc: resultDesc,
        updated_at: new Date().toISOString(),
      })
      .eq('checkout_request_id', externalRef);
  }

  return Response.json({ status: 'success', received: true });
}
