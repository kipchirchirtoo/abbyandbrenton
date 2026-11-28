'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { gift } from '@/lib/content';

const QUICK_AMOUNTS = [1000, 2500, 5000, 10000, 25000];
const FALLBACK_PUBLIC_KEY = 'pk_live_70581b580ad88eb026790a99af594803716e93d3';

type Props = {
  stkEnabled: boolean;
  paystackEnabled: boolean;
  defaultName?: string;
  verifiedGift?: { amount: number; giverName: string; receipt: string } | null;
};

// Declares PaystackPop on window
declare global {
  interface Window {
    PaystackPop?: {
      setup: (opts: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref: string;
        channels?: string[];
        metadata?: Record<string, unknown>;
        onClose?: () => void;
        callback?: (response: { reference: string; status: string }) => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

export default function GiftForm({
  defaultName = '',
  verifiedGift: initialVerifiedGift,
}: Props) {
  // Method: 'mpesa' (STK push) or 'card' (Paystack Card/Apple Pay)
  const [method, setMethod] = useState<'mpesa' | 'card'>('mpesa');

  // Input fields
  const [copiedPaybill, setCopiedPaybill] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('1000');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Flow states: 'form' | 'waiting_pin' | 'success'
  const [flowState, setFlowState] = useState<'form' | 'waiting_pin' | 'success'>(
    initialVerifiedGift ? 'success' : 'form',
  );
  const [activeReference, setActiveReference] = useState('');
  const [verifiedGift, setVerifiedGift] = useState<{ amount: number; giverName: string; receipt: string } | null>(
    initialVerifiedGift ?? null,
  );

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pollCount, setPollCount] = useState(0);

  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling interval
  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  // Copies text to clipboard
  async function copyText(text: string, type: 'paybill' | 'account' | 'phone') {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'paybill') {
        setCopiedPaybill(true);
        setTimeout(() => setCopiedPaybill(false), 2000);
      } else if (type === 'account') {
        setCopiedAccount(true);
        setTimeout(() => setCopiedAccount(false), 2000);
      } else {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      }
    } catch {}
  }

  // Polls internal endpoint for M-Pesa PIN confirmation
  async function checkPaymentStatus(ref: string) {
    try {
      const res = await fetch(`/api/gifts/status?reference=${encodeURIComponent(ref)}`);
      const data = await res.json().catch(() => null);

      if (data && data.status === 'success') {
        if (pollInterval.current) clearInterval(pollInterval.current);
        setVerifiedGift({
          amount: Number(data.amount || amount),
          giverName: data.giverName || name || 'Generous Friend',
          receipt: data.receipt || ref,
        });
        setFlowState('success');
        setBusy(false);
        return true;
      }

      if (data && data.status === 'failed') {
        if (pollInterval.current) clearInterval(pollInterval.current);
        setBusy(false);
        setErrorMsg('Payment was not completed or was cancelled. Please try again or use the manual number.');
        setFlowState('form');
        return true;
      }
    } catch {}
    return false;
  }

  // Start internal polling when waiting for M-Pesa PIN
  function startPolling(ref: string) {
    if (pollInterval.current) clearInterval(pollInterval.current);
    setPollCount(0);

    let count = 0;
    pollInterval.current = setInterval(async () => {
      count++;
      setPollCount(count);
      const done = await checkPaymentStatus(ref);
      if (done || count >= 30) { // ~90 seconds
        if (pollInterval.current) clearInterval(pollInterval.current);
        if (!done && count >= 30) {
          setBusy(false);
          setErrorMsg('We have not received PIN confirmation yet. If money was deducted, please call us to confirm.');
        }
      }
    }, 3000);
  }

  // Handle Internal M-Pesa STK Push Submit (Zero External Redirects!)
  async function handleMpesaSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setBusy(true);

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 10) {
      setErrorMsg('Please enter a valid gift amount (at least KES 10).');
      setBusy(false);
      return;
    }

    if (!phone || phone.replace(/\D/g, '').length < 9) {
      setErrorMsg('Please enter a valid Safaricom number (e.g. 0712 345 678).');
      setBusy(false);
      return;
    }

    try {
      const res = await fetch('/api/gifts/paystack/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          phone,
          name,
          email,
          notes,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.message || 'Could not send M-Pesa prompt. Please try again.');
      }

      setActiveReference(data.reference);

      // If it already succeeded immediately (e.g. test payment with 0710000000)
      if (data.status === 'success') {
        setVerifiedGift({
          amount: amt,
          giverName: name || 'Generous Friend',
          receipt: data.reference,
        });
        setFlowState('success');
        setBusy(false);
        return;
      }

      // Otherwise, transition smoothly to the internal M-Pesa waiting screen
      setFlowState('waiting_pin');
      startPolling(data.reference);
    } catch (err) {
      setBusy(false);
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  // Handle Internal Card / Apple Pay via Paystack Inline Popup (Never leaves the website!)
  async function handleCardSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setBusy(true);

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 10) {
      setErrorMsg('Please enter a valid gift amount (at least KES 10).');
      setBusy(false);
      return;
    }

    const cardEmail = email.trim() || `${phone.replace(/\D/g, '') || 'guest'}@abigaelandbrenton.com`;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cardEmail)) {
      setErrorMsg('Please provide a valid email address for your payment receipt.');
      setBusy(false);
      return;
    }

    // Ensure Paystack Inline script is loaded
    function openPopup() {
      if (!window.PaystackPop) {
        setErrorMsg('Paystack inline checkout is loading. Please click again in a moment.');
        setBusy(false);
        return;
      }

      const ref = `GF-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const pubKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || FALLBACK_PUBLIC_KEY;

      const handler = window.PaystackPop.setup({
        key: pubKey,
        email: cardEmail,
        amount: amt * 100, // cents
        currency: 'KES',
        ref: ref,
        channels: ['card', 'apple_pay'],
        metadata: {
          custom_fields: [
            { display_name: 'Giver Name', variable_name: 'giver_name', value: name || 'Friend' },
            { display_name: 'Blessing Note', variable_name: 'notes', value: notes || '' },
          ],
        },
        onClose: () => {
          setBusy(false);
        },
        callback: async (response) => {
          setBusy(true);
          // Verify with internal status endpoint
          await checkPaymentStatus(response.reference);
        },
      });

      handler.openIframe();
    }

    if (!window.PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => openPopup();
      script.onerror = () => {
        setErrorMsg('Could not load checkout. Please try again.');
        setBusy(false);
      };
      document.body.appendChild(script);
    } else {
      openPopup();
    }
  }

  // ---------- VIEW 1: Celebratory Thank-You Screen (Success) ----------
  if (flowState === 'success' && verifiedGift) {
    return (
      <div className="thanks-box" style={{ maxWidth: '640px', padding: '40px 30px' }}>
        <p className="script" style={{ fontSize: '3.4rem', marginBottom: '8px', color: 'var(--gold)' }}>
          Thank you so much!
        </p>
        <p className="lead" style={{ color: 'var(--ink)', fontSize: '1.2rem', fontWeight: 400 }}>
          {verifiedGift.giverName ? `Dear ${verifiedGift.giverName}, ` : ''}Your wedding gift of{' '}
          <strong style={{ color: 'var(--sage-d)', fontSize: '1.4rem' }}>
            KES {verifiedGift.amount.toLocaleString('en-KE')}
          </strong>{' '}
          has been received with our heartfelt gratitude and love. ❤️
        </p>
        <div style={{ margin: '22px auto', padding: '14px 22px', background: 'rgba(255,255,255,0.7)', borderRadius: '4px', border: '1px solid #eadfc9', display: 'inline-block' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
            Payment Reference: <code style={{ fontWeight: 600, color: 'var(--ink)' }}>{verifiedGift.receipt}</code>
          </p>
        </div>
        <div className="btn-row" style={{ marginTop: '26px', display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn solid" href="/">Back to Wedding Site</Link>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setFlowState('form');
              setVerifiedGift(null);
              setAmount('1000');
            }}
          >
            Send Another Gift
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gift-grid">
      {/* Left Card: Send Directly with M-Pesa Paybill or Phone */}
      <div className="gift-card manual">
        <p className="eyebrow">Lipa na M-Pesa (Paybill)</p>

        <div style={{ margin: '14px 0 16px', padding: '16px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.18)' }}>
          <p style={{ margin: 0, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#f1dfae' }}>Paybill Business No</p>
          <p style={{ margin: '2px 0 10px', fontSize: '2.2rem', fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", letterSpacing: '0.04em', color: '#fff' }}>
            {gift.paybill}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', textAlign: 'left', fontSize: '0.88rem', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '10px' }}>
            <div>
              <span style={{ color: '#dcd6c2', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block' }}>Business Name</span>
              <strong style={{ color: '#fff' }}>{gift.businessName}</strong>
            </div>
            <div>
              <span style={{ color: '#dcd6c2', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block' }}>Account Number</span>
              <strong style={{ color: '#f1dfae', fontFamily: 'monospace', fontSize: '1.05rem', letterSpacing: '0.05em' }}>{gift.accountNumber}</strong>
            </div>
            <div>
              <span style={{ color: '#dcd6c2', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block' }}>Account Name</span>
              <strong style={{ color: '#fff' }}>{gift.accountName}</strong>
            </div>
          </div>
        </div>

        <p className="hint" style={{ fontSize: '0.82rem', lineHeight: 1.5, margin: '10px 0 16px', color: '#e5ded0' }}>
          Open M-Pesa → Lipa na M-Pesa → Paybill → Business <strong>{gift.paybill}</strong> → Account <strong>{gift.accountNumber}</strong>.
        </p>

        <div className="gift-actions" style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn" type="button" onClick={() => copyText(gift.paybill, 'paybill')}>
            {copiedPaybill ? 'Copied Paybill ✓' : 'Copy Paybill'}
          </button>
          <button className="btn" type="button" onClick={() => copyText(gift.accountNumber, 'account')}>
            {copiedAccount ? 'Copied Acc No ✓' : 'Copy Acc No'}
          </button>
        </div>

        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.14)', fontSize: '0.82rem', color: '#dcd6c2' }}>
          <span>Or send directly via Send Money: </span>
          <strong style={{ color: '#fff' }}>{gift.mpesaDisplay}</strong>
          <div style={{ marginTop: '8px', display: 'flex', gap: '6px', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => copyText(gift.mpesaNumber, 'phone')}
            >
              {copiedPhone ? 'Copied ✓' : 'Copy Phone'}
            </button>
            <a
              className="btn"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              href={`tel:${gift.mpesaNumber}`}
            >
              Call to Confirm
            </a>
          </div>
        </div>
      </div>

      {/* Right Card: The Internal Checkout (100% In-Site, Matching UI/UX) */}
      <div className="gift-card stk" style={{ position: 'relative' }}>
        {flowState === 'waiting_pin' ? (
          /* ---------- VIEW 2: Internal Live M-Pesa STK Waiting Screen ---------- */
          <div className="internal-stk-waiting">
            <div className="pulse-phone-wrap">
              <span className="pulse-phone-icon">📱</span>
            </div>

            <p className="eyebrow" style={{ color: 'var(--sage-d)', marginBottom: '4px' }}>M-Pesa STK Prompt Sent</p>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2.1rem', margin: '4px 0 12px' }}>
              Check Your Phone Screen
            </h3>

            <div style={{ background: '#fff', border: '1px solid #eadfc9', borderRadius: '4px', padding: '12px 16px', margin: '14px 0', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--muted)', display: 'block' }}>Amount</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--sage-d)' }}>KES {Number(amount).toLocaleString('en-KE')}</strong>
              </div>
              <div style={{ width: '1px', height: '30px', background: '#eadfc9' }} />
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--muted)', display: 'block' }}>Target Phone</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>{phone}</strong>
              </div>
            </div>

            <div className="stk-steps-box">
              <ol>
                <li>Check your phone right now (an M-Pesa prompt will pop up on your screen).</li>
                <li>
                  Verify recipient: <strong>LIPWA SOLUTIONS</strong> for account <strong>BRENTON KIPRUTO</strong> (Paybill <strong>{gift.paybill}</strong>, Acc <strong>{gift.accountNumber}</strong>).
                </li>
                <li>Enter your <strong>M-Pesa PIN</strong> and press <strong>OK</strong>.</li>
              </ol>
            </div>

            <div className="stk-live-pulse">
              <span className="live-dot" />
              <span>Awaiting PIN confirmation from Safaricom…</span>
            </div>

            <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn solid"
                style={{ width: '100%', padding: '12px' }}
                onClick={() => checkPaymentStatus(activeReference)}
              >
                I&apos;ve Entered My PIN / Refresh Status
              </button>
              <button
                type="button"
                className="btn"
                style={{ width: '100%', border: 'none', background: 'transparent', color: 'var(--muted)', fontSize: '0.85rem' }}
                onClick={() => {
                  if (pollInterval.current) clearInterval(pollInterval.current);
                  setFlowState('form');
                  setBusy(false);
                }}
              >
                Cancel / Change Phone Number
              </button>
            </div>
          </div>
        ) : (
          /* ---------- VIEW 3: Internal Input Form ---------- */
          <form onSubmit={method === 'mpesa' ? handleMpesaSubmit : handleCardSubmit}>
            <p className="eyebrow" style={{ margin: '0 0 6px' }}>
              {method === 'mpesa' ? 'Get an M-Pesa prompt on your phone' : 'Pay with Card or Apple Pay'}
            </p>

            {/* Payment Method Switcher */}
            <div style={{ display: 'flex', gap: '8px', margin: '8px 0 16px' }}>
              <button
                type="button"
                style={{
                  padding: '7px 15px',
                  borderRadius: '20px',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  border: method === 'mpesa' ? '1px solid var(--sage-d)' : '1px solid #d8ccb3',
                  background: method === 'mpesa' ? 'var(--sage-d)' : '#fff',
                  color: method === 'mpesa' ? '#fff' : 'var(--ink)',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
                onClick={() => setMethod('mpesa')}
              >
                📱 M-Pesa STK Prompt
              </button>
              <button
                type="button"
                style={{
                  padding: '7px 15px',
                  borderRadius: '20px',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  border: method === 'card' ? '1px solid var(--sage-d)' : '1px solid #d8ccb3',
                  background: method === 'card' ? 'var(--sage-d)' : '#fff',
                  color: method === 'card' ? '#fff' : 'var(--ink)',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
                onClick={() => setMethod('card')}
              >
                💳 Card / Apple Pay
              </button>
            </div>

            {/* Inputs */}
            <label htmlFor="gname">Your name</label>
            <input
              id="gname"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Allan"
            />

            {method === 'mpesa' ? (
              <>
                <label htmlFor="gphone">Your Safaricom number *</label>
                <input
                  id="gphone"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  required
                />
                <small className="hint left" style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                  An instant prompt will pop up on your phone from <strong>LIPWA SOLUTIONS</strong> (Account: <strong>BRENTON KIPRUTO</strong>) to enter your M-Pesa PIN.
                </small>
              </>
            ) : (
              <>
                <label htmlFor="gemail">Your Email Address *</label>
                <input
                  id="gemail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="For your payment receipt"
                  required
                />
              </>
            )}

            <label htmlFor="gamt">Amount (KES) *</label>
            <input
              id="gamt"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              required
            />

            <div className="quick">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  type="button"
                  key={q}
                  className={amount === String(q) ? 'on' : ''}
                  onClick={() => setAmount(String(q))}
                >
                  {q.toLocaleString('en-KE')}
                </button>
              ))}
            </div>

            <label htmlFor="gnotes">A Warm Wish for the Couple (Optional)</label>
            <textarea
              id="gnotes"
              value={notes}
              maxLength={300}
              rows={2}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Leave a blessing or congratulatory message..."
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d8ccb3', background: '#fff', font: 'inherit', borderRadius: '2px', resize: 'vertical' }}
            />

            {errorMsg && (
              <p
                className="form-error"
                style={{
                  padding: '10px 14px',
                  borderRadius: '4px',
                  fontSize: '0.88rem',
                  margin: '12px 0',
                  background: '#ffeef0',
                  color: '#a02334',
                  border: '1px solid #f5c2c7',
                }}
                role="status"
              >
                {errorMsg}
              </p>
            )}

            <button
              className="btn solid"
              type="submit"
              disabled={busy}
              style={{ width: '100%', marginTop: '12px', padding: '14px', fontSize: '1.02rem' }}
            >
              {busy
                ? 'Sending STK Prompt to Phone…'
                : method === 'mpesa'
                  ? `Send M-Pesa STK Prompt (KES ${Number(amount || 0).toLocaleString('en-KE')})`
                  : `Pay with Card / Apple Pay (KES ${Number(amount || 0).toLocaleString('en-KE')})`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
