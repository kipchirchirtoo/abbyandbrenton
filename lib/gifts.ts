import 'server-only';
import { randomBytes } from 'node:crypto';
import { getAdminClient } from '@/lib/supabase/admin';
import { initializeTransaction, getSiteUrl, chargeMobileMoney } from '@/lib/paystack';

export type WeddingGiftRow = {
  id: string;
  checkout_request_id: string;
  merchant_request_id: string | null;
  amount: number;
  phone_masked: string;
  giver_name: string | null;
  guest_id: string | null;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  mpesa_receipt: string | null;
  result_desc: string | null;
  created_at: string;
  updated_at: string;
};

/** Generates a human-friendly unique gift reference that also acts as Paystack transaction reference. */
export const newGiftReference = () => `GF-${randomBytes(6).toString('hex').toUpperCase()}`;

export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

/** Masks a phone number (e.g. 254712345678 -> 2547****5678) */
export function maskPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 7) return 'Card / Paystack';
  const head = clean.slice(0, 4);
  const tail = clean.slice(-4);
  return `${head}****${tail}`;
}

export type CreateGiftInput = {
  amount: number;
  email?: string;
  name?: string;
  phone?: string;
  notes?: string;
  guestId?: string | null;
  channel?: 'mobile_money' | 'card' | 'all';
};

/**
 * Creates a pending gift record in the database and initializes a Paystack hosted transaction.
 */
export async function createPaystackGift(
  opts: CreateGiftInput,
  siteUrl?: string,
): Promise<{ authorizationUrl: string; reference: string }> {
  const amount = Math.round(Number(opts.amount));
  if (!Number.isFinite(amount) || amount < 10) {
    throw new Error('Please enter a valid gift amount (minimum KES 10).');
  }

  const cleanPhone = (opts.phone || '').replace(/\D/g, '');
  const email = (opts.email || '').trim().toLowerCase() || `${cleanPhone || 'guest'}@abigaelandbrenton.com`;
  if (!EMAIL_RE.test(email)) {
    throw new Error('Please enter a valid email address.');
  }

  const site = (siteUrl || getSiteUrl()).replace(/\/$/, '');

  const reference = newGiftReference();
  const db = getAdminClient();

  const phoneMasked = opts.phone && opts.phone.trim() ? maskPhone(opts.phone) : 'Card / Paystack';
  const giverName = (opts.name || '').trim().slice(0, 80) || null;
  const resultDesc = (opts.notes || '').trim().slice(0, 300) || 'Wedding gift via Paystack';

  const { error: insertError } = await db.from('wedding_gifts').insert({
    checkout_request_id: reference,
    merchant_request_id: 'paystack',
    amount,
    phone_masked: phoneMasked,
    giver_name: giverName,
    guest_id: opts.guestId || null,
    status: 'pending',
    result_desc: resultDesc,
  });

  if (insertError) {
    throw new Error('We could not initiate your gift. Please try again.');
  }

  try {
    const channels =
      opts.channel === 'mobile_money'
        ? ['mobile_money']
        : opts.channel === 'card'
          ? ['card']
          : ['mobile_money', 'card'];

    const { authorizationUrl } = await initializeTransaction({
      email,
      amountMinor: amount * 100, // Paystack expects cents
      currency: 'KES',
      reference,
      callbackUrl: `${site}/gift?reference=${reference}`,
      channels,
      metadata: {
        type: 'wedding_gift',
        giver_name: giverName,
        phone: opts.phone || undefined,
        notes: resultDesc,
        custom_fields: opts.phone
          ? [{ display_name: 'Mobile Number', variable_name: 'phone', value: opts.phone }]
          : undefined,
      },
    });

    return { authorizationUrl, reference };
  } catch (err) {
    await db
      .from('wedding_gifts')
      .update({
        status: 'failed',
        result_desc: 'Could not connect to Paystack gateway.',
        updated_at: new Date().toISOString(),
      })
      .eq('checkout_request_id', reference);

    throw new Error('Could not start Paystack checkout. Please try again in a moment.');
  }
}

/**
 * Applies payment verification result from Paystack (via return URL or webhook).
 * Idempotent.
 */
export async function applyPaystackGiftResult(
  reference: string,
  result: { success: boolean; amountMinor: number; currency: string; id: string },
): Promise<'success' | 'failed' | 'ignored'> {
  const db = getAdminClient();
  const { data: gift } = await db
    .from('wedding_gifts')
    .select('*')
    .eq('checkout_request_id', reference)
    .maybeSingle<WeddingGiftRow>();

  if (!gift) return 'ignored';
  if (gift.status === 'success') return 'success';

  const now = new Date().toISOString();

  if (!result.success) {
    if (gift.status === 'pending') {
      await db
        .from('wedding_gifts')
        .update({ status: 'failed', updated_at: now })
        .eq('checkout_request_id', reference)
        .eq('status', 'pending');
    }
    return 'failed';
  }

  const expectedMinor = gift.amount * 100;
  if (result.amountMinor !== expectedMinor || (result.currency && result.currency !== 'KES')) {
    await db
      .from('wedding_gifts')
      .update({
        status: 'failed',
        result_desc: `Amount mismatch: expected KES ${gift.amount}, received ${result.currency} ${result.amountMinor / 100}`,
        mpesa_receipt: result.id,
        updated_at: now,
      })
      .eq('checkout_request_id', reference);
    return 'failed';
  }

  await db
    .from('wedding_gifts')
    .update({
      status: 'success',
      mpesa_receipt: result.id,
      updated_at: now,
    })
    .eq('checkout_request_id', reference)
    .neq('status', 'success');

  return 'success';
}

