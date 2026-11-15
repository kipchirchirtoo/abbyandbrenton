'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminGuest } from '@/lib/admin-data';

const label: Record<string, string> = {
  pending: 'Not sent',
  sent: 'Invitation sent',
  accepted: 'Accepted',
  declined: 'Declined',
  revoked: 'Revoked',
};

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

export default function GuestsManager({ guests }: { guests: AdminGuest[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: '', email: '', guest_limit: 1 });
  const [csv, setCsv] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState({ full_name: '', email: '', guest_limit: 1 });

  async function run(key: string, fn: () => Promise<string>) {
    setBusy(key);
    setMsg(null);
    try {
      setMsg({ ok: true, text: await fn() });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Something went wrong.' });
    } finally {
      setBusy(null);
    }
  }

  const addGuest = (e: FormEvent) => {
    e.preventDefault();
    run('add', async () => {
      await call('/api/admin/guests', 'POST', form);
      setForm({ full_name: '', email: '', guest_limit: 1 });
      return 'Guest added.';
    });
  };

  const importCsv = () =>
    run('import', async () => {
      const r = await call('/api/admin/guests/import', 'POST', { csv });
      setCsv('');
      const extra = r.errors?.length ? ` Problems: ${r.errors.slice(0, 5).join(' | ')}` : '';
      return `Imported ${r.inserted} guest(s), skipped ${r.skippedExisting} existing.${extra}`;
    });

  const send = (g: AdminGuest) =>
    run(`send-${g.id}`, async () => {
      const r = await call('/api/invitations/send', 'POST', { guestIds: [g.id] });
      const one = r.results?.[0];
      if (!one?.ok) throw new Error(one?.error || 'Could not send.');
      return `Invitation emailed to ${g.email}.`;
    });

  const revoke = (g: AdminGuest) => {
    if (!confirm(`Revoke ${g.full_name}'s invitation? Their link will stop working immediately.`)) return;
    run(`rev-${g.id}`, async () => {
      await call('/api/admin/guests', 'PATCH', { id: g.id, action: 'revoke' });
      return 'Invitation revoked.';
    });
  };

  const restore = (g: AdminGuest) =>
    run(`res-${g.id}`, async () => {
      await call('/api/admin/guests', 'PATCH', { id: g.id, action: 'restore' });
      return 'Restored. Send a new invitation to give them a fresh link.';
    });

  const remove = (g: AdminGuest) => {
    if (!confirm(`Permanently delete ${g.full_name} and their RSVP? This cannot be undone.`)) return;
    run(`del-${g.id}`, async () => {
      await call(`/api/admin/guests?id=${encodeURIComponent(g.id)}`, 'DELETE');
      return 'Guest deleted.';
    });
  };

  const saveEdit = (g: AdminGuest) =>
    run(`edit-${g.id}`, async () => {
      await call('/api/admin/guests', 'PATCH', { id: g.id, ...edit });
      setEditing(null);
      return 'Guest updated.';
    });

  return (
    <>
      {msg && <p className={msg.ok ? 'notice' : 'form-error'} role="status">{msg.text}</p>}

      <div className="admin-grid">
        <form className="admin-card" onSubmit={addGuest}>
          <h2>Add a guest</h2>
          <label htmlFor="n">Full name</label>
          <input id="n" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required maxLength={120} />
          <label htmlFor="e">Email</label>
          <input id="e" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <label htmlFor="l">Guests allowed (including them)</label>
          <select id="l" value={form.guest_limit} onChange={(e) => setForm({ ...form, guest_limit: Number(e.target.value) })}>
            {Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
          <button className="btn solid" type="submit" disabled={busy === 'add'}>Add guest</button>
        </form>

        <div className="admin-card">
          <h2>Import CSV</h2>
          <p className="hint">Columns: <code>name,email,guest_limit</code> (limit optional). Existing emails are skipped.</p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()); }}
          />
          <textarea rows={5} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={'name,email,guest_limit\nJohn Doe,john@example.com,2'} />
          <button className="btn solid" type="button" onClick={importCsv} disabled={!csv.trim() || busy === 'import'}>Import guests</button>
        </div>
      </div>

      <div className="admin-card table-wrap">
        <div className="table-head">
          <h2>All guests ({guests.length})</h2>
          <a className="btn" href="/api/admin/export">Export CSV</a>
        </div>
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Limit</th><th>Status</th><th>Replied</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {guests.length === 0 && <tr><td colSpan={6} className="hint">No guests yet. Add one or import a CSV.</td></tr>}
            {guests.map((g) =>
              editing === g.id ? (
                <tr key={g.id}>
                  <td><input value={edit.full_name} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} /></td>
                  <td><input value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></td>
                  <td>
                    <select value={edit.guest_limit} onChange={(e) => setEdit({ ...edit, guest_limit: Number(e.target.value) })}>
                      {Array.from({ length: 10 }, (_, i) => <option key={i + 1}>{i + 1}</option>)}
                    </select>
                  </td>
                  <td colSpan={2} />
                  <td className="actions">
                    <button className="linklike" onClick={() => saveEdit(g)}>Save</button>
                    <button className="linklike" onClick={() => setEditing(null)}>Cancel</button>
                  </td>
                </tr>
              ) : (
                <tr key={g.id}>
                  <td>{g.full_name}</td>
                  <td>{g.email}</td>
                  <td>{g.guest_limit}</td>
                  <td><span className={`pill ${g.invitation_status}`}>{label[g.invitation_status]}</span></td>
                  <td>{g.rsvp ? (g.rsvp.attending ? `Yes · ${g.rsvp.attending_count}` : 'No') : '—'}</td>
                  <td className="actions">
                    {g.invitation_status !== 'revoked' ? (
                      <>
                        <button className="linklike" disabled={busy === `send-${g.id}`} onClick={() => send(g)}>
                          {g.email_sent_at ? 'Resend' : 'Send'}
                        </button>
                        <button className="linklike" onClick={() => { setEditing(g.id); setEdit({ full_name: g.full_name, email: g.email, guest_limit: g.guest_limit }); }}>Edit</button>
                        <button className="linklike danger" onClick={() => revoke(g)}>Revoke</button>
                      </>
                    ) : (
                      <button className="linklike" onClick={() => restore(g)}>Restore</button>
                    )}
                    <button className="linklike danger" onClick={() => remove(g)}>Delete</button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
