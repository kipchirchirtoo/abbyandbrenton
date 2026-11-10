'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type GalleryData = Record<string, [string, number, number][]>;

const TABS: { key: string; label: string }[] = [
  { key: 'groom', label: 'Groom' },
  { key: 'bride', label: 'Bride' },
  { key: 'family', label: 'Family' },
  { key: 'bridal', label: 'Bridal Team' },
  { key: 'venue', label: 'Event Location' },
];

export default function Gallery({ data }: { data: GalleryData }) {
  const [tab, setTab] = useState('bride');
  const [open, setOpen] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);
  const photos = data[tab] ?? [];

  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? i : (i + d + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, step]);

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Gallery categories">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
            {t.label} <small>{data[t.key]?.length ?? 0}</small>
          </button>
        ))}
      </div>

      <div className="masonry" key={tab}>
        {photos.map(([name, w, h], i) => (
          <button key={name} className="m-item" style={{ aspectRatio: `${w} / ${h}`, animationDelay: `${i * 70}ms` }} onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/photos/gallery/${name}`} alt={`${TABS.find((t) => t.key === tab)?.label} photo ${i + 1}`} loading="lazy" width={w} height={h} />
          </button>
        ))}
      </div>

      {open !== null && photos[open] && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(null)}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/photos/gallery/${photos[open][0]}`} alt="" onClick={(e) => e.stopPropagation()} />
          <button className="lb-close" aria-label="Close" onClick={() => setOpen(null)}>✕</button>
          <button className="lb-prev" aria-label="Previous" onClick={(e) => { e.stopPropagation(); step(-1); }}>‹</button>
          <button className="lb-next" aria-label="Next" onClick={(e) => { e.stopPropagation(); step(1); }}>›</button>
          <span className="lb-count">{open + 1} / {photos.length}</span>
        </div>
      )}
    </>
  );
}
