'use client';

import { useState } from 'react';
import Lightbox from './Lightbox';

/** "The villa & grounds" photo mosaic. Visible to everyone, even before room booking opens. */
export default function VillaGallery({ name, photos }: { name: string; photos: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (photos.length === 0) return null;
  const shown = photos.slice(0, 7);
  const extra = photos.length - shown.length;

  return (
    <>
      <div className="mosaic">
        {shown.map((src, i) => (
          <button
            key={src}
            className={`mosaic-item m${i}`}
            onClick={() => setOpen(i)}
            aria-label={`Open photo ${i + 1} of ${photos.length}`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`${name}, photo ${i + 1}`} loading={i === 0 ? undefined : 'lazy'} />
            {i === shown.length - 1 && extra > 0 && <span className="more">+{extra} more</span>}
          </button>
        ))}
      </div>
      {open !== null && <Lightbox images={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} title={name} />}
    </>
  );
}
