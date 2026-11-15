'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Full-screen photo viewer: arrows, swipe, keyboard, click outside to close. */
export default function Lightbox({
  images,
  index,
  onIndex,
  onClose,
  title,
}: {
  images: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  title?: string;
}) {
  const touchX = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const step = useCallback((d: number) => onIndex((index + d + images.length) % images.length), [index, images.length, onIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, step]);

  if (!mounted) return null;
  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Photo viewer'}
      onClick={onClose}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={images[index]} src={images[index]} alt={title ? `${title}, photo ${index + 1}` : ''} onClick={(e) => e.stopPropagation()} />
      <button className="lb-close" aria-label="Close" onClick={onClose}>✕</button>
      {images.length > 1 && (
        <>
          <button className="lb-prev" aria-label="Previous" onClick={(e) => { e.stopPropagation(); step(-1); }}>‹</button>
          <button className="lb-next" aria-label="Next" onClick={(e) => { e.stopPropagation(); step(1); }}>›</button>
        </>
      )}
      <span className="lb-count">{title ? `${title} · ` : ''}{index + 1} / {images.length}</span>
    </div>,
    document.body,
  );
}
