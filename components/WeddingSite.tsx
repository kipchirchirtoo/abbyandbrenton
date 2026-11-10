'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { siteConfig } from '@/lib/site-config';
import type { GuestInfo } from '@/lib/types';
import RsvpSection from './RsvpSection';

const HERO = [
  { src: '/photos/hero1.jpg', land: false },
  { src: '/photos/hero2.jpg', land: true },
  { src: '/photos/hero3.jpg', land: false },
  { src: '/photos/hero4.jpg', land: true },
  { src: '/photos/hero5.jpg', land: false },
  { src: '/photos/hero6.jpg', land: false },
];

const GALLERY = [
  ['/photos/g1.jpg', 'Abigael with a fan'],
  ['/photos/g2.jpg', 'Abigael and Brenton embracing'],
  ['/photos/g3.jpg', 'Abigael at the arch'],
  ['/photos/g4.jpg', 'Abigael'],
  ['/photos/g5.jpg', 'Abigael with a fan'],
  ['/photos/g6.jpg', 'Brenton'],
  ['/photos/g7.jpg', 'Abigael in a gown'],
  ['/photos/g8.jpg', 'Abigael'],
];

const TIMELINE = [
  ['1:30', 'Guest arrival', 'Welcome drinks in the garden'],
  ['2:00', 'Ceremony', 'Exchange of vows'],
  ['3:30', 'Photos & cocktails', 'Canapés and live acoustic music'],
  ['5:00', 'Reception dinner', 'Speeches, toasts & the first dance'],
  ['9:00', 'Dancing', 'Party until late'],
];

type Props = { guest?: GuestInfo; token?: string };

