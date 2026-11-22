'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RSVP_DEADLINE_LABEL, type RsvpMode } from '@/lib/rsvp/config';

type Props = { closesAt: number; serverNow: number; mode: RsvpMode; compact?: boolean };

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Countdown to the RSVP deadline.
 * It never trusts the visitor's clock: the server sends its own time (`serverNow`) and the countdown runs on
 * (device time + the offset between the two), so a wrong phone clock or a refresh cannot change the answer.
 * The deadline itself is an absolute instant (11:59:59 PM, 30 Dec 2026, Africa/Nairobi), not a date string.
 */
export default function RsvpCountdown({ closesAt, serverNow, mode, compact }: Props) {
  const router = useRouter();
  // Start from the server's moment so the first render is identical on the server and in the browser.
  const [now, setNow] = useState(serverNow);
  const offset = useRef<number | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    offset.current = serverNow - Date.now();
    const tick = () => setNow(Date.now() + (offset.current ?? 0));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [serverNow]);

  const remaining = Math.max(0, closesAt - now);
  const passed = now >= closesAt;

  // The moment the deadline passes, ask the server (not the clock) and refresh so the closed screen appears.
  useEffect(() => {
    if (!passed || fired.current || mode === 'open') return;
    fired.current = true;
    fetch('/api/rsvp/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((s: { open: boolean }) => {
        if (!s.open) router.refresh();
      })
      .catch(() => router.refresh());
  }, [passed, mode, router]);

  if (mode === 'closed') return null;

  const units = [
    ['Days', Math.floor(remaining / 864e5)],
    ['Hours', Math.floor((remaining / 36e5) % 24)],
    ['Minutes', Math.floor((remaining / 6e4) % 60)],
    ['Seconds', Math.floor((remaining / 1e3) % 60)],
  ] as const;

  const reopened = mode === 'open' && passed;

  return (
    <div className={`rsvp-count${compact ? ' compact' : ''}`} role="timer" aria-live="off">
      <p className="eyebrow">Time to RSVP</p>
      {reopened ? (
        <p className="lead">RSVPs have been reopened. Please reply as soon as you can.</p>
      ) : (
        <>
          <div className="rc-grid" aria-label={`${units[0][1]} days ${units[1][1]} hours ${units[2][1]} minutes ${units[3][1]} seconds left`}>
            {units.map(([label, value]) => (
              <div className="rc-cell" key={label}>
                <b key={value} className="rc-num">{label === 'Days' ? value : pad(value)}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <p className="lead">Kindly confirm your attendance before {RSVP_DEADLINE_LABEL}.</p>
          {!compact && <p className="hint">RSVPs close at 11:59:59 PM, Nairobi time (EAT).</p>}
        </>
      )}
    </div>
  );
}
