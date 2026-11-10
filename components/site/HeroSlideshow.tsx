'use client';

import { useEffect, useState } from 'react';

const SLIDES = [
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
            className={`slide${h.land ? ' land' : ''}${i === slide ? ' on' : ''}`}
            style={i < seen ? { backgroundImage: `url('${h.src}')` } : undefined}
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
