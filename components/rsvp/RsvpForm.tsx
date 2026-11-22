'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { stay } from '@/lib/content';
import { COUNTRY_CODES, MAX_PARTY, RSVP_DEADLINE_LABEL } from '@/lib/rsvp/config';
import { estimateStay, normalizePhone, parseSubmission, stayRooms } from '@/lib/rsvp/validation';
import type { SubmitResult } from '@/lib/rsvp/types';
import type { GuestInfo } from '@/lib/types';
import InvitationCard from './InvitationCard';

type PartyGuest = { key: string; fullName: string; category: 'adult' | 'child'; dietary: string };
type Props = { guest: GuestInfo | null };

const kes = (n: number) => `KES ${n.toLocaleString('en-KE')}`;
let counter = 0;
const nextKey = () => `g${++counter}`;

export default function RsvpForm({ guest }: Props) {
  const maxParty = Math.min(MAX_PARTY, guest?.guestLimit ?? MAX_PARTY);
  const rooms = useMemo(() => stayRooms(), []);

  // Idempotency key: a double click or a retry can never create two RSVPs.
  const idem = useRef('');
  useEffect(() => {
    idem.current = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random();
  }, []);

  const [fullName, setFullName] = useState(guest?.name ?? '');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('+254');
  const [phone, setPhone] = useState('');
  const [attending, setAttending] = useState<'yes' | 'no' | ''>('');
  const [party, setParty] = useState<PartyGuest[]>([]);
  const [dietary, setDietary] = useState('');
  const [accessibility, setAccessibility] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [message, setMessage] = useState('');

  const [needStay, setNeedStay] = useState<'yes' | 'no' | ''>('');
  const [roomType, setRoomType] = useState(rooms[0]?.id ?? '');
  const [units, setUnits] = useState(1);
  const [checkIn, setCheckIn] = useState(stay.defaultCheckIn);
  const [checkOut, setCheckOut] = useState(stay.defaultCheckOut);
  const [occupantCount, setOccupantCount] = useState(1);
  const [occupants, setOccupants] = useState<string[]>(['']);
  const [stayRequests, setStayRequests] = useState('');

  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState('');
  const [closed, setClosed] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [result, setResult] = useState<(SubmitResult & { email: string }) | null>(null);

  const total = 1 + party.length;
  const adults = 1 + party.filter((g) => g.category === 'adult').length;
  const children = party.filter((g) => g.category === 'child').length;
  const estimate = needStay === 'yes' ? estimateStay(roomType, units) : null;

  const whatsapp = useMemo(() => {
    const digits = phone.replace(/[^\d+]/g, '');
    if (!code) return digits;
    return code + digits.replace(/^\+/, '').replace(/^0+/, '');
  }, [code, phone]);

  function addGuest() {
    if (total >= maxParty) return;
    setParty((p) => [...p, { key: nextKey(), fullName: '', category: 'adult', dietary: '' }]);
  }
  const removeGuest = (key: string) => setParty((p) => p.filter((g) => g.key !== key));
  const updateGuest = (key: string, patch: Partial<PartyGuest>) => setParty((p) => p.map((g) => (g.key === key ? { ...g, ...patch } : g)));

  function chooseStay(v: 'yes' | 'no') {
    setNeedStay(v);
    if (v === 'yes') {
      // Start from the people already listed: fewer things to type.
      const names = [fullName, ...party.map((g) => g.fullName)];
      setOccupantCount(names.length);
      setOccupants(names);
    }
  }
  function setOccupantTotal(n: number) {
    const count = Math.max(1, Math.min(40, Math.floor(n) || 1));
    setOccupantCount(count);
    setOccupants((o) => Array.from({ length: count }, (_, i) => o[i] ?? ''));
  }

  function buildPayload() {
    return {
      idempotencyKey: idem.current,
      fullName,
      email,
      whatsapp,
      attending: attending === 'yes' ? true : attending === 'no' ? false : undefined,
      guests: party.map((g) => ({ fullName: g.fullName, category: g.category, dietary: g.dietary })),
      dietary,
      accessibility,
      specialRequests,
      message,
      stay:
        attending === 'yes' && needStay === 'yes'
          ? { roomType, units, checkIn, checkOut, occupantCount, occupantNames: occupants, requests: stayRequests }
          : null,
      website: '',
    };
  }

  function focusField(field?: string) {
    if (!field) return;
    setErrorField(field);
    requestAnimationFrame(() => {
      const el = document.getElementById(`f-${field}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (el as HTMLElement | null)?.focus?.({ preventScroll: true });
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    setError('');
    setErrorField('');
    setDuplicate(false);

    if (attending === '') {
      setError('Please tell us whether you will attend.');
      focusField('attending');
      return;
    }
    if (attending === 'yes' && needStay === '') {
      setError('Please tell us whether you need accommodation.');
      focusField('needStay');
      return;
    }
    const payload = buildPayload();
    const checked = parseSubmission(payload, maxParty);
    if (!checked.ok) {
      setError(checked.error);
      focusField(checked.field);
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/rsvp/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(25000) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setResult({ ...(data as SubmitResult), email: checked.value.email });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (data.closed) {
        setClosed(true);
        return;
      }
      if (data.code === 'duplicate_email') setDuplicate(true);
      setError(data.error || 'Something went wrong. Please try again.');
      focusField(data.field);
    } catch {
      setError('This is taking too long or the connection dropped. Please check your connection and try again.');
    } finally {
      setSending(false);
    }
  }

  if (closed) {
    return (
      <div className="rsvp-closed" role="status">
        <h2>RSVPs are now closed.</h2>
        <p className="lead">The RSVP deadline has passed. We look forward to celebrating with our confirmed guests!</p>
      </div>
    );
  }

  if (result) return <Success result={result} />;

  const invalid = (f: string) => (errorField === f ? ' invalid' : '');

  return (
    <form className="rsvp rsvp-form" onSubmit={submit} noValidate>
      {guest && (
        <p className="rsvp-note">
          Replying with your personal invitation · up to {guest.guestLimit} guest{guest.guestLimit === 1 ? '' : 's'}
        </p>
      )}

      {/* ---------- 1. who you are ---------- */}
      <fieldset className="rf-section">
        <legend>Your details</legend>
        <label htmlFor="f-fullName">Full legal name</label>
        <input id="f-fullName" className={invalid('fullName')} value={fullName} maxLength={100} autoComplete="name" onChange={(e) => setFullName(e.target.value)} />

        <div className="rf-two">
          <div>
            <label htmlFor="f-email">Email address</label>
            <input id="f-email" className={invalid('email')} type="email" inputMode="email" value={email} maxLength={254} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="f-whatsapp">WhatsApp number</label>
            <div className="rf-phone">
              <select aria-label="Country code" value={code} onChange={(e) => setCode(e.target.value)}>
                {COUNTRY_CODES.map((c) => <option key={c.label} value={c.code}>{c.label}</option>)}
              </select>
              <input id="f-whatsapp" className={invalid('whatsapp')} type="tel" inputMode="tel" value={phone} maxLength={20} autoComplete="tel-national" placeholder={code ? '712 345 678' : '+44 7700 900123'} onChange={(e) => setPhone(e.target.value)} />
            </div>
            {phone && !normalizePhone(whatsapp, '') && <p className="rf-hint warn">Check the number and country code.</p>}
          </div>
        </div>
      </fieldset>

      {/* ---------- 2. attendance ---------- */}
      <fieldset className="rf-section">
        <legend>Will you attend?</legend>
        <div className={`pill-choice${invalid('attending')}`} id="f-attending" tabIndex={-1}>
          <label className={attending === 'yes' ? 'on' : ''}>
            <input type="radio" name="attending" checked={attending === 'yes'} onChange={() => setAttending('yes')} />
            <span>Yes, I’ll be there</span>
          </label>
          <label className={attending === 'no' ? 'on' : ''}>
            <input type="radio" name="attending" checked={attending === 'no'} onChange={() => setAttending('no')} />
            <span>Sorry, can’t attend</span>
          </label>
        </div>
      </fieldset>

      {attending === 'yes' && (
        <>
          {/* ---------- 3. the party ---------- */}
          <fieldset className="rf-section">
            <legend>Your party</legend>
            <p className="rf-hint">You count as the first guest. Add the full name of everyone coming with you.</p>
            <ul className="party">
              <li className="party-row primary">
                <span className="party-num">1</span>
                <div className="party-fields">
                  <b>{fullName.trim() || 'You'}</b>
                  <small>Adult · primary guest</small>
                </div>
              </li>
              {party.map((g, i) => (
                <li className="party-row" key={g.key}>
                  <span className="party-num">{i + 2}</span>
                  <div className="party-fields">
                    <input id={`f-guest-${i}`} className={invalid(`guest-${i}`)} placeholder="Full name" aria-label={`Guest ${i + 2} full name`} value={g.fullName} maxLength={100} onChange={(e) => updateGuest(g.key, { fullName: e.target.value })} />
                    <div className="rf-two tight">
                      <select aria-label="Adult or child" value={g.category} onChange={(e) => updateGuest(g.key, { category: e.target.value as 'adult' | 'child' })}>
                        <option value="adult">Adult</option>
                        <option value="child">Child</option>
                      </select>
                      <input placeholder="Dietary needs (optional)" aria-label="Dietary requirements" value={g.dietary} maxLength={300} onChange={(e) => updateGuest(g.key, { dietary: e.target.value })} />
                    </div>
                  </div>
                  <button type="button" className="party-remove" onClick={() => removeGuest(g.key)} aria-label={`Remove guest ${i + 2}`}>×</button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn add-guest" onClick={addGuest} disabled={total >= maxParty}>+ Add another guest</button>
            {total >= maxParty && <p className="rf-hint">That is the most people this RSVP can cover ({maxParty}).</p>}
            <div className="party-total" aria-live="polite">
              <b>{total}</b> attending <small>· {adults} adult{adults === 1 ? '' : 's'}{children ? ` · ${children} child${children === 1 ? '' : 'ren'}` : ''}</small>
            </div>
          </fieldset>

          {/* ---------- 4. accommodation ---------- */}
          <fieldset className="rf-section">
            <legend>Accommodation at Sultan Palace</legend>
            <label>Will you need accommodation?</label>
            <div className={`pill-choice${invalid('needStay')}`} id="f-needStay" tabIndex={-1}>
              <label className={needStay === 'yes' ? 'on' : ''}>
                <input type="radio" name="needStay" checked={needStay === 'yes'} onChange={() => chooseStay('yes')} />
                <span>Yes, please</span>
              </label>
              <label className={needStay === 'no' ? 'on' : ''}>
                <input type="radio" name="needStay" checked={needStay === 'no'} onChange={() => chooseStay('no')} />
                <span>No, thank you</span>
              </label>
            </div>

            {needStay === 'yes' && (
              <div className="stay-box">
                <label htmlFor="f-stay-roomType">Accommodation type</label>
                <select id="f-stay-roomType" className={invalid('stay-roomType')} value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                  {rooms.map((r) => <option key={r.id} value={r.id}>{r.name} · {kes(r.price)}</option>)}
                </select>

                <div className="rf-two">
                  <div>
                    <label htmlFor="f-stay-units">Number of units</label>
                    <input id="f-stay-units" className={invalid('stay-units')} type="number" min={1} max={10} value={units} onChange={(e) => setUnits(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} />
                  </div>
                  <div>
                    <label htmlFor="f-stay-occupantCount">People staying</label>
                    <input id="f-stay-occupantCount" className={invalid('stay-occupantCount')} type="number" min={1} max={40} value={occupantCount} onChange={(e) => setOccupantTotal(Number(e.target.value))} />
                  </div>
                </div>

                <div className="rf-two">
                  <div>
                    <label htmlFor="f-stay-checkIn">Check-in</label>
                    <input id="f-stay-checkIn" className={invalid('stay-checkIn')} type="date" min={stay.minDate} max={stay.maxDate} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="f-stay-checkOut">Check-out</label>
                    <input id="f-stay-checkOut" className={invalid('stay-checkOut')} type="date" min={checkIn || stay.minDate} max={stay.maxDate} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
                  </div>
                </div>

                <label>Who will stay (full names)</label>
                {occupants.map((n, i) => (
                  <input key={i} id={`f-stay-occupant-${i}`} className={invalid(`stay-occupant-${i}`)} placeholder={`Occupant ${i + 1} full name`} aria-label={`Occupant ${i + 1} full name`} value={n} maxLength={100} onChange={(e) => setOccupants((o) => o.map((x, j) => (j === i ? e.target.value : x)))} />
                ))}

                <label htmlFor="f-stay-requests">Special accommodation requests (optional)</label>
                <textarea id="f-stay-requests" rows={2} maxLength={500} value={stayRequests} onChange={(e) => setStayRequests(e.target.value)} placeholder="Ground floor, extra bed, early check-in…" />

                {estimate && (
                  <div className="stay-estimate" aria-live="polite">
                    <span>{estimate.name} × {units} unit{units === 1 ? '' : 's'}</span>
                    <b>{kes(estimate.amount)}</b>
                    <small>Estimated total. The price is per unit, not per night. Your request is pending until the couple confirm it.</small>
                  </div>
                )}
              </div>
            )}
          </fieldset>

          {/* ---------- 5. optional extras ---------- */}
          <fieldset className="rf-section">
            <legend>Anything else we should know?</legend>
            <label htmlFor="f-dietary">Your dietary restrictions <span className="opt">optional</span></label>
            <input id="f-dietary" value={dietary} maxLength={300} onChange={(e) => setDietary(e.target.value)} />
            <label htmlFor="f-accessibility">Accessibility requirements <span className="opt">optional</span></label>
            <input id="f-accessibility" value={accessibility} maxLength={300} onChange={(e) => setAccessibility(e.target.value)} />
            <label htmlFor="f-specialRequests">Special requests <span className="opt">optional</span></label>
            <textarea id="f-specialRequests" rows={2} maxLength={500} value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} />
          </fieldset>
        </>
      )}

      {attending !== '' && (
        <fieldset className="rf-section">
          <legend>A message for the couple</legend>
          <textarea id="f-message" rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} aria-label="Message to the couple" placeholder="Optional" />
        </fieldset>
      )}

      {/* hidden bot trap: people never see or fill this */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp-field" />

      {error && (
        <div className="form-error" role="alert">
          {error}
          {duplicate && <ResendLink email={email} />}
        </div>
      )}

      <button className="btn solid rf-submit" type="submit" disabled={sending || attending === ''}>
        {sending ? 'Sending…' : attending === 'no' ? 'Send my reply' : 'Confirm my RSVP'}
      </button>
      <p className="rf-hint center">Please reply by {RSVP_DEADLINE_LABEL}. Your details are used only to organise the wedding.</p>
    </form>
  );
}

/** "Email me my invitation": used when an RSVP already exists for the email address. */
function ResendLink({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  async function go() {
    setState('sending');
    try {
      const res = await fetch('/api/rsvp/resend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await res.json().catch(() => ({}));
      setMsg(data.message || data.error || '');
      setState(res.ok ? 'done' : 'error');
    } catch {
      setMsg('Could not reach the server.');
      setState('error');
    }
  }
  return (
    <div className="resend">
      <button type="button" className="linklike" onClick={go} disabled={state === 'sending' || state === 'done'}>
        {state === 'sending' ? 'Sending…' : 'Email me my invitation'}
      </button>
      {msg && <p className={state === 'error' ? 'form-error-inline' : 'notice'}>{msg}</p>}
    </div>
  );
}

function Success({ result }: { result: SubmitResult & { email: string } }) {
  const { card, viewUrl, emailStatus, email } = result;
  if (!card.attending) {
    return (
      <div className="thanks-box">
        <p className="script">Thank you</p>
        <p className="lead">Your reply has been received. We’ll miss you, and we’re grateful you let us know.</p>
        {emailStatus === 'sent' && <p className="notice">A confirmation has been emailed to {email}.</p>}
      </div>
    );
  }
  return (
    <div className="rsvp-success">
      <p className="script">See you there!</p>
      <p className="lead">Your RSVP is confirmed. Here is your personal invitation.</p>
      {emailStatus === 'sent' && <p className="notice ok">We’ve also emailed your invitation and secure link to {email}.</p>}
      {emailStatus === 'failed' && <p className="notice warn">We couldn’t email your invitation just now. Please download it below, or copy your private link, and keep it safe.</p>}
      {emailStatus === 'not_configured' && <p className="notice">Please download your invitation below or copy your private link, and keep it on your phone for the wedding day.</p>}
      <InvitationCard card={card} viewUrl={viewUrl} />
    </div>
  );
}
