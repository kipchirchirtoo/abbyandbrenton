import { signatureIsValid } from '@/lib/paystack';
import { applyPaystackResult } from '@/lib/bookings';
import { applyPaystackGiftResult } from '@/lib/gifts';

export const dynamic = 'force-dynamic';

/**
 * Paystack calls this URL after a payment (set it in the Paystack dashboard:
 * Settings → API Keys & Webhooks → Webhook URL = https://YOUR-SITE/api/paystack/webhook).
 * The request is only trusted if its HMAC-SHA512 signature matches. The amount is then re-checked
 * against the price the server calculated.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!signatureIsValid(raw, req.headers.get('x-paystack-signature'))) {
    return new Response('Invalid signature', { status: 401 });
  }

  try {
    const event = JSON.parse(raw) as {
      event?: string;
      data?: { reference?: string; status?: string; amount?: number; currency?: string; id?: number | string };
    };
    const d = event.data;
    if (d?.reference && (event.event === 'charge.success' || event.event === 'charge.failed')) {
      const isSuccess = event.event === 'charge.success' && d.status === 'success';
      const result = {
        success: isSuccess,
        amountMinor: Number(d.amount ?? 0),
        currency: String(d.currency ?? ''),
        id: String(d.id ?? ''),
      };

      if (d.reference.startsWith('GF-') || d.reference.startsWith('GIFT-')) {
        await applyPaystackGiftResult(d.reference, result);
      } else {
        await applyPaystackResult(d.reference, result);
      }
    }
  } catch {
    // Acknowledge anyway: a valid signature means it came from Paystack, and retries would not fix a parse error.
  }
  return new Response('ok', { status: 200 });
}
