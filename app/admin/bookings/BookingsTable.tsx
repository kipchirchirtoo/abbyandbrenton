'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BookingRow } from '@/lib/bookings';

const pillClass: Record<string, string> = { paid: 'accepted', pending: 'pending', review: 'sent', failed: 'declined', cancelled: 'revoked' };
const fmtDate = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export default function BookingsTable({ bookings }: { bookings: BookingRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const shown = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  async function cancel(b: BookingRow) {
    if (!confirm(`Cancel ${b.reference} (${b.full_name})? No money is moved from here. Refunds are made in the Paystack dashboard.`)) return;
    setBusy(b.id);
    setMsg(null);
    const res = await fetch('/api/admin/bookings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id, action: 'cancel' }) });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? { ok: true, text: 'Booking cancelled.' } : { ok: false, text: data.error || 'Could not cancel.' });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="admin-card table-wrap">
      {msg && <p className={msg.ok ? 'notice' : 'form-error'} role="status">{msg.text}</p>}
      <div className="table-head">
        <h2>All bookings ({shown.length})</h2>
        <div className="head-tools">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status">
            {['all', 'paid', 'pending', 'review', 'failed', 'cancelled'].map((s) => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}
          </select>
          <a className="btn" href="/api/admin/bookings/export">Export CSV</a>
        </div>
      </div>
      <table>
        <thead>
          <tr><th>Booked</th><th>Guest</th><th>Contact</th><th>Room</th><th>Dates</th><th>Guests</th><th>Total</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {shown.length === 0 && <tr><td colSpan={9} className="hint">No bookings yet.</td></tr>}
          {shown.map((b) => (
            <tr key={b.id}>
              <td>{new Date(b.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}<br /><small>{b.reference}</small></td>
              <td>{b.full_name}{b.notes && <><br /><small title={b.notes}>“{b.notes.slice(0, 40)}{b.notes.length > 40 ? '…' : ''}”</small></>}</td>
              <td><a href={`mailto:${b.email}`}>{b.email}</a><br /><a href={`tel:${b.phone}`}>{b.phone}</a></td>
              <td>{b.hotel_name}<br />{b.room_name} × {b.rooms}</td>
              <td>{fmtDate(b.check_in)} → {fmtDate(b.check_out)}<br /><small>{b.nights} night{b.nights === 1 ? '' : 's'}</small></td>
              <td>{b.guests}</td>
              <td>{b.currency} {b.total.toLocaleString('en-KE')}</td>
              <td>
                <span className={`pill ${pillClass[b.status] ?? ''}`}>{b.status}</span>
                {b.payment_note && <><br /><small className="warn">{b.payment_note}</small></>}
              </td>
              <td className="actions">
                {b.status !== 'paid' && b.status !== 'cancelled' && (
                  <button className="linklike danger" disabled={busy === b.id} onClick={() => cancel(b)}>Cancel</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">Paid bookings cannot be cancelled here: refund them in your Paystack dashboard. Rows marked “review” had a payment whose amount did not match, or arrived for a cancelled booking.</p>
    </div>
  );
}
