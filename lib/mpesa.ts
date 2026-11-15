import 'server-only';

/**
 * Safaricom Daraja "M-Pesa Express" (STK push) helper.
 * Required env: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY,
 *               MPESA_CALLBACK_SECRET, NEXT_PUBLIC_SITE_URL
 * Optional env: MPESA_ENV (sandbox|production, default sandbox),
 *               MPESA_TRANSACTION_TYPE (CustomerPayBillOnline | CustomerBuyGoodsOnline),
 *               MPESA_PARTY_B (defaults to the shortcode; for a Till, the Till number),
 *               MPESA_ACCOUNT_REFERENCE
 *
 * NOTE: STK push credits a Paybill or Till (a Daraja "shortcode"), NOT a personal phone number.
 */

export function mpesaConfigured(): boolean {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY &&
      process.env.MPESA_CALLBACK_SECRET &&
      process.env.NEXT_PUBLIC_SITE_URL,
  );
}

const baseUrl = () =>
  process.env.MPESA_ENV === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

/** Accepts 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX. Returns 2547XXXXXXXX / 2541XXXXXXXX or null. */
export function normalizeKenyanPhone(input: string): string | null {
  const d = input.replace(/[\s\-()+]/g, '');
  if (/^0[17]\d{8}$/.test(d)) return '254' + d.slice(1);
  if (/^254[17]\d{8}$/.test(d)) return d;
  if (/^[17]\d{8}$/.test(d)) return '254' + d;
  return null;
}

export const maskPhone = (p: string) => `${p.slice(0, 5)}****${p.slice(-3)}`;

let cached: { token: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.expires > Date.now() + 30_000) return cached.token;
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  const res = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('mpesa_auth_failed');
  const data = (await res.json()) as { access_token: string; expires_in: string };
  cached = { token: data.access_token, expires: Date.now() + Number(data.expires_in) * 1000 };
  return cached.token;
}

/** Nairobi time as YYYYMMDDHHmmss. */
function timestamp(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${g('year')}${g('month')}${g('day')}${g('hour')}${g('minute')}${g('second')}`;
}

export async function stkPush(opts: { phone: string; amount: number }) {
  const shortcode = process.env.MPESA_SHORTCODE!;
  const ts = timestamp();
  const password = Buffer.from(`${shortcode}${process.env.MPESA_PASSKEY}${ts}`).toString('base64');
  const site = process.env.NEXT_PUBLIC_SITE_URL!.replace(/\/$/, '');

  const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',
      Amount: opts.amount,
      PartyA: opts.phone,
      PartyB: process.env.MPESA_PARTY_B || shortcode,
      PhoneNumber: opts.phone,
      CallBackURL: `${site}/api/mpesa/callback/${process.env.MPESA_CALLBACK_SECRET}`,
      AccountReference: (process.env.MPESA_ACCOUNT_REFERENCE || 'AbigaelBrenton').slice(0, 12),
      TransactionDesc: 'Wedding gift',
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ResponseCode?: string; CheckoutRequestID?: string; MerchantRequestID?: string; CustomerMessage?: string;
  };
  if (!res.ok || data.ResponseCode !== '0' || !data.CheckoutRequestID) throw new Error('mpesa_stk_failed');
  return { checkoutRequestId: data.CheckoutRequestID, merchantRequestId: data.MerchantRequestID ?? null };
}
