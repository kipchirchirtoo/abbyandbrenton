/**
 * PayHero Kenya helper for direct M-Pesa STK Push payments.
 * Directly routes funds to the merchant's Till Number or Paybill.
 */

const PAYHERO_API = 'https://backend.payhero.co.ke/api/v2';

// SACCOMPLY / ALLAN PayHero credentials
const FALLBACK_BASIC_AUTH =
  'Basic RVVZZkJob09mb0gwT1ZKQ0pXcGE6VXlNUHNBekVoVWtoOE9oY3d6M1g2aVk1Ym9qOThGa29OcEdNelRwQQ==';
const FALLBACK_CHANNEL_ID = 16023; // Paybill 862862 (BRENTON KIPRUTO)

export function getPayHeroAuth(): string {
  const custom = process.env.PAYHERO_BASIC_AUTH;
  if (custom) {
    return custom.startsWith('Basic ') ? custom : `Basic ${custom}`;
  }
  return FALLBACK_BASIC_AUTH;
}

export function getPayHeroChannelId(): number {
  return Number(process.env.PAYHERO_CHANNEL_ID) || FALLBACK_CHANNEL_ID;
}

export function payheroConfigured(): boolean {
  return Boolean(getPayHeroAuth() && getPayHeroChannelId());
}

export type PayHeroInitiateResult = {
  success: boolean;
  status?: string;
  reference: string;
  message: string;
};

/**
 * Initiates an M-Pesa STK push via PayHero Kenya.
 */
export async function initiatePayHeroStk({
  amount,
  phone,
  reference,
  customerName,
  callbackUrl,
}: {
  amount: number;
  phone: string;
  reference: string;
  customerName?: string;
  callbackUrl?: string;
}): Promise<PayHeroInitiateResult> {
  const auth = getPayHeroAuth();
  const channelId = getPayHeroChannelId();

  // Normalize phone for PayHero (07XXXXXXXX or 2547XXXXXXXX)
  let cleanPhone = phone.replace(/[\s\-()]/g, '');
  if (cleanPhone.startsWith('+254')) {
    cleanPhone = '254' + cleanPhone.slice(4);
  } else if (cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone; // PayHero supports 07XXXXXXXX
  }

  const payload = {
    amount: Math.round(amount),
    phone_number: cleanPhone,
    channel_id: channelId,
    provider: 'm-pesa',
    external_reference: reference,
    customer_name: (customerName || 'Wedding Guest').slice(0, 50),
    callback_url:
      callbackUrl ||
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://abigaelandbrenton.vercel.app'}/api/payhero/callback`,
  };

  const res = await fetch(`${PAYHERO_API}/payments`, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
    cache: 'no-store',
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (res.ok && (data.status === 'Success' || data.success === true || data.status_code === 200 || data.status_code === 201)) {
    return {
      success: true,
      status: 'pending',
      reference,
      message: data.message || 'M-Pesa STK prompt sent to your phone. Please enter your PIN.',
    };
  }

  const errMsg =
    data.error_message ||
    data.message ||
    (data.error_code === 'permission_denied' && data.error_message?.includes('inactive')
      ? 'Payment channel is currently inactive on PayHero. Please activate it in your dashboard.'
      : 'Could not send M-Pesa prompt.');

  return {
    success: false,
    status: 'failed',
    reference,
    message: errMsg,
  };
}

/**
 * Checks transaction status on PayHero for real-time status polling.
 */
export async function verifyPayHeroTransaction(reference: string): Promise<{
  success: boolean;
  status: string;
  receipt?: string;
  amount?: number;
} | null> {
  const auth = getPayHeroAuth();
  try {
    const res = await fetch(`${PAYHERO_API}/transactions?per=10`, {
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data?.transactions || !Array.isArray(data.transactions)) return null;

    const tx = data.transactions.find(
      (t: Record<string, unknown>) =>
        t.external_reference === reference || t.transaction_reference === reference,
    );
    if (!tx) return null;

    const isSuccess =
      tx.transaction_type === 'inbound_payment' ||
      tx.status === 'Success' ||
      tx.status === 'COMPLETED' ||
      Boolean(tx.provider_reference);

    return {
      success: isSuccess,
      status: isSuccess ? 'success' : String(tx.status || 'pending').toLowerCase(),
      receipt: String(tx.provider_reference || tx.transaction_reference || ''),
      amount: Number(tx.amount || 0),
    };
  } catch {
    return null;
  }
}
