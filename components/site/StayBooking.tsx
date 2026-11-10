'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import type { Hotel } from '@/lib/content';

type Props = {
  hotels: Hotel[];
  paymentReady: boolean;
  preview: boolean;
  minDate: string;
  maxDate: string;
  defaultCheckIn: string;
  defaultCheckOut: string;
  defaultName?: string;
};

const kes = (n: number) => `KES ${n.toLocaleString('en-KE')}`;
const dayNumber = (iso: string) => Math.round(Date.parse(iso + 'T00:00:00Z') / 86_400_000);

export default function StayBooking(p: Props) {
  const flat = useMemo(() => p.hotels.flatMap((h) => h.rooms.map((r) => ({ hotel: h, room: r }))), [p.hotels]);
  const formRef = useRef<HTMLFormElement>(null);

  const [sel, setSel] = useState(flat[0] ? `${flat[0].hotel.id}|${flat[0].room.id}` : '');
  const [checkIn, setCheckIn] = useState(p.defaultCheckIn);
  const [checkOut, setCheckOut] = useState(p.defaultCheckOut);
  const [rooms, setRooms] = useState(1);
  const [guests, setGuests] = useState(2);
  const [fullName, setFullName] = useState(p.defaultName ?? '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (flat.length === 0) {
    return (
      <div className="thanks-box">
        <p className="script">Booking opens soon</p>
        <p className="lead">Our hotel and room details are being finalised. Please check back shortly.</p>
      </div>
    );
  }

  const [hotelId, roomId] = sel.split('|');
  const chosen = flat.find((x) => x.hotel.id === hotelId && x.room.id === roomId) ?? flat[0];
  const nights = Math.max(0, dayNumber(checkOut) - dayNumber(checkIn));
  const total = nights > 0 ? chosen.room.pricePerNight * nights * rooms : 0;

  function choose(hid: string, rid: string) {
    setSel(`${hid}|${rid}`);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId: chosen.hotel.id, roomId: chosen.room.id, checkIn, checkOut, rooms, guests, fullName, email, phone, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'Something went wrong.');
      window.location.href = data.url; // Paystack hosted checkout
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <>
      {p.preview && <p className="preview-banner">Preview mode: these are SAMPLE rooms and prices, hidden from guests until you publish real ones.</p>}

      {p.hotels.map((h) => (
        <div key={h.id} className="hotel">
          <div className="hotel-head">
            {h.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={h.image} alt={h.name} />}
            <div>
              <p className="eyebrow">{h.area}</p>
              <h3>{h.name}</h3>
              <p className="hint left">{h.description}</p>
            </div>
          </div>
          <div className="room-grid">
            {h.rooms.map((r) => (
              <article key={r.id} className={`room-card${sel === `${h.id}|${r.id}` ? ' picked' : ''}`}>
                <div className="room-img" style={r.image ? { backgroundImage: `url('${r.image}')` } : undefined}>
                  {!r.image && <span>Photo coming soon</span>}
                  {r.sample && <em className="sample-tag">SAMPLE</em>}
                </div>
                <div className="room-body">
                  <h4>{r.name}</h4>
                  <p>{r.description}</p>
                  <p className="room-meta">Sleeps up to {r.capacity}</p>
                  <p className="room-price"><b>{kes(r.pricePerNight)}</b> <small>per room / night</small></p>
                  <button type="button" className="btn solid" onClick={() => choose(h.id, r.id)}>
                    {sel === `${h.id}|${r.id}` ? 'Selected ✓' : 'Select this room'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}

      <form className="rsvp booking-form" ref={formRef} onSubmit={submit} id="book">
        <p className="eyebrow">Your booking</p>
        <h3>{chosen.hotel.name} · {chosen.room.name}</h3>

        <div className="two">
          <div><label htmlFor="bin">Check-in</label><input id="bin" type="date" value={checkIn} min={p.minDate} max={p.maxDate} onChange={(e) => setCheckIn(e.target.value)} required /></div>
          <div><label htmlFor="bout">Check-out</label><input id="bout" type="date" value={checkOut} min={checkIn || p.minDate} max={p.maxDate} onChange={(e) => setCheckOut(e.target.value)} required /></div>
        </div>
        <div className="two">
          <div>
            <label htmlFor="brooms">Rooms</label>
            <select id="brooms" value={rooms} onChange={(e) => setRooms(Number(e.target.value))}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select>
          </div>
          <div>
            <label htmlFor="bguests">Guests</label>
            <input id="bguests" type="number" min={1} max={rooms * chosen.room.capacity} value={guests} onChange={(e) => setGuests(Number(e.target.value))} required />
          </div>
        </div>

        <label htmlFor="bname">Full name</label>
        <input id="bname" value={fullName} maxLength={100} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
        <div className="two">
          <div><label htmlFor="bemail">Email</label><input id="bemail" type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
          <div><label htmlFor="bphone">Phone</label><input id="bphone" type="tel" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" placeholder="0712 345 678" /></div>
        </div>
        <label htmlFor="bnotes">Notes (optional)</label>
        <textarea id="bnotes" rows={2} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ground floor, extra bed, arrival time…" />

        <div className="summary" aria-live="polite">
          {nights > 0 ? (
            <>
              <span>{kes(chosen.room.pricePerNight)} × {nights} night{nights === 1 ? '' : 's'} × {rooms} room{rooms === 1 ? '' : 's'}</span>
              <b>{kes(total)}</b>
            </>
          ) : (
            <span>Choose your dates to see the total.</span>
          )}
        </div>

        {!p.paymentReady && <p className="notice">Online payment is being set up, so booking is not open yet.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn solid" type="submit" style={{ width: '100%' }} disabled={busy || !p.paymentReady || nights < 1}>
          {busy ? 'Taking you to secure payment…' : `Pay ${total ? kes(total) : ''} securely`}
        </button>
        <p className="hint">Payment is handled by Paystack (cards and M-Pesa). Your room is confirmed once the payment succeeds.</p>
      </form>
    </>
  );
}
