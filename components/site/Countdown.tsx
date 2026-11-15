'use client';

import { useEffect, useState } from 'react';
import { siteConfig } from '@/lib/site-config';

export default function Countdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = now === null ? 0 : Math.max(0, siteConfig.weddingDate.getTime() - now);

  return (
    <div className="count">
      <div><b>{Math.floor(diff / 864e5)}</b><span>Days</span></div>
      <div><b>{Math.floor((diff / 36e5) % 24)}</b><span>Hours</span></div>
      <div><b>{Math.floor((diff / 6e4) % 60)}</b><span>Minutes</span></div>
      <div><b>{Math.floor((diff / 1e3) % 60)}</b><span>Seconds</span></div>
    </div>
  );
}

export function AddToCalendar() {
  function download() {
    const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const start = siteConfig.weddingDate;
    const end = new Date(start.getTime() + 9 * 36e5);
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
      "SUMMARY:Abigael & Brenton's Wedding",
      'DTSTART:' + f(start), 'DTEND:' + f(end),
      'LOCATION:Sultan Palace\\, Kikambala\\, Mtwapa\\, Kenya',
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'abigael-brenton-wedding.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  return <button className="btn" type="button" onClick={download}>Add to calendar</button>;
}
