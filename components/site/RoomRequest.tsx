'use client';

import { useState, type FormEvent } from 'react';
import { contactWhatsapp, stay } from '@/lib/content';

/** Builds a pre-filled WhatsApp message to the booking contact (no data is stored on our server). */
export default function RoomRequest({ defaultName = '' }: { defaultName?: string }) {
  const [name, setName] = useState(defaultName);
  const [rooms, setRooms] = useState('1');
  const [guests, setGuests] = useState('2');
  const [checkIn, setCheckIn] = useState(stay.checkIn);
  const [checkOut, setCheckOut] = useState(stay.checkOut);
  const [note, setNote] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = [
      'Hello! I would like to request a room for Abigael & Brenton’s wedding.',
      `Name: ${name}`,
      `Check-in: ${checkIn}`,
      `Check-out: ${checkOut}`,
      `Rooms: ${rooms}`,
      `Guests: ${guests}`,
      note ? `Notes: ${note}` : '',
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/${contactWhatsapp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  return (
    <form className="rsvp" onSubmit={submit}>
      <label htmlFor="rname">Your name</label>
      <input id="rname" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} required />
      <div className="two">
        <div><label htmlFor="cin">Check-in</label><input id="cin" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required /></div>
        <div><label htmlFor="cout">Check-out</label><input id="cout" type="date" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} required /></div>
      </div>
      <div className="two">
        <div>
          <label htmlFor="rooms">Rooms</label>
          <select id="rooms" value={rooms} onChange={(e) => setRooms(e.target.value)}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select>
        </div>
        <div>
          <label htmlFor="rg">Guests</label>
          <select id="rg" value={guests} onChange={(e) => setGuests(e.target.value)}>{[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n}>{n}</option>)}</select>
        </div>
      </div>
      <label htmlFor="rnote">Notes (optional)</label>
      <textarea id="rnote" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ground floor, extra bed, etc." />
      <button className="btn solid" type="submit" style={{ width: '100%' }}>Request room on WhatsApp</button>
    </form>
  );
}
