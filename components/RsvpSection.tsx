'use client';

import { useState, type FormEvent } from 'react';
import { siteConfig } from '@/lib/site-config';
import type { GuestInfo } from '@/lib/types';

type Props = { guest?: GuestInfo | null };

export default function RsvpSection({ guest }: Props) {
  return (
    <section className="reveal section" id="rsvp">
      <p className="eyebrow">Kindly reply by {siteConfig.rsvpDeadline}</p>
      <h2>RSVP</h2>
      {guest ? <InviteForm guest={guest} /> : <PublicForm />}
    </section>
  );
}

/* ---------------- Private invitation: saved to Supabase, tied to the guest ---------------- */

function InviteForm({ guest }: { guest: GuestInfo }) {
  const limit = guest.guestLimit;
  const ex = guest.existing;
  const [attending, setAttending] = useState<'yes' | 'no' | ''>(ex ? (ex.attending ? 'yes' : 'no') : '');
  const [names, setNames] = useState<string[]>(() => {
    const base = ex?.attending && ex.attendeeNames.length ? ex.attendeeNames : [guest.name];
    return base.slice(0, limit);
  });
  const [dietary, setDietary] = useState(ex?.dietary ?? '');
  const [message, setMessage] = useState(ex?.message ?? '');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>(ex ? 'done' : 'idle');
  const [error, setError] = useState('');
  const [finalAttending, setFinalAttending] = useState<boolean | null>(ex ? ex.attending : null);

  const count = names.length;
  const setCount = (n: number) =>
    setNames((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? ''));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!attending) return;
    setError('');
    setState('sending');
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attending: attending === 'yes',
          attendeeNames: attending === 'yes' ? names : [],
          dietary: attending === 'yes' ? dietary : '',
          message,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setFinalAttending(attending === 'yes');
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <div className="thanks-box">
        <p className="script">{finalAttending ? 'See you there!' : 'Thank you'}</p>
        <p className="lead">
          {finalAttending
            ? 'Your reply has been received. We can’t wait to celebrate with you.'
            : 'Your reply has been received. We’ll miss you, and we’re grateful you let us know.'}
        </p>
        <button className="btn" type="button" onClick={() => setState('idle')}>
          Change my reply
        </button>
      </div>
    );
  }

  return (
    <form className="rsvp" onSubmit={submit}>
      <p className="rsvp-note">
        Replying as <b>{guest.name}</b> · invitation for {limit} guest{limit === 1 ? '' : 's'}
      </p>

      <label>Will you attend?</label>
      <div className="choice">
        <label>
          <input type="radio" name="attending" checked={attending === 'yes'} onChange={() => setAttending('yes')} required />
          <span>Joyfully accept</span>
        </label>
        <label>
          <input type="radio" name="attending" checked={attending === 'no'} onChange={() => setAttending('no')} />
          <span>Regretfully decline</span>
        </label>
      </div>

      {attending === 'yes' && (
        <>
          {limit > 1 && (
            <>
              <label htmlFor="count">Number attending (including you)</label>
              <select id="count" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {Array.from({ length: limit }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </>
          )}
          {names.map((n, i) => (
            <div key={i}>
              <label htmlFor={`g${i}`}>{i === 0 ? 'Your name' : `Guest ${i + 1} full name`}</label>
              <input
                id={`g${i}`}
                value={n}
                maxLength={100}
                required
                onChange={(e) => setNames((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
              />
            </div>
          ))}
          <label htmlFor="diet">Dietary requirements</label>
          <input id="diet" value={dietary} maxLength={300} placeholder="Optional" onChange={(e) => setDietary(e.target.value)} />
        </>
      )}

      {attending !== '' && (
        <>
          <label htmlFor="msg">Message to the couple</label>
          <textarea id="msg" rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
        </>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn solid" type="submit" style={{ width: '100%' }} disabled={state === 'sending' || !attending}>
        {state === 'sending' ? 'Sending…' : 'Send RSVP'}
      </button>
    </form>
  );
}

/* ---------------- Public (non-private) mode: Google Sheet, WhatsApp or email fallback ---------------- */

function PublicForm() {
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const text = `RSVP — ${d.name}\n${d.attending}\nGuests: ${d.guests}\nDiet: ${d.diet || '-'}\nMessage: ${d.msg || '-'}`;
    const fallback = () => {
      const url = siteConfig.whatsappNumber
        ? `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(text)}`
        : `mailto:${siteConfig.rsvpEmail}?subject=${encodeURIComponent('Wedding RSVP — ' + d.name)}&body=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
      setDone(true);
    };
    if (!siteConfig.sheetUrl) return fallback();
    setSending(true);
    fetch(siteConfig.sheetUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(d),
    })
      .then(() => setDone(true))
      .catch(() => {
        setSending(false);
        alert('Sorry, we could not send your RSVP. Please try again, or we will open WhatsApp/email instead.');
        fallback();
      });
  }

  if (done) {
    return (
      <div className="thanks-box">
        <p className="script">Thank you!</p>
        <p className="lead">Your reply has been received. We can’t wait to celebrate with you.</p>
      </div>
    );
  }

  return (
    <form className="rsvp" onSubmit={submit}>
      <label htmlFor="name">Full name</label>
      <input id="name" name="name" required />
      <label>Will you attend?</label>
      <div className="choice">
        <label><input type="radio" name="attending" value="Joyfully accepts" required /><span>Joyfully accept</span></label>
        <label><input type="radio" name="attending" value="Regretfully declines" /><span>Regretfully decline</span></label>
      </div>
      <label htmlFor="guests">Number of guests (including you)</label>
      <select id="guests" name="guests" defaultValue="1">
        <option>1</option><option>2</option><option>3</option><option>4</option>
      </select>
      <label htmlFor="diet">Dietary requirements</label>
      <input id="diet" name="diet" placeholder="Optional" />
      <label htmlFor="msg">Message to the couple</label>
      <textarea id="msg" name="msg" rows={3} />
      <button className="btn solid" type="submit" style={{ width: '100%' }} disabled={sending}>
        {sending ? 'Sending…' : 'Send RSVP'}
      </button>
    </form>
  );
}
