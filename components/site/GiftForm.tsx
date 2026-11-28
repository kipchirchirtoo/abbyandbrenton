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
  // Method choice: 'paystack' or 'mpesa'
  const [method, setMethod] = useState<'paystack' | 'mpesa'>(paystackEnabled ? 'paystack' : 'mpesa');

  // Common fields
  const [name, setName] = useState(defaultName);
  const [amount, setAmount] = useState('5000');

  // Paystack fields
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [paystackPhone, setPaystackPhone] = useState('');
  const [paystackBusy, setPaystackBusy] = useState(false);
  const [paystackError, setPaystackError] = useState('');

  // M-Pesa fields
  const [copied, setCopied] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaState, setMpesaState] = useState<'idle' | 'sending' | 'waiting' | 'success' | 'failed'>('idle');
  const [mpesaMsg, setMpesaMsg] = useState('');
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

  // Handle Paystack submit (redirects to Paystack checkout)
  async function submitPaystack(e: FormEvent) {
    e.preventDefault();
    setPaystackError('');
    setPaystackBusy(true);

    try {
      const res = await fetch('/api/gifts/paystack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          email,
          name,
          phone: paystackPhone,
          notes,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Could not start payment. Please try again.');
      }

      window.location.href = data.url;
    } catch (err) {
      setPaystackError(err instanceof Error ? err.message : 'Something went wrong.');
      setPaystackBusy(false);
    }
  }

  // Handle M-Pesa STK push submit
  async function submitMpesa(e: FormEvent) {
    e.preventDefault();
    setMpesaMsg('');
    setMpesaState('sending');

    try {
      const res = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: mpesaPhone,
          amount: Number(amount),
          name,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not start the M-Pesa prompt.');

      setMpesaState('waiting');
      setMpesaMsg('Check your phone and enter your M-Pesa PIN to complete the gift.');

      let tries = 0;
      poll.current = setInterval(async () => {
        tries++;
        const r = await fetch(`/api/mpesa/status?id=${encodeURIComponent(data.id)}`).then((x) => x.json()).catch(() => null);
        if (r?.status === 'success') {
          clearInterval(poll.current!);
          setMpesaState('success');
        } else if (r?.status === 'failed' || r?.status === 'cancelled') {
          clearInterval(poll.current!);
          setMpesaState('failed');
          setMpesaMsg(r.status === 'cancelled' ? 'The prompt was cancelled. You can try again.' : 'The payment did not go through. You can try again.');
        } else if (tries > 24) {
          clearInterval(poll.current!);
          setMpesaState('idle');
          setMpesaMsg('We have not received a confirmation yet. If money left your account, please contact us.');
        }
      }, 5000);
    } catch (err) {
      setMpesaState('idle');
      setMpesaMsg(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  // Celebratory thank-you screen if returning from successful payment
  if (verifiedGift) {
    return (
      <div className="thanks-box" style={{ maxWidth: '640px', padding: '40px 30px' }}>
        <p className="script" style={{ fontSize: '3.2rem', marginBottom: '8px' }}>Thank you so much!</p>
        <p className="lead" style={{ color: 'var(--ink)', fontSize: '1.2rem', fontWeight: 400 }}>
          {verifiedGift.giverName ? `Dear ${verifiedGift.giverName}, ` : ''}Your wedding gift of{' '}
          <strong style={{ color: 'var(--sage-d)' }}>KES {verifiedGift.amount.toLocaleString('en-KE')}</strong>{' '}
          has been received with our heartfelt gratitude and love. ❤️
        </p>
        <div style={{ margin: '22px auto', padding: '14px 20px', background: 'rgba(255,255,255,0.7)', borderRadius: '4px', border: '1px solid #eadfc9', display: 'inline-block' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
            Payment Reference: <code style={{ fontWeight: 600, color: 'var(--ink)' }}>{verifiedGift.receipt}</code>
          </p>
        </div>
        <div className="btn-row" style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn solid" href="/">Back to Wedding Site</Link>
          <button className="btn" type="button" onClick={() => window.location.href = '/gift'}>Send Another Gift</button>
        </div>
      </div>
    );
  }

  if (mpesaState === 'success') {
    return (
      <div className="thanks-box">
        <p className="script">Thank you!</p>
        <p className="lead">Your gift has been received. We are so grateful for your love and generosity. ❤️</p>
        <div style={{ marginTop: '20px' }}>
          <Link className="btn solid" href="/">Back to Wedding Site</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Method Switcher Tabs */}
      {paystackEnabled && (
        <div className="gift-tabs">
          <button
            type="button"
            className={`gift-tab-btn ${method === 'paystack' ? 'active' : ''}`}
            onClick={() => setMethod('paystack')}
          >
            <span>💳</span>
            <span>Card, Bank &amp; Online (Paystack)</span>
          </button>
          <button
            type="button"
            className={`gift-tab-btn ${method === 'mpesa' ? 'active' : ''}`}
            onClick={() => setMethod('mpesa')}
          >
            <span>📱</span>
            <span>M-Pesa (Direct)</span>
          </button>
        </div>
      )}

      {method === 'paystack' && paystackEnabled ? (
        /* Paystack Online Payment Form */
        <div style={{ maxWidth: '620px', margin: '0 auto' }}>
          <form className="gift-card" onSubmit={submitPaystack} style={{ padding: '36px 30px' }}>
            <p className="eyebrow" style={{ textAlign: 'center' }}>Secure Payment via Paystack</p>
            <h3 style={{ textAlign: 'center', margin: '6px 0 16px', fontFamily: "'Cormorant Garamond', serif", fontSize: '2.2rem' }}>
              Send a Wedding Gift
            </h3>
            <p className="hint" style={{ textAlign: 'center', marginBottom: '24px' }}>
              Pay securely with Visa, Mastercard, Apple Pay, Bank Transfer or Mobile Money.
            </p>

            <label htmlFor="pamt">Gift Amount (KES)</label>
            <input
              id="pamt"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 5000"
              required
            />

            <div className="quick" style={{ justifyContent: 'center', marginTop: '10px' }}>
              {QUICK_AMOUNTS.map((q) => (
                <button
                  type="button"
                  key={q}
                  className={amount === String(q) ? 'on' : ''}
                  onClick={() => setAmount(String(q))}
                >
                  KES {q.toLocaleString('en-KE')}
                </button>
              ))}
            </div>

            <div className="two" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label htmlFor="pname">Your Name</label>
                <input
                  id="pname"
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                />
              </div>
              <div>
                <label htmlFor="pemail">Your Email Address *</label>
                <input
                  id="pemail"
                  type="email"
                  value={email}
                  maxLength={120}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="For your payment receipt"
                  required
                />
              </div>
            </div>

            <label htmlFor="pphone">Your Phone (Optional)</label>
            <input
              id="pphone"
              inputMode="tel"
              value={paystackPhone}
              onChange={(e) => setPaystackPhone(e.target.value)}
              placeholder="+254 712 345 678"
            />

            <label htmlFor="pnotes">A Warm Wish for the Couple (Optional)</label>
            <textarea
              id="pnotes"
              value={notes}
              maxLength={300}
              rows={3}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Leave a blessing or congratulatory message..."
              style={{ width: '100%', padding: '12px', border: '1px solid #d8ccb3', background: '#fff', font: 'inherit', borderRadius: '2px', resize: 'vertical' }}
            />

            {paystackError && (
              <p className="form-error" style={{ color: '#a02334', marginTop: '12px', fontSize: '0.9rem' }} role="status">
                {paystackError}
              </p>
            )}

            <button
              className="btn solid"
              type="submit"
              disabled={paystackBusy}
              style={{ width: '100%', marginTop: '22px', fontSize: '1.05rem', padding: '14px' }}
            >
              {paystackBusy ? 'Connecting to Paystack…' : `Pay KES ${Number(amount || 0).toLocaleString('en-KE')} with Paystack`}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '16px', color: 'var(--muted)', fontSize: '0.8rem' }}>
              <span>🔒 256-bit Encrypted Checkout</span>
              <span>·</span>
              <span>Powered by Paystack</span>
            </div>
          </form>
        </div>
      ) : (
        /* M-Pesa Grid */
        <div className="gift-grid">
          <div className="gift-card manual">
            <p className="eyebrow">Send directly with M-Pesa</p>
            <p className="mpesa-num">{gift.mpesaDisplay}</p>
            <p className="hint">Open M-Pesa → Send Money → enter this number. Thank you for your generosity.</p>
            <div className="gift-actions">
              <button className="btn" type="button" onClick={copyMpesa}>{copied ? 'Copied ✓' : 'Copy number'}</button>
              <a className="btn" href={`tel:${gift.mpesaNumber}`}>Call to confirm</a>
            </div>
          </div>

          {stkEnabled ? (
            <form className="gift-card stk" onSubmit={submitMpesa}>
              <p className="eyebrow">Or get an M-Pesa prompt on your phone</p>
              <label htmlFor="gname">Your name</label>
              <input id="gname" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
              <label htmlFor="gphone">Your Safaricom number</label>
              <input id="gphone" inputMode="tel" value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} placeholder="0712 345 678" required />
              <label htmlFor="gamt">Amount (KES)</label>
              <input id="gamt" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} required />
              <div className="quick">
                {QUICK_AMOUNTS.slice(0, 4).map((q) => (
                  <button type="button" key={q} className={amount === String(q) ? 'on' : ''} onClick={() => setAmount(String(q))}>{q.toLocaleString('en-KE')}</button>
                ))}
              </div>
              {mpesaMsg && <p className={mpesaState === 'failed' ? 'form-error' : 'notice'} role="status">{mpesaMsg}</p>}
              <button className="btn solid" type="submit" disabled={mpesaState === 'sending' || mpesaState === 'waiting'} style={{ width: '100%' }}>
                {mpesaState === 'sending' ? 'Sending prompt…' : mpesaState === 'waiting' ? 'Waiting for your PIN…' : 'Send M-Pesa prompt'}
              </button>
            </form>
          ) : (
            <div className="gift-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
              <p className="eyebrow">Cards &amp; Online</p>
              <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.6rem', margin: '8px 0' }}>Prefer paying by Card or Apple Pay?</h4>
              <p className="hint">You can make a direct contribution via card using Paystack.</p>
              {paystackEnabled && (
                <button type="button" className="btn solid" style={{ marginTop: '16px' }} onClick={() => setMethod('paystack')}>
                  Switch to Paystack Checkout
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
