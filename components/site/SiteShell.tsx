'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { nav, couple } from '@/lib/content';

type Spark = { left: number; size: number; dur: number; delay: number };
const SESSION_KEY = 'ab-intro-seen';

export default function SiteShell({ children, guestName }: { children: React.ReactNode; guestName?: string }) {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement>(null);

  /* ---------- envelope intro (once per browser tab) ---------- */
  const [intro, setIntro] = useState<'show' | 'open' | 'gone'>('show');
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') setIntro('gone');
    } catch {}
    if (!window.matchMedia('(prefers-reduced-motion:reduce)').matches) {
      setSparks(
        Array.from({ length: 22 }, () => ({
          left: Math.random() * 100,
          size: 2 + Math.random() * 4,
          dur: 7 + Math.random() * 9,
          delay: -Math.random() * 12,
        })),
      );
    }
  }, []);

  const startMusic = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = 0.8;
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;
    a.play().catch(() => {
      // Blocked by the browser: start on the guest's very next interaction.
      const retry = () =>
        a.play().then(() => events.forEach((t) => window.removeEventListener(t, retry))).catch(() => {});
      events.forEach((t) => window.addEventListener(t, retry, { passive: true }));
    });
  }, []);

  const openInvite = useCallback(() => {
    if (intro !== 'show') return;
    setIntro('open');
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
    startMusic();
    window.setTimeout(() => setIntro('gone'), 2800);
  }, [intro, startMusic]);

  /* ---------- menu + header ---------- */
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMenu(false), [pathname]); // close the menu after navigating

  useEffect(() => {
    const lock = intro === 'show' || intro === 'open' || menu;
    document.body.style.overflow = lock ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [intro, menu]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <>
      {/* animated background */}
      <div className="site-bg" aria-hidden="true">
        <span className="blob b1" /><span className="blob b2" /><span className="blob b3" />
        <span className="grain" />
      </div>

      {/* ENVELOPE INTRO */}
      {intro !== 'gone' && (
        <div id="intro" className={intro === 'open' ? 'open' : ''} onClick={openInvite}>
          {sparks.map((s, i) => (
            <i key={i} className="spark" style={{ left: `${s.left}%`, bottom: -10, width: s.size, height: s.size, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }} />
          ))}
          <div className="intro-top">
            <small>{guestName ? `${guestName}, you are invited to the wedding of` : 'You are invited to the wedding of'}</small>
            <span className="script">{couple.bride} &amp; {couple.groom}</span>
          </div>
          <div className="env" role="button" tabIndex={0} aria-label="Open invitation" onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openInvite()}>
            <div className="back" />
            <div className="card">
              <small>Together with their families</small>
              <span className="names">{couple.bride} &amp; {couple.groom}</span>
              <span className="when">15 · 01 · 2027</span>
            </div>
            <div className="p-left" /><div className="p-right" /><div className="p-bottom" />
            <div className="flap" />
            <div className="seal">A&amp;B</div>
          </div>
          <p className="tap">Tap the seal to open</p>
        </div>
      )}

      {/* HEADER */}
      <header className={`site-header${scrolled ? ' solid' : ''}`}>
        <Link href="/" className="brand script" aria-label="Home">A&amp;B</Link>
        <div className="head-actions">
          <Link href="/rsvp" className="head-rsvp">RSVP</Link>
          <button className="menu-btn" aria-expanded={menu} aria-controls="site-menu" onClick={() => setMenu((m) => !m)}>
            <span className="menu-label">{menu ? 'Close' : 'Menu'}</span>
            <span className={`burger${menu ? ' x' : ''}`}><i /><i /><i /></span>
          </button>
        </div>
      </header>

      {/* FULL-SCREEN MENU */}
      <div id="site-menu" className={`menu-overlay${menu ? ' open' : ''}`} aria-hidden={!menu}>
        <div className="menu-inner">
          <p className="menu-eyebrow">Abigael &amp; Brenton · 15 January 2027</p>
          <nav>
            <ul>
              {nav.map((n, i) => (
                <li key={n.href} style={{ transitionDelay: menu ? `${120 + i * 45}ms` : '0ms' }}>
                  <Link href={n.href} className={isActive(n.href) ? 'active' : ''} tabIndex={menu ? 0 : -1}>
                    <small>{String(i + 1).padStart(2, '0')}</small>{n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="menu-foot">Sultan Palace · Kikambala, Mtwapa</p>
        </div>
      </div>

      <main className="site-main">{children}</main>

      <footer className="site-footer">
        <p className="script">{couple.bride} &amp; {couple.groom}</p>
        <p className="tag">{couple.hashtag}</p>
        <ul className="foot-links">
          {nav.map((n) => <li key={n.href}><Link href={n.href}>{n.label}</Link></li>)}
        </ul>
        <div className="credit">
          <span className="heart" aria-hidden="true">❤️</span>
          <p className="from">From <b>Hirall Solutions</b></p>
          <p className="to">to {couple.bride} &amp; {couple.groom}</p>
          <p className="wish">With all our love and best wishes for your forever 💕</p>
        </div>
      </footer>

      <audio ref={audioRef} src="/music.mp3" loop preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      {intro !== 'show' && (
        <button id="music" className="on" aria-label={playing ? 'Pause music' : 'Play music'}
          onClick={() => { const a = audioRef.current; if (a) (a.paused ? a.play() : a.pause()); }}>
          {playing ? '❚❚' : '♪'}
        </button>
      )}
    </>
  );
}
