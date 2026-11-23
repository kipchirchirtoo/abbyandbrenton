'use client';

import { Fragment, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ResponseRecord } from '@/lib/rsvp/store';
import type { RsvpMode } from '@/lib/rsvp/config';

type Props = { records: ResponseRecord[]; mode: RsvpMode; open: boolean; closesAt: number };

const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtDay = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const stayPill: Record<string, string> = { pending: 'pending', confirmed: 'accepted', declined: 'declined', cancelled: 'revoked' };

function matches(r: ResponseRecord, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const digits = needle.replace(/\D/g, '');
  const hay = [r.fullName, r.email, r.reference, ...r.guests.map((g) => g.fullName)].join(' ').toLowerCase();
  return hay.includes(needle) || (digits.length >= 4 && r.whatsapp.replace(/\D/g, '').includes(digits));
}

export default function RsvpAdmin({ records, mode, open, closesAt }: Props) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const shown = useMemo(
    () =>
      records.filter((r) => {
        if (!matches(r, q)) return false;
        if (filter === 'attending') return r.attending;
        if (filter === 'declined') return !r.attending;
        if (filter === 'stay') return !!r.stay;
        if (filter === 'stay-pending') return r.stay?.status === 'pending';
        return true;
      }),
    [records, q, filter],
  );

  async function call(url: string, body: unknown, ok: string, key: string) {
    setBusy(key);
    setMsg(null);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      setMsg(res.ok ? { ok: true, text: ok } : { ok: false, text: data.error || 'That did not work.' });
      if (res.ok) router.refresh();
    } catch {
      setMsg({ ok: false, text: 'Could not reach the server.' });
    } finally {
      setBusy('');
    }
  }

  const closesLabel = new Date(closesAt).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', dateStyle: 'long', timeStyle: 'medium' });

  return (
    <>
      <div className="admin-card">
        <h2>RSVP status: {open ? 'Open' : 'Closed'}</h2>
        <p className="hint">
          {mode === 'auto' && `Following the deadline: RSVPs ${open ? 'close' : 'closed'} at the end of 30 December 2026 (Nairobi time; ${closesLabel} is the cut-off instant).`}
          {mode === 'open' && 'Manually reopened: RSVPs stay open regardless of the deadline until you switch back.'}
          {mode === 'closed' && 'Manually closed: new RSVPs are refused by the server, regardless of the deadline.'}
        </p>
        <div className="mode-row">
          {([
            ['auto', 'Follow the deadline'],
            ['open', 'Reopen RSVPs'],
            ['closed', 'Close RSVPs now'],
          ] as const).map(([m, label]) => (
            <button key={m} className={`btn${mode === m ? ' solid' : ''}`} disabled={busy === 'mode' || mode === m} onClick={() => call('/api/admin/rsvp/settings', { mode: m }, 'RSVP setting updated.', 'mode')}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {msg && <p className={msg.ok ? 'notice' : 'form-error'} role="status">{msg.text}</p>}

      <div className="admin-card table-wrap">
        <div className="table-head">
          <h2>All RSVPs ({shown.length})</h2>
          <div className="head-tools">
            <input type="search" placeholder="Search name, phone, email or reference" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search RSVPs" />
            <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter">
              <option value="all">Everyone</option>
              <option value="attending">Attending</option>
              <option value="declined">Declined</option>
              <option value="stay">Wants accommodation</option>
              <option value="stay-pending">Accommodation pending</option>
            </select>
            <a className="btn" href="/api/admin/rsvp/export">Export CSV</a>
            <a className="btn" href="/admin/rsvp/print" target="_blank" rel="noopener">Print check-in list</a>
          </div>
        </div>

        <table>
          <thead>
            <tr><th>Reference</th><th>Primary guest</th><th>Contact</th><th>RSVP</th><th>Party</th><th>Accommodation</th><th>Check-in</th><th></th></tr>
          </thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={8} className="hint">No RSVPs match.</td></tr>}
            {shown.map((r) => {
              const inCount = r.guests.filter((g) => g.checkedInAt).length;
              const isOpen = expanded === r.id;
              return (
                <Fragment key={r.id}>
                  <tr>
                    <td><b>{r.reference}</b><br /><small>{fmtDateTime(r.submittedAt)}</small></td>
                    <td>
                      {r.fullName}
                      {r.message && <><br /><small className="row-message">💬 “{r.message.length > 90 ? r.message.slice(0, 90) + '…' : r.message}”</small></>}
                    </td>
                    <td><a href={`mailto:${r.email}`}>{r.email}</a><br /><a href={`https://wa.me/${r.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">{r.whatsapp}</a></td>
                    <td><span className={`pill ${r.attending ? 'accepted' : 'declined'}`}>{r.attending ? 'Attending' : 'Declined'}</span></td>
                    <td>{r.attending ? <>{r.adults + r.children}<br /><small>{r.adults}A{r.children ? ` · ${r.children}C` : ''}</small></> : '—'}</td>
                    <td>
                      {r.stay ? (
                        <>
                          {r.stay.roomName} × {r.stay.units}<br />
                          <span className={`pill ${stayPill[r.stay.status]}`}>{r.stay.status}</span> <small>KES {r.stay.estimatedAmount.toLocaleString('en-KE')}</small>
                        </>
                      ) : '—'}
                    </td>
                    <td>{r.attending ? `${inCount}/${r.guests.length}` : '—'}</td>
                    <td className="actions"><button className="linklike" onClick={() => setExpanded(isOpen ? null : r.id)}>{isOpen ? 'Hide' : 'Details'}</button></td>
                  </tr>
                  {isOpen && (
                    <tr className="detail-row">
                      <td colSpan={8}>
                        <div className="detail-grid">
                          <div>
                            <h3>People</h3>
                            {r.attending ? (
                              <ul className="plain">
                                {r.guests.map((g) => (
                                  <li key={g.id}>
                                    {g.fullName} <small>· {g.category}{g.isPrimary ? ' · primary' : ''}{g.dietary ? ` · ${g.dietary}` : ''}</small>
                                    {g.checkedInAt && <span className="pill accepted"> in {fmtDateTime(g.checkedInAt)}</span>}
                                  </li>
                                ))}
                              </ul>
                            ) : <p className="hint">Declined.</p>}
                            {r.dietary && <p><b>Dietary:</b> {r.dietary}</p>}
                            {r.accessibility && <p><b>Accessibility:</b> {r.accessibility}</p>}
                            {r.specialRequests && <p><b>Requests:</b> {r.specialRequests}</p>}
                            <p><b>Message to the couple:</b> {r.message ? <>“{r.message}”</> : <span className="hint">none left</span>}</p>
                          </div>
                          <div>
                            <h3>Accommodation</h3>
                            {r.stay ? (
                              <>
                                <p>{r.stay.roomName} × {r.stay.units} · {fmtDay(r.stay.checkIn)} → {fmtDay(r.stay.checkOut)}</p>
                                <p><b>{r.stay.occupantsCount}</b> staying: {r.stay.occupantNames.join(', ')}</p>
                                <p>Estimated KES {r.stay.estimatedAmount.toLocaleString('en-KE')} <small>(KES {r.stay.unitPrice.toLocaleString('en-KE')} per unit, not per night)</small></p>
                                {r.stay.specialRequests && <p><b>Requests:</b> {r.stay.specialRequests}</p>}
                                <div className="mode-row">
                                  {(['confirmed', 'declined', 'cancelled', 'pending'] as const).map((s) => (
                                    <button key={s} className="btn" disabled={busy === r.id + s || r.stay!.status === s} onClick={() => call('/api/admin/rsvp/stay', { responseId: r.id, status: s }, `Marked ${s}.`, r.id + s)}>
                                      {s === 'pending' ? 'Back to pending' : s === 'confirmed' ? 'Confirm' : s === 'declined' ? 'Decline' : 'Cancel'}
                                    </button>
                                  ))}
                                </div>
                              </>
                            ) : <p className="hint">No accommodation requested.</p>}
                            {r.attending && (
                              <p>
                                <button className="btn" disabled={busy === r.id + 'mail'} onClick={() => call('/api/admin/rsvp/resend', { responseId: r.id }, `Invitation link emailed to ${r.email}.`, r.id + 'mail')}>
                                  Email invitation link
                                </button>
                                <small className="hint"> {r.emailSentAt ? `Last emailed ${fmtDateTime(r.emailSentAt)}` : 'Not emailed yet'}</small>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
