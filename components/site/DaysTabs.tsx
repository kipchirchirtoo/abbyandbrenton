'use client';

import { useState } from 'react';
import { days } from '@/lib/content';

export default function DaysTabs({ initial = 'friday' }: { initial?: string }) {
  const [key, setKey] = useState(initial);
  const day = days.find((d) => d.key === key) ?? days[0];

  return (
    <>
      <div className="tabs big" role="tablist" aria-label="Days">
        {days.map((d) => (
          <button key={d.key} role="tab" aria-selected={key === d.key} className={key === d.key ? 'on' : ''} onClick={() => setKey(d.key)}>
            <b>{d.weekday}</b>
            <small>{d.date.replace(' 2027', '')}</small>
          </button>
        ))}
      </div>

      <div className="day-card" key={day.key}>
        <p className="eyebrow">{day.weekday} · {day.date}</p>
        <h2>{day.title}</h2>
        <p className="lead">{day.summary}</p>
        <p className="dress-chip">Dress: {day.dress}</p>
        <div className="timeline">
          {day.events.map((e, i) => (
            <div className="t" key={e.time + e.title} style={{ animationDelay: `${i * 90}ms` }}>
              <time>{e.time}</time>
              <div><h3>{e.title}</h3><p>{e.text}</p></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