/** Fetches a gift row by reference. */
export async function getGiftByReference(reference: string): Promise<WeddingGiftRow | null> {
  const db = getAdminClient();
  const { data } = await db
    .from('wedding_gifts')
    .select('*')
    .eq('checkout_request_id', reference)
    .maybeSingle<WeddingGiftRow>();
  return data;
}

/**
 * Initiates an internal M-Pesa STK push via Paystack directly without external redirect.
 */
export async function chargePaystackMpesaGift(opts: {
  amount: number;
  phone: string;
  name?: string;
  email?: string;
  notes?: string;
  guestId?: string | null;
}): Promise<{
  ok: boolean;
  reference: string;
  status: 'success' | 'pending' | 'failed';
  message: string;
}> {
  const amount = Math.round(Number(opts.amount));
  if (!Number.isFinite(amount) || amount < 10) {
    throw new Error('Please enter a valid gift amount (minimum KES 10).');
  }

  // Format phone to international +254...
  let raw = opts.phone.replace(/[\s\-()]/g, '');
  let formattedPhone = raw;
  if (/^0[17]\d{8}$/.test(raw)) {
    formattedPhone = '+254' + raw.slice(1);
  } else if (/^254[17]\d{8}$/.test(raw)) {
    formattedPhone = '+' + raw;
  } else if (/^\+254[17]\d{8}$/.test(raw)) {
    formattedPhone = raw;
  } else if (raw === '0710000000' || raw === '254710000000' || raw === '+254710000000') {
    formattedPhone = '+254710000000';
  } else {
    formattedPhone = raw.startsWith('+') ? raw : (raw.startsWith('254') ? '+' + raw : '+254' + raw.replace(/^0+/, ''));
  }

  const cleanDigits = formattedPhone.replace(/\D/g, '');
  const email = (opts.email || '').trim().toLowerCase() || `${cleanDigits || 'guest'}@abigaelandbrenton.com`;

  const reference = newGiftReference();
  const db = getAdminClient();
  const giverName = (opts.name || '').trim().slice(0, 80) || null;
  const resultDesc = (opts.notes || '').trim().slice(0, 300) || 'Wedding gift via M-Pesa';

  const { error: insertError } = await db.from('wedding_gifts').insert({
    checkout_request_id: reference,
    merchant_request_id: 'paystack',
    amount,
    phone_masked: maskPhone(formattedPhone),
    giver_name: giverName,
    guest_id: opts.guestId || null,
    status: 'pending',
    result_desc: resultDesc,
  });

  if (insertError) {
    throw new Error('We could not save your gift request. Please try again.');
  }

  const chargeResult = await chargeMobileMoney({
    phone: formattedPhone,
    amountMinor: amount * 100,
    email,
    reference,
    metadata: {
      type: 'wedding_gift',
      giver_name: giverName,
      phone: formattedPhone,
      notes: resultDesc,
    },
  });

  // If charge succeeded right away (or test payment with test number)
  if (chargeResult.status && chargeResult.data?.status === 'success') {
    await db
      .from('wedding_gifts')
      .update({
        status: 'success',
        mpesa_receipt: String(chargeResult.data.id || reference),
        updated_at: new Date().toISOString(),
      })
      .eq('checkout_request_id', reference);

    return {
      ok: true,
      reference,
      status: 'success',
      message: 'Gift received! Thank you so much. ❤️',
    };
  }

  // If prompt was dispatched to phone and waiting for PIN (pay_offline or pending or timeout)
  if (chargeResult.status || chargeResult.data?.status === 'pay_offline' || chargeResult.data?.status === 'pending') {
    return {
      ok: true,
      reference,
      status: 'pending',
      message: chargeResult.data?.message || 'M-Pesa STK prompt sent to your phone. Please enter your PIN to complete.',
    };
  }

  // If test mode declined because of real number:
  if (chargeResult.data?.message?.includes('test mobile money number')) {
    await db.from('wedding_gifts').update({ status: 'failed', result_desc: 'Test mode requires test number 0710000000' }).eq('checkout_request_id', reference);
    return {
      ok: false,
      reference,
      status: 'failed',
      message: 'Paystack is in Test Mode: use test number 0710 000 000 to test, or toggle to Live Mode in your Paystack dashboard for real phone prompts.',
    };
  }

  const failMsg = chargeResult.message || chargeResult.data?.message || 'Could not send M-Pesa prompt.';
  await db.from('wedding_gifts').update({ status: 'failed', result_desc: failMsg }).eq('checkout_request_id', reference);
  return {
    ok: false,
    reference,
    status: 'failed',
    message: failMsg,
  };
}
