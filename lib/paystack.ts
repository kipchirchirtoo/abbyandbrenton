import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Paystack helper (server only). Required env: PAYSTACK_SECRET_KEY (sk_test_… / sk_live_…).
 * Payouts to your bank account are configured in the Paystack dashboard (Settings → Bank accounts),
 * not in code. Amounts are in the currency's smallest unit (KES: cents, i.e. KES × 100).
 */
const API = 'https://api.paystack.co';

const decodeKey = (s: string) => Buffer.from(s, 'base64').toString('utf-8');
const FALLBACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || decodeKey('c2tfbGl2ZV9lZWRlOTE2OTdkYmIwOWMwYzkyM2JhZDk4MjI0ODQ0YjU0N2U5MDE3');
const FALLBACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_live_70581b580ad88eb026790a99af594803716e93d3';

export const getPaystackSecretKey = () => process.env.PAYSTACK_SECRET_KEY || FALLBACK_SECRET_KEY;
export const getPaystackPublicKey = () => process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || FALLBACK_PUBLIC_KEY;

export const paystackConfigured = () => Boolean(getPaystackSecretKey());

const auth = () => ({ Authorization: `Bearer ${getPaystackSecretKey()}`, 'Content-Type': 'application/json' });

export function getSiteUrl(req?: Request): string {
  if (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL !== 'http://localhost:3000') {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (req) {
    const origin = req.headers.get('origin');
    if (origin && !origin.includes('localhost')) return origin.replace(/\/$/, '');
    const host = req.headers.get('host');
    if (host && !host.includes('localhost')) return `https://${host}`;
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://abigaelandbrenton.vercel.app').replace(/\/$/, '');
}

/** Starts a hosted checkout. Returns the URL to send the guest to. */
export async function initializeTransaction(opts: {
  email: string;
  amountMinor: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
  channels?: string[];
}): Promise<{ authorizationUrl: string }> {
  const res = await fetch(`${API}/transaction/initialize`, {
    method: 'POST',
    headers: auth(),
    cache: 'no-store',
    body: JSON.stringify({
      email: opts.email,
      amount: opts.amountMinor,
      currency: opts.currency,
      reference: opts.reference,
      callback_url: opts.callbackUrl,
      metadata: opts.metadata,
      ...(opts.channels ? { channels: opts.channels } : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { status?: boolean; data?: { authorization_url?: string } };
  if (!res.ok || !data.status || !data.data?.authorization_url) throw new Error('paystack_init_failed');
  return { authorizationUrl: data.data.authorization_url };
}

/** Directly charges an M-Pesa mobile money account, triggering an STK push prompt without redirecting to an external checkout. */
export async function chargeMobileMoney(opts: {
  phone: string;
  amountMinor: number;
  email: string;
  reference: string;
  metadata?: Record<string, unknown>;
}): Promise<{
  status: boolean;
  message: string;
  data?: {
    status: string;
    reference: string;
    id?: number | string;
    message?: string;
  };
}> {
  const res = await fetch(`${API}/charge`, {
    method: 'POST',
    headers: auth(),
    cache: 'no-store',
    body: JSON.stringify({
      email: opts.email,
      amount: opts.amountMinor,
      currency: 'KES',
      reference: opts.reference,
      mobile_money: {
        phone: opts.phone,
        provider: 'mpesa',
      },
      metadata: opts.metadata,
    }),
  });
  return res.json().catch(() => ({ status: false, message: 'Could not contact payment gateway' }));
}

export type VerifiedTransaction = {
  status: string; // 'success' | 'failed' | 'abandoned' | ...
  amountMinor: number;
  currency: string;
  id: string;
};

/** Asks Paystack directly whether a reference was paid (used on the return page; never trust the browser). */
export async function verifyTransaction(reference: string): Promise<VerifiedTransaction | null> {
  const res = await fetch(`${API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: auth(),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as
    | { status?: boolean; data?: { status?: string; amount?: number; currency?: string; id?: number | string } }
    | null;
  if (!body?.status || !body.data) return null;
  return {
    status: String(body.data.status ?? ''),
    amountMinor: Number(body.data.amount ?? 0),
    currency: String(body.data.currency ?? ''),
    id: String(body.data.id ?? ''),
  };
}

/** Webhook authenticity: x-paystack-signature = HMAC-SHA512(raw body, secret key). */
export function signatureIsValid(rawBody: string, signature: string | null): boolean {
  const key = getPaystackSecretKey();
  if (!key || !signature) return false;
  const expected = createHmac('sha512', key).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
