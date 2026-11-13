'use client';

import { useEffect, useState } from 'react';

// `pos` = which vertical band of a tall photo stays visible on wide screens (keeps faces / rings in view).
// The proposal photos come first: they are the first thing every guest sees.
// `portrait` photos fill the screen on phones; on wide screens they are shown whole (sharp) over a blurred copy of themselves.
const SLIDES: { src: string; land: boolean; pos?: string; portrait?: boolean }[] = [
  { src: '/photos/proposal/hero-1.jpg', land: false, pos: 'center 28%', portrait: true },
  { src: '/photos/proposal/hero-2.jpg', land: false, pos: 'center 34%', portrait: true },
  { src: '/photos/proposal/hero-3.jpg', land: false, pos: 'center 20%', portrait: true },
  { src: '/photos/proposal/hero-4.jpg', land: false, pos: 'center 72%', portrait: true },
  { src: '/photos/proposal/hero-5.jpg', land: false, pos: 'center 42%', portrait: true },
  { src: '/photos/hero1.jpg', land: false },
  { src: '/photos/hero2.jpg', land: true },
  { src: '/photos/hero3.jpg', land: false },
  { src: '/photos/hero4.jpg', land: true },
  { src: '/photos/hero5.jpg', land: false },
  { src: '/photos/hero6.jpg', land: false },
];

/** Full-bleed crossfading photo background with a slow zoom. Loads each image just before it is needed. */
export default function HeroSlideshow() {
  const [slide, setSlide] = useState(0);
  const [seen, setSeen] = useState(2);

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 6000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => setSeen((v) => Math.max(v, slide + 2)), [slide]);

  return (
    <>
      <div className="slides">
        {SLIDES.map((h, i) => (
          <div
            key={h.src}
            className={`slide${h.land ? ' land' : ''}${h.portrait ? ' portrait' : ''}${i === slide ? ' on' : ''}`}
            style={
              i < seen
                ? ({ backgroundImage: `url('${h.src}')`, '--img': `url('${h.src}')`, ...(h.pos ? { backgroundPosition: h.pos } : {}) } as React.CSSProperties)
                : undefined
            }
          />
        ))}
      </div>
      <div className="shade" />
      <div className="dots">
        {SLIDES.map((h, i) => <i key={h.src} className={i === slide ? 'on' : ''} />)}
      </div>
    </>
  );
}
