'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { gift } from '@/lib/content';

const QUICK = [500, 1000, 2000, 5000];

/**
 * Always shows the manual M-Pesa number. When the server has Daraja credentials (stkEnabled),
 * also offers an M-Pesa prompt on the guest's own phone.
 */
export default function GiftForm({ stkEnabled, defaultName = '' }: { stkEnabled: boolean; defaultName?: string }) {
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('1000');
  const [state, setState] = useState<'idle' | 'sending' | 'waiting' | 'success' | 'failed'>('idle');
  const [msg, setMsg] = useState('');
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(gift.mpesaNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    setState('sending');
    try {
      const res = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, amount: Number(amount), name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not start the M-Pesa prompt.');
      setState('waiting');
      setMsg('Check your phone and enter your M-Pesa PIN to complete the gift.');
      let tries = 0;
      poll.current = setInterval(async () => {
        tries++;
        const r = await fetch(`/api/mpesa/status?id=${encodeURIComponent(data.id)}`).then((x) => x.json()).catch(() => null);
        if (r?.status === 'success') { clearInterval(poll.current!); setState('success'); }
        else if (r?.status === 'failed' || r?.status === 'cancelled') {
          clearInterval(poll.current!); setState('failed');
          setMsg(r.status === 'cancelled' ? 'The prompt was cancelled. You can try again.' : 'The payment did not go through. You can try again.');
        } else if (tries > 24) {
          clearInterval(poll.current!); setState('idle');
          setMsg('We have not received a confirmation yet. If money left your account, please contact us.');
        }
      }, 5000);
    } catch (err) {
      setState('idle');
      setMsg(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  if (state === 'success') {
    return (
      <div className="thanks-box">
        <p className="script">Thank you!</p>
        <p className="lead">Your gift has been received. We are so grateful for your love and generosity. ❤️</p>
      </div>
    );
  }

  return (
    <div className="gift-grid">
      <div className="gift-card manual">
        <p className="eyebrow">Send directly with M-Pesa</p>
        <p className="mpesa-num">{gift.mpesaDisplay}</p>
        <p className="hint">Open M-Pesa → Send Money → enter this number. Thank you for your generosity.</p>
        <div className="gift-actions">
          <button className="btn" type="button" onClick={copy}>{copied ? 'Copied ✓' : 'Copy number'}</button>
          <a className="btn" href={`tel:${gift.mpesaNumber}`}>Call to confirm</a>
        </div>
      </div>

      {stkEnabled && (
        <form className="gift-card stk" onSubmit={submit}>
          <p className="eyebrow">Or get an M-Pesa prompt on your phone</p>
          <label htmlFor="gname">Your name</label>
          <input id="gname" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
          <label htmlFor="gphone">Your Safaricom number</label>
          <input id="gphone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" required />
          <label htmlFor="gamt">Amount (KES)</label>
          <input id="gamt" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} required />
          <div className="quick">
            {QUICK.map((q) => (
              <button type="button" key={q} className={amount === String(q) ? 'on' : ''} onClick={() => setAmount(String(q))}>{q.toLocaleString('en-KE')}</button>
            ))}
          </div>
          {msg && <p className={state === 'failed' ? 'form-error' : 'notice'} role="status">{msg}</p>}
          <button className="btn solid" type="submit" disabled={state === 'sending' || state === 'waiting'} style={{ width: '100%' }}>
            {state === 'sending' ? 'Sending prompt…' : state === 'waiting' ? 'Waiting for your PIN…' : 'Send M-Pesa prompt'}
          </button>
        </form>
      )}
    </div>
  );
}
