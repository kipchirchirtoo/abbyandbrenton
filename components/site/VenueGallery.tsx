'use client';

import { useState } from 'react';
import Lightbox from './Lightbox';

/** Grid of Sultan Palace photos; tap one to open the full-screen viewer. */
export default function VenueGallery({ images, title }: { images: string[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <div className="venue-gallery">
        {images.map((src, i) => (
          <button key={src} type="button" onClick={() => setOpen(i)} aria-label={`View ${title} photo ${i + 1}`} style={{ backgroundImage: `url('${src}')` }} />
        ))}
      </div>
      {open !== null && <Lightbox images={images} index={open} title={title} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
}
