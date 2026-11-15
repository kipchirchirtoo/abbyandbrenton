'use client';

import { useEffect, useRef, useState } from 'react';

const GALLERY: [string, string][] = [
  // The proposal, in the order it unfolds.
  ['/photos/proposal/story-1.jpg', 'Abigael and Brenton at the heart-shaped flower arch'],
  ['/photos/proposal/story-2.jpg', 'Abigael smiling in Brenton’s arms, her ring on show'],
  ['/photos/proposal/story-3.jpg', 'Brenton and Abigael sharing a kiss'],
  ['/photos/proposal/story-4.jpg', 'Their hands together, the engagement ring catching the light'],
  ['/photos/proposal/story-5.jpg', 'The engagement ring'],
  ['/photos/g1.jpg', 'Abigael with a fan'],
  ['/photos/g2.jpg', 'Abigael and Brenton embracing'],
  ['/photos/g3.jpg', 'Abigael at the arch'],
  ['/photos/g4.jpg', 'Abigael'],
  ['/photos/g5.jpg', 'Abigael with a fan'],
  ['/photos/g6.jpg', 'Brenton'],
  ['/photos/g7.jpg', 'Abigael in a gown'],
  ['/photos/g8.jpg', 'Abigael'],
];

export default function StoryCarousel() {
  const [ci, setCi] = useState(0);
  const touchX = useRef<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => setCi((c) => (c + 1) % GALLERY.length), 4000); // restarts on every manual change
    return () => clearInterval(id);
  }, [ci]);
  const go = (i: number) => setCi((i + GALLERY.length) % GALLERY.length);

  return (
    <div
      className="carousel"
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(ci + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      {GALLERY.map(([src, alt], i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt={alt} className={i === ci ? 'on' : ''} loading={i === 0 ? undefined : 'lazy'} />
      ))}
      <button className="prev" aria-label="Previous photo" onClick={() => go(ci - 1)}>‹</button>
      <button className="next" aria-label="Next photo" onClick={() => go(ci + 1)}>›</button>
      <div className="cdots">{GALLERY.map(([src], i) => <i key={src} className={i === ci ? 'on' : ''} onClick={() => go(i)} />)}</div>
    </div>
  );
}
