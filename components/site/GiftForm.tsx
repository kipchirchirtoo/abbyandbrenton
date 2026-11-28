'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { gift } from '@/lib/content';

const QUICK_AMOUNTS = [1000, 2500, 5000, 10000, 25000];

type Props = {
  stkEnabled: boolean;
  paystackEnabled: boolean;
  defaultName?: string;
  verifiedGift?: { amount: number; giverName: string; receipt: string } | null;
};

export default function GiftForm({
  stkEnabled,
  paystackEnabled,
  defaultName = '',
  verifiedGift,
}: Props) {
  // Method: 'mpesa' (STK push) or 'card' (Paystack Card/Apple Pay)
  const [method, setMethod] = useState<'mpesa' | 'card'>('mpesa');

  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('1000');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (poll.current) clearInterval(poll.current);
    };
  }, []);

  async function copyMpesa() {
    try {
      await navigator.clipboard.writeText(gift.mpesaNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setIsError(false);
    setStatusMsg('');
    setBusy(true);

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 10) {
      setIsError(true);
      setStatusMsg('Please enter a valid gift amount (at least KES 10).');
      setBusy(false);
      return;
    }

    // 1. If method is card, or if Daraja is not configured: use Paystack
    if (method === 'card' || !stkEnabled) {
      try {
        const res = await fetch('/api/gifts/paystack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amt,
            phone,
            name,
            email,
            notes,
            channel: method === 'mpesa' ? 'mobile_money' : 'card',
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) {
          throw new Error(data.error || 'Could not initiate payment. Please try sending directly to the M-Pesa number.');
        }

        setStatusMsg(method === 'mpesa' ? 'Connecting to M-Pesa STK push…' : 'Connecting to secure checkout…');
        window.location.href = data.url;
      } catch (err) {
        setIsError(true);
        setStatusMsg(err instanceof Error ? err.message : 'Something went wrong. Please try the direct M-Pesa number.');
        setBusy(false);
      }
      return;
    }

    // 2. If M-Pesa and Daraja STK is enabled: use Daraja STK Push
    try {
      const res = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, amount: amt, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not start the M-Pesa prompt.');

      setStatusMsg('Check your phone and enter your M-Pesa PIN to complete the gift.');
      let tries = 0;
      poll.current = setInterval(async () => {
        tries++;
        const r = await fetch(`/api/mpesa/status?id=${encodeURIComponent(data.id)}`).then((x) => x.json()).catch(() => null);
        if (r?.status === 'success') {
          if (poll.current) clearInterval(poll.current);
          setBusy(false);
          setStatusMsg('SUCCESS');
        } else if (r?.status === 'failed' || r?.status === 'cancelled') {
          if (poll.current) clearInterval(poll.current);
          setBusy(false);
          setIsError(true);
          setStatusMsg(r.status === 'cancelled' ? 'The prompt was cancelled. You can try again.' : 'The payment did not go through. You can try again.');
        } else if (tries > 24) {
          if (poll.current) clearInterval(poll.current);
          setBusy(false);
          setIsError(true);
          setStatusMsg('We have not received a confirmation yet. If money left your account, please call us to confirm.');
        }
      }, 5000);
    } catch (err) {
      setBusy(false);
      setIsError(true);
      setStatusMsg(err instanceof Error ? err.message : 'Could not start M-Pesa prompt. Please send directly to the number on the left.');
    }
  }

  // Celebratory thank-you screen if returning from successful payment
  if (verifiedGift || statusMsg === 'SUCCESS') {
    return (
      <div className="thanks-box" style={{ maxWidth: '640px', padding: '40px 30px' }}>
        <p className="script" style={{ fontSize: '3.2rem', marginBottom: '8px' }}>Thank you so much!</p>
        <p className="lead" style={{ color: 'var(--ink)', fontSize: '1.2rem', fontWeight: 400 }}>
          {verifiedGift?.giverName ? `Dear ${verifiedGift.giverName}, ` : ''}Your wedding gift of{' '}
          <strong style={{ color: 'var(--sage-d)' }}>
            KES {Number(verifiedGift?.amount || amount).toLocaleString('en-KE')}
          </strong>{' '}
          has been received with our deepest gratitude and love. ❤️
        </p>
        {verifiedGift?.receipt && (
          <div style={{ margin: '22px auto', padding: '14px 20px', background: 'rgba(255,255,255,0.7)', borderRadius: '4px', border: '1px solid #eadfc9', display: 'inline-block' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
              Payment Reference: <code style={{ fontWeight: 600, color: 'var(--ink)' }}>{verifiedGift.receipt}</code>
            </p>
          </div>
        )}
        <div className="btn-row" style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn solid" href="/">Back to Wedding Site</Link>
          <button className="btn" type="button" onClick={() => window.location.href = '/gift'}>Send Another Gift</button>
        </div>
      </div>
    );
  }

  return (
    <div className="gift-grid">
      {/* Left Card: Send Directly with M-Pesa */}
      <div className="gift-card manual">
        <p className="eyebrow">Send directly with M-Pesa</p>
        <p className="mpesa-num">{gift.mpesaDisplay}</p>
        <p className="hint">Open M-Pesa → Send Money → enter this number. Thank you for your generosity.</p>
        <div className="gift-actions">
          <button className="btn" type="button" onClick={copyMpesa}>{copied ? 'Copied ✓' : 'Copy number'}</button>
          <a className="btn" href={`tel:${gift.mpesaNumber}`}>Call to confirm</a>
        </div>
      </div>

      {/* Right Card: The STK Push / Online Payment Form */}
      <form className="gift-card stk" onSubmit={submit}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          <p className="eyebrow" style={{ margin: 0 }}>
            {method === 'mpesa' ? 'Or get an M-Pesa prompt on your phone' : 'Pay Online with Card or Apple Pay'}
          </p>
        </div>

        {/* Method Toggle Buttons */}
        <div style={{ display: 'flex', gap: '8px', margin: '8px 0 16px' }}>
          <button
            type="button"
            className={method === 'mpesa' ? 'quick-btn-on' : 'quick-btn'}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              cursor: 'pointer',
              border: method === 'mpesa' ? '1px solid var(--sage-d)' : '1px solid #d8ccb3',
              background: method === 'mpesa' ? 'var(--sage-d)' : '#fff',
              color: method === 'mpesa' ? '#fff' : 'var(--ink)',
              fontWeight: 500,
            }}
            onClick={() => setMethod('mpesa')}
          >
            📱 M-Pesa STK Prompt
          </button>
          <button
            type="button"
            className={method === 'card' ? 'quick-btn-on' : 'quick-btn'}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              cursor: 'pointer',
              border: method === 'card' ? '1px solid var(--sage-d)' : '1px solid #d8ccb3',
              background: method === 'card' ? 'var(--sage-d)' : '#fff',
              color: method === 'card' ? '#fff' : 'var(--ink)',
              fontWeight: 500,
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
          placeholder="e.g. Sarah"
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
              You will receive an instant prompt on your phone to enter your PIN.
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

        {statusMsg && (
          <p
            className={isError ? 'form-error' : 'notice'}
            style={{
              padding: '10px 14px',
              borderRadius: '4px',
              fontSize: '0.88rem',
              margin: '12px 0',
              background: isError ? '#ffeef0' : '#eef8f2',
              color: isError ? '#a02334' : '#146c36',
              border: `1px solid ${isError ? '#f5c2c7' : '#badbcc'}`,
            }}
            role="status"
          >
            {statusMsg}
          </p>
        )}

        <button
          className="btn solid"
          type="submit"
          disabled={busy}
          style={{ width: '100%', marginTop: '8px', padding: '13px', fontSize: '1rem' }}
        >
          {busy
            ? (method === 'mpesa' ? 'Sending prompt to your phone…' : 'Connecting to checkout…')
            : (method === 'mpesa'
                ? `Send M-Pesa prompt (KES ${Number(amount || 0).toLocaleString('en-KE')})`
                : `Pay KES ${Number(amount || 0).toLocaleString('en-KE')} with Card`)}
        </button>
      </form>
    </div>
  );
}
