'use client';

import { useState } from 'react';
import Lightbox from './Lightbox';

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
  const photos = data[tab] ?? [];



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
        <Lightbox
          images={photos.map(([n]) => `/photos/gallery/${n}`)}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          title={TABS.find((x) => x.key === tab)?.label}
        />
      )}
    </>
  );
}