export default function WeddingSite({ guest, token }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  /* ---------- envelope intro + music ---------- */
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [sparks, setSparks] = useState<{ left: number; size: number; dur: number; delay: number }[]>([]);

  useEffect(() => {
    document.body.classList.add('locked');
    return () => document.body.classList.remove('locked');
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    setSparks(
      Array.from({ length: 22 }, () => ({
        left: Math.random() * 100,
        size: 2 + Math.random() * 4,
        dur: 7 + Math.random() * 9,
        delay: -Math.random() * 12,
      })),
    );
  }, []);

  const startMusic = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = 0.8;
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;
    a.play().catch(() => {
      // Browser blocked it: start on the very next tap, scroll or key press.
      const retry = () =>
        a.play().then(() => events.forEach((t) => window.removeEventListener(t, retry))).catch(() => {});
      events.forEach((t) => window.addEventListener(t, retry, { passive: true }));
    });
  }, []);

  const openInvite = useCallback(() => {
    if (open) return;
    setOpen(true);
    window.setTimeout(() => document.body.classList.remove('locked'), 900);
    startMusic();
  }, [open, startMusic]);

  /* ---------- countdown ---------- */
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = now === null ? 0 : Math.max(0, siteConfig.weddingDate.getTime() - now);

  function addToCalendar() {
    const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const start = siteConfig.weddingDate;
    const end = new Date(start.getTime() + 9 * 36e5);
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
      "SUMMARY:Abigael & Brenton's Wedding",
      'DTSTART:' + f(start), 'DTEND:' + f(end),
      'LOCATION:Sultan Palace\\, Kikambala\\, Mtwapa\\, Kenya',
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'wedding.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- hero slideshow ---------- */
  const [slide, setSlide] = useState(0);
  const [seen, setSeen] = useState(2); // images loaded so far (current + next)
  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % HERO.length), 6000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => setSeen((v) => Math.max(v, slide + 2)), [slide]);

  /* ---------- story carousel ---------- */
  const [ci, setCi] = useState(0);
  const touchX = useRef<number | null>(null);
  useEffect(() => {
    // depends on ci, so any manual change restarts the 4s timer
    const id = setInterval(() => setCi((c) => (c + 1) % GALLERY.length), 4000);
    return () => clearInterval(id);
  }, [ci]);
  const go = (i: number) => setCi((i + GALLERY.length) % GALLERY.length);

  /* ---------- scroll reveal ---------- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((x) => {
          if (x.isIntersecting) {
            x.target.classList.add('in');
            io.unobserve(x.target);
          }
        }),
      { threshold: 0.15 },
    );
    root.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const venueQuery = encodeURIComponent(siteConfig.venueQuery).replace(/%20/g, '+');

  return (
    <div ref={rootRef}>
      {/* ENVELOPE INTRO */}
      <div id="intro" className={open ? 'open' : ''} onClick={openInvite}>
        {sparks.map((s, i) => (
          <i
            key={i}
            className="spark"
            style={{ left: `${s.left}%`, bottom: -10, width: s.size, height: s.size, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}
          />
        ))}
        <div className="intro-top">
          <small>{guest ? `${guest.name}, you are invited to the wedding of` : 'You are invited to the wedding of'}</small>
          <span className="script">Abigael &amp; Brenton</span>
        </div>
        <div
          className="env"
          id="env"
          role="button"
          tabIndex={0}
          aria-label="Open invitation"
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openInvite()}
        >
          <div className="back" />
          <div className="card">
            <small>Together with their families</small>
            <span className="names">Abigael &amp; Brenton</span>
            <span className="when">15 · 01 · 2027</span>
          </div>
          <div className="p-left" /><div className="p-right" /><div className="p-bottom" />
          <div className="flap" />
          <div className="seal">A&amp;B</div>
        </div>
        <p className="tap">Tap the seal to open</p>
      </div>

      {/* HERO */}
      <header className="hero">
        <div className="slides">
          {HERO.map((h, i) => (
            <div
              key={h.src}
              className={`slide${h.land ? ' land' : ''}${i === slide ? ' on' : ''}`}
              style={i < seen ? { backgroundImage: `url('${h.src}')` } : undefined}
            />
          ))}
        </div>
        <div className="shade" />
        <div className="dots">
          {HERO.map((h, i) => <i key={h.src} className={i === slide ? 'on' : ''} />)}
        </div>
        <p className="eyebrow">Together with their families</p>
        <h1 className="script">Abigael<span className="amp">&amp;</span>Brenton</h1>
        <p className="date">Friday · 15 January 2027</p>
        <p className="date" style={{ marginTop: 6, fontSize: '.8rem' }}>Sultan Palace · Kikambala, Mtwapa</p>
        <span className="scroll">Scroll ↓</span>
      </header>

      {/* PERSONAL GREETING (private invitations only) */}
      {guest && (
        <section className="reveal guest-banner">
          <p className="eyebrow verified">✓ Invitation verified</p>
          <h2>Dear {guest.name},</h2>
          <p className="lead">You are personally invited to celebrate the wedding of Abigael &amp; Brenton.</p>
          <div className="divider" />
          <p className="date-line">Friday, 15 January 2027</p>
          <p className="lead">Sultan Palace · Kikambala, Mtwapa</p>
          <p className="seats">
            Invitation for {guest.guestLimit} guest{guest.guestLimit === 1 ? '' : 's'}
          </p>
          <a className="btn solid" href="#rsvp">Kindly confirm your attendance</a>
        </section>
      )}

      {/* COUNTDOWN */}
      <section className="reveal">
        <p className="eyebrow">Save the date</p>
        <h2>Counting down to forever</h2>
        <div className="count">
          <div><b>{Math.floor(diff / 864e5)}</b><span>Days</span></div>
          <div><b>{Math.floor((diff / 36e5) % 24)}</b><span>Hours</span></div>
          <div><b>{Math.floor((diff / 6e4) % 60)}</b><span>Minutes</span></div>
          <div><b>{Math.floor((diff / 1e3) % 60)}</b><span>Seconds</span></div>
        </div>
        <a className="btn" href="#" onClick={(e) => { e.preventDefault(); addToCalendar(); }}>Add to calendar</a>
      </section>

      {/* STORY */}
      <section className="reveal">
        <p className="eyebrow">Our story</p>
        <h2>How it began</h2>
        <div className="divider" />
        <p className="lead">
          Some love stories are written in the stars. Ours began with a simple meeting, a shared cup of coffee, and a
          conversation neither of us knew would change our lives forever.
        </p>

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
          <div className="cdots">
            {GALLERY.map(([src], i) => <i key={src} className={i === ci ? 'on' : ''} onClick={() => go(i)} />)}
          </div>
        </div>

        <div className="stories">
          <article className="story">
            <p className="eyebrow">Brenton&apos;s story</p>
            <h3>The way I love her</h3>
            <p>Loving you was the easiest thing I have ever done. Somewhere between our first conversations, the endless laughter, and the little moments we shared, I found myself falling for you in ways I never imagined possible.</p>
            <p>You became my favourite thought in the middle of a busy day, my peace in moments of uncertainty, and the person I wanted beside me through every season of life. I fell in love with your smile, your heart, your beautiful imperfections, and the way you make even the simplest moments feel extraordinary.</p>
            <p>With you, love never felt like something I had to figure out. It felt natural. It felt like home. Every journey, every adventure, every late-night conversation only made me more certain that there was no one else I would rather do life with.</p>
            <p>And when I finally asked you to be mine forever, I wasn&apos;t just asking you to marry me. I was choosing my best friend, my greatest blessing, and the woman I want to wake up beside for the rest of my life.</p>
            <p className="quote">If I had to live our story a thousand times, I would still find my way to you. Every single time.</p>
          </article>
          <article className="story">
            <p className="eyebrow">Abigael&apos;s story</p>
            <h3>The way I love him</h3>
            <p>I never knew that one person could make the world feel so different until Brenton came into my life. What began as a simple meeting slowly became something I couldn&apos;t imagine living without.</p>
            <p>He became the person I wanted to tell everything to, the one whose presence could turn an ordinary day into my favourite memory. It wasn&apos;t just the grand gestures or the beautiful moments; it was the little things. The laughter, the conversations, the reassurance, and the countless ways he made me feel loved without even trying.</p>
            <p>Somewhere along the way, I realised that I wasn&apos;t just falling in love with him. I was falling in love with the life we were building together. With his dreams, his heart, his strength, and even the little things that make him who he is.</p>
            <p>Saying yes was one of the easiest decisions my heart has ever made. Because in him, I found more than a partner. I found my best friend, my safe place, and the person I want to share every tomorrow with.</p>
            <p className="quote">Brenton, if love is a journey, then you are my favourite destination. I would choose you in every lifetime, in every version of this world, and in every story yet to be written.</p>
          </article>
        </div>

        <div className="divider" />
        <p className="script" style={{ fontSize: 'clamp(1.8rem,6vw,2.6rem)', lineHeight: 1.2 }}>And so, our forever begins…</p>
        <p className="lead" style={{ marginTop: 12 }}>
          Two hearts, two stories, one beautiful promise. The best chapters are still ahead of us, and we cannot wait to write them together.
        </p>
      </section>

      {/* DETAILS */}
      <section className="reveal">
        <p className="eyebrow">The details</p>
        <h2>When &amp; where</h2>
        <div className="cards">
          <div className="card-d"><h3>Ceremony</h3><p>2:00 PM<br />Sultan Palace<br />Kikambala, Mtwapa</p></div>
          <div className="card-d"><h3>Reception</h3><p>5:00 PM<br />Sultan Palace<br />Kikambala, Mtwapa</p></div>
          <div className="card-d"><h3>Dress code</h3><p>Formal · garden attire<br />Sage, blush &amp; ivory welcome</p></div>
        </div>
        <iframe
          className="map"
          loading="lazy"
          title="Venue map"
          referrerPolicy="no-referrer"
          src={`https://www.google.com/maps?q=${venueQuery}&output=embed`}
        />
        <a className="btn" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${venueQuery}`}>
          Get directions
        </a>
      </section>

      {/* SCHEDULE */}
      <section className="reveal">
        <p className="eyebrow">The day</p>
        <h2>Schedule</h2>
        <div className="timeline">
          {TIMELINE.map(([time, title, text]) => (
            <div className="t" key={time}>
              <time>{time}</time>
              <div><h3>{title}</h3><p>{text}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* RSVP */}
      <RsvpSection guest={guest} token={token} />

      <footer>
        <p className="script">Abigael &amp; Brenton</p>
        <p style={{ letterSpacing: '.3em', textTransform: 'uppercase', fontSize: '.75rem' }}>#AbigaelAndBrenton2027</p>
        <div className="credit">
          <span className="heart" aria-hidden="true">❤️</span>
          <p className="from">From <b>Hirall Solutions</b></p>
          <p className="to">to Abigael &amp; Brenton</p>
          <p className="wish">With all our love and best wishes for your forever 💕</p>
        </div>
      </footer>

      {open && (
        <button
          id="music"
          className="on"
          aria-label={playing ? 'Pause music' : 'Play music'}
          onClick={() => { const a = audioRef.current; if (a) (a.paused ? a.play() : a.pause()); }}
        >
          {playing ? '❚❚' : '♪'}
        </button>
      )}
      <audio ref={audioRef} src="/music.mp3" loop preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
    </div>
  );
}
