'use client';

import { useState } from 'react';

export default function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="faq">
      {items.map((it, i) => (
        <div key={it.q} className={`faq-item${open === i ? ' open' : ''}`}>
          <button aria-expanded={open === i} aria-controls={`faq-${i}`} onClick={() => setOpen(open === i ? null : i)}>
            <span>{it.q}</span>
            <i aria-hidden="true">+</i>
          </button>
          <div id={`faq-${i}`} className="faq-body" role="region">
            <p>{it.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
