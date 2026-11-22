'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import type { ResponseRecord } from '@/lib/rsvp/store';

const fmtTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });

export default function Scanner({ initialCode }: { initialCode?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const lastScan = useRef({ code: '', at: 0 });
  const busyRef = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState('');
  const [record, setRecord] = useState<ResponseRecord | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResponseRecord[] | null>(null);
  const [busy, setBusy] = useState(false);

  const showRecord = useCallback((r: ResponseRecord, text?: { kind: 'ok' | 'warn' | 'error'; text: string }) => {
    setRecord(r);
    setSelected(r.guests.filter((g) => !g.checkedInAt).map((g) => g.id)); // everyone still outside, ticked
    setResults(null);
    if (text) setBanner(text);
    else {
      const inCount = r.guests.filter((g) => g.checkedInAt).length;
      if (r.guests.length > 0 && inCount === r.guests.length) {
        const first = r.guests.map((g) => g.checkedInAt!).sort()[0];
        setBanner({ kind: 'warn', text: `Already checked in. First check-in: ${fmtTime(first)}` });
      } else setBanner(null);
    }
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const lookup = useCallback(
    async (code: string) => {
      busyRef.current = true;
      setBusy(true);
      try {
        const res = await fetch('/api/admin/checkin/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.record) {
          navigator.vibrate?.(60);
          stopCamera();
          showRecord(data.record as ResponseRecord);
        } else {
          setBanner({ kind: 'error', text: data.error || 'Could not read that code.' });
        }
      } catch {
        setBanner({ kind: 'error', text: 'Could not reach the server.' });
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [showRecord, stopCamera],
  );

  const loop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;
    if (video.readyState >= 2 && !busyRef.current) {
      const scale = Math.min(1, 640 / video.videoWidth);
      const w = Math.round(video.videoWidth * scale);
      const h = Math.round(video.videoHeight * scale);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
        const now = Date.now();
        if (found?.data && (found.data !== lastScan.current.code || now - lastScan.current.at > 3000)) {
          lastScan.current = { code: found.data, at: now };
          void lookup(found.data);
        }
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [lookup]);

  async function startCamera() {
    setCamError('');
    setBanner(null);
    setRecord(null);
    setResults(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play();
      }
      setScanning(true);
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      const name = (e as Error)?.name;
      setCamError(
        name === 'NotAllowedError'
          ? 'Camera access was blocked. Allow the camera for this site in your browser settings, or use the search below.'
          : 'The camera could not be started (it needs a secure https connection and a camera). Use the search below.',
      );
    }
  }

  useEffect(() => {
    if (initialCode) void lookup(initialCode);
    return stopCamera;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch('/api/admin/checkin/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResults(data.records as ResponseRecord[]);
        setRecord(null);
      } else setBanner({ kind: 'error', text: data.error || 'Search failed.' });
    } catch {
      setBanner({ kind: 'error', text: 'Could not reach the server.' });
    } finally {
      setBusy(false);
    }
  }

  async function act(action: 'in' | 'undo', ids: string[] | 'all') {
    if (!record) return;
    if (action === 'undo' && !confirm('Undo the check-in for the selected people?')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ responseId: record.id, guestIds: ids, action }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({ kind: 'error', text: data.error || 'That did not work.' });
        return;
      }
      const r = data.record as ResponseRecord;
      if (action === 'undo') showRecord(r, { kind: 'warn', text: 'Check-in undone.' });
      else if (data.already?.length && !data.changed) {
        const first = (data.already as { checkedInAt: string }[]).map((g) => g.checkedInAt).sort()[0];
        showRecord(r, { kind: 'warn', text: `Already checked in. Previous check-in: ${fmtTime(first)}` });
      } else if (data.already?.length) {
        showRecord(r, { kind: 'ok', text: `${data.changed} checked in. ${data.already.length} were already in.` });
      } else showRecord(r, { kind: 'ok', text: `${data.changed} checked in.` });
      navigator.vibrate?.(data.changed ? [40, 40, 40] : 120);
    } catch {
      setBanner({ kind: 'error', text: 'Could not reach the server.' });
    } finally {
      setBusy(false);
    }
  }

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const outside = record?.guests.filter((g) => !g.checkedInAt) ?? [];
  const allIn = !!record && record.guests.length > 0 && outside.length === 0;

  return (
    <div className="scanner">
      <div className="admin-card">
        <div className="scan-view" data-active={scanning}>
          <video ref={videoRef} muted playsInline />
          <canvas ref={canvasRef} hidden />
          {!scanning && <p className="hint center">Point the camera at a guest’s QR code.</p>}
          {scanning && <span className="scan-frame" aria-hidden="true" />}
        </div>
        <div className="scan-controls">
          {scanning ? (
            <button className="btn" onClick={stopCamera}>Stop camera</button>
          ) : (
            <button className="btn solid" onClick={startCamera}>{record || results ? 'Scan next guest' : 'Start scanning'}</button>
          )}
        </div>
        {camError && <p className="form-error" role="alert">{camError}</p>}
      </div>

      <form className="admin-card search-card" onSubmit={search}>
        <label htmlFor="cs">Lost their card? Search</label>
        <div className="search-row">
          <input id="cs" type="search" placeholder="Name, phone number or reference" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="btn solid" type="submit" disabled={busy || query.trim().length < 2}>Search</button>
        </div>
      </form>

      {banner && <div className={`scan-banner ${banner.kind}`} role="status">{banner.text}</div>}

      {results && (
        <div className="admin-card">
          <h2>{results.length} found</h2>
          <ul className="plain result-list">
            {results.map((r) => (
              <li key={r.id}>
                <button className="result" onClick={() => showRecord(r)}>
                  <b>{r.fullName}</b>
                  <span>{r.reference} · {r.guests.length} guest{r.guests.length === 1 ? '' : 's'} · {r.guests.filter((g) => g.checkedInAt).length} in</span>
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="hint">Nobody matches. Try fewer letters.</li>}
          </ul>
        </div>
      )}

      {record && (
        <div className="admin-card guest-panel">
          <p className="eyebrow">{record.reference}</p>
          <h2>{record.fullName}</h2>
          <p className="hint">
            {record.guests.length} {record.guests.length === 1 ? 'person' : 'people'} in this invitation · RSVP: <b>{record.attending ? 'Confirmed' : 'Declined'}</b> · {record.whatsapp}
          </p>
          {record.stay && <p className="hint">Accommodation: {record.stay.roomName} × {record.stay.units} · <span className={`pill ${record.stay.status === 'confirmed' ? 'accepted' : record.stay.status === 'pending' ? 'pending' : 'declined'}`}>{record.stay.status}</span></p>}

          <ul className="plain people">
            {record.guests.map((g) => (
              <li key={g.id} className={g.checkedInAt ? 'in' : ''}>
                <label>
                  <input type="checkbox" disabled={!!g.checkedInAt} checked={!g.checkedInAt && selected.includes(g.id)} onChange={() => toggle(g.id)} />
                  <span>{g.fullName}<small> · {g.category}{g.isPrimary ? ' · primary' : ''}</small></span>
                </label>
                {g.checkedInAt && <small className="in-at">✓ in {fmtTime(g.checkedInAt)}</small>}
              </li>
            ))}
          </ul>

          {allIn ? (
            <p className="already">Already checked in.</p>
          ) : (
            <button className="btn solid big" disabled={busy || selected.length === 0} onClick={() => act('in', selected)}>
              CHECK IN GUESTS{selected.length ? ` (${selected.length})` : ''}
            </button>
          )}
          {outside.length > 1 && !allIn && (
            <button className="linklike" onClick={() => setSelected(outside.map((g) => g.id))}>Select the whole group</button>
          )}
          {record.guests.some((g) => g.checkedInAt) && (
            <button className="linklike danger" disabled={busy} onClick={() => act('undo', record.guests.filter((g) => g.checkedInAt).map((g) => g.id))}>Undo check-in</button>
          )}
        </div>
      )}
    </div>
  );
}
