'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BulkSend({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function sendAll() {
    if (!confirm(`Email ${ids.length} invitation(s) now?`)) return;
    setBusy(true);
    setMsg(null);
    let ok = 0;
    const failures: string[] = [];
    // Batches of 25 keep each request well within serverless time limits.
    for (let i = 0; i < ids.length; i += 25) {
      const res = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestIds: ids.slice(i, i + 25) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || 'Sending failed.' });
        setBusy(false);
        router.refresh();
        return;
      }
      for (const r of data.results as { ok: boolean; error?: string }[]) {
        if (r.ok) ok++;
        else failures.push(r.error || 'failed');
      }
    }
    setMsg({ ok: failures.length === 0, text: `Sent ${ok}.${failures.length ? ` ${failures.length} failed (${failures[0]}).` : ''}` });
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <button className="btn solid" onClick={sendAll} disabled={busy || ids.length === 0}>
        {busy ? 'Sending…' : `Send ${ids.length} invitation${ids.length === 1 ? '' : 's'}`}
      </button>
      {msg && <p className={msg.ok ? 'notice' : 'form-error'} role="status">{msg.text}</p>}
    </>
  );
}
