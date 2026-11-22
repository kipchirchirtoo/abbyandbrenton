'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { nav, couple } from '@/lib/content';

/**
 * A full, natural sprig of baby's breath (gypsophila): a curved stem with alternating twigs that fork into
 * clouds of tiny blossoms. Built once from a fixed seed, so server and browser draw exactly the same thing.
 */
function buildSprig(seed: number) {
  let n = seed;
  const rnd = () => (n = (n * 16807) % 2147483647) / 2147483647;
  const P = (t: number): [number, number] => [
    (1 - t) ** 3 * 40 + 3 * (1 - t) ** 2 * t * 24 + 3 * (1 - t) * t ** 2 * 56 + t ** 3 * 38,
    (1 - t) ** 3 * 156 + 3 * (1 - t) ** 2 * t * 112 + 3 * (1 - t) * t ** 2 * 58 + t ** 3 * 6,
  ];
  const f = (v: number) => v.toFixed(1);
  const stems: string[] = ['M40 156 C24 112 56 58 38 6'];
  const blooms: [number, number, number][] = [[38, 5, 2.2], [36, 9, 1.6], [41, 8, 1.5]];
  const nodes = 15;
  for (let i = 0; i < nodes; i++) {
    const t = 0.16 + (0.82 * i) / (nodes - 1);
    const [x, y] = P(t);
    const dir = i % 2 ? 1 : -1;
    const len = (12 + rnd() * 15) * (1 - 0.38 * t);
    const ang = ((30 + rnd() * 30) * Math.PI) / 180;
    const ex = x + dir * Math.sin(ang) * len * 1.25;
    const ey = y - Math.cos(ang) * len;
    stems.push(`M${f(x)} ${f(y)} Q${f(x + dir * len * 0.55)} ${f(y - len * 0.1)} ${f(ex)} ${f(ey)}`);
    const forks = 3 + Math.floor(rnd() * 2);
    for (let k = 0; k < forks; k++) {
      const a = ((-58 + k * (116 / (forks - 1)) + (rnd() * 24 - 12)) * Math.PI) / 180;
      const fl = 3.5 + rnd() * 5;
      const fx = ex + Math.sin(a) * fl;
      const fy = ey - Math.cos(a) * fl;
      stems.push(`M${f(ex)} ${f(ey)} L${f(fx)} ${f(fy)}`);
      blooms.push([fx, fy, 1.2 + rnd() * 1.5]);
      if (rnd() > 0.45) blooms.push([fx + (rnd() * 4 - 2), fy - 1.5 - rnd() * 2, 0.9 + rnd() * 1.1]);
    }
  }
  const r2 = (v: number) => Math.round(v * 100) / 100; // rounded so the server and browser agree to the last digit
  return { d: stems.join(' '), blooms: blooms.map(([x, y, r]) => [r2(x), r2(y), r2(r)] as [number, number, number]) };
}
const SPRIG = buildSprig(11);

function Sprig({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <svg className={`${className ?? ''}${dark ? ' on-dark' : ''}`} viewBox="0 0 80 160" aria-hidden="true">
      <path d={SPRIG.d} className="sp-stem" fill="none" strokeLinecap="round" strokeWidth=".6" />
      {SPRIG.blooms.map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} className="sp-bloom" strokeWidth=".4" />
          <circle cx={x - r * 0.18} cy={y - r * 0.18} r={r * 0.5} className="sp-core" />
        </g>
      ))}
    </svg>
  );
}

/** Gold wax seal: uneven hand-pressed rim, raised inner disc, embossed monogram and a soft highlight. */
const SEAL_PATH = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 220; i++) {
    const t = (i / 220) * Math.PI * 2;
    const r = 42 + 2.4 * Math.sin(7 * t + 1) + 1.7 * Math.sin(11 * t + 2) + 1.1 * Math.sin(17 * t + 0.5) + 0.9 * Math.cos(5 * t);
    pts.push(`${(50 + r * Math.cos(t)).toFixed(2)} ${(50 + r * Math.sin(t)).toFixed(2)}`);
  }
  return `M${pts.join(' L')}Z`;
})();

function WaxSeal() {
  return (
    <svg className="wax" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id="wx-base" cx="34%" cy="28%" r="85%">
          <stop offset="0" stopColor="#f3e0a6" />
          <stop offset=".5" stopColor="#cfac5f" />
          <stop offset="1" stopColor="#8a6a26" />
        </radialGradient>
        <radialGradient id="wx-disc" cx="62%" cy="68%" r="85%">
          <stop offset="0" stopColor="#f0d98f" />
          <stop offset=".6" stopColor="#c9a65b" />
          <stop offset="1" stopColor="#a98838" />
        </radialGradient>
        <filter id="wx-blur"><feGaussianBlur stdDeviation="2.2" /></filter>
      </defs>
      <path d={SEAL_PATH} fill="url(#wx-base)" stroke="#7a5a1c" strokeOpacity=".5" strokeWidth=".8" />
      <circle cx="50" cy="50" r="33" fill="url(#wx-disc)" />
      <circle cx="50" cy="50" r="33" fill="none" stroke="#fff3c8" strokeOpacity=".55" strokeWidth="1.2" strokeDasharray="60 200" strokeDashoffset="-70" />
      <circle cx="50" cy="50" r="33" fill="none" stroke="#6e5116" strokeOpacity=".5" strokeWidth="1.2" strokeDasharray="70 200" strokeDashoffset="-10" />
      <circle cx="50" cy="50" r="28" fill="none" stroke="#7a5a1c" strokeOpacity=".3" strokeWidth=".7" />
      <g fontFamily="'Cormorant Garamond',serif" fontSize="27" fontWeight="500" textAnchor="middle">
        <g fill="#fff3c8" fillOpacity=".75" transform="translate(.9 .9)">
          <text x="37" y="59">A</text><text x="63" y="59">B</text>
          <rect x="49.6" y="36" width="1.1" height="28" />
        </g>
        <g fill="#6f5218">
          <text x="37" y="59">A</text><text x="63" y="59">B</text>
          <rect x="49.6" y="36" width="1.1" height="28" />
        </g>
      </g>
      <ellipse cx="34" cy="28" rx="14" ry="7" fill="#fff" opacity=".35" filter="url(#wx-blur)" transform="rotate(-30 34 28)" />
    </svg>
  );
}

/** Samples a smooth closed curve through the points densely (Catmull-Rom), as plain coordinates. */
function sampleClosed(pts: [number, number][], per = 12): [number, number][] {
  const n = pts.length;
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  return out;
}

/** Smooth outline with a very gentle, slow wave along the edge (rounded so server and browser agree exactly). */
function softOutline(pts: [number, number][], amp: number, wavelength: number): string {
  const d = sampleClosed(pts);
  const n = d.length;
  let s = 0;
  const f = (v: number) => (Math.round(v * 10) / 10).toString();
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = d[(i - 1 + n) % n], b = d[i], c = d[(i + 1) % n];
    s += Math.hypot(b[0] - a[0], b[1] - a[1]);
    const tx = c[0] - a[0], ty = c[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    const off = amp * Math.sin((s / wavelength) * Math.PI * 2 + 1.1);
    out.push(`${f(b[0] + (ty / len) * off)} ${f(b[1] - (tx / len) * off)}`);
  }
  return `M${out.join(' L')}Z`;
}

/**
 * The vellum: one large sheer sheet pinned at the card's top-right corner and falling diagonally down to the left,
 * over the envelope's edge and the left of the card.
 */
const PIN: [number, number] = [366, 70];
const VELLUM = softOutline(
  [
    PIN, [322, 98], [264, 140], [206, 192], [150, 252], [108, 322], [86, 394], [60, 470], [32, 560], [12, 646], [18, 712], [60, 744], [122, 757],
    [182, 761], [232, 750], [238, 700], [246, 640], [264, 570], [292, 490], [324, 400], [348, 310], [363, 222], [372, 140], [372, 94],
  ],
  1.3,
  150,
);

/** A soft fold: a thin lens from the pin to an endpoint, bowed to one side like hanging fabric. */
function lens(end: [number, number], width: number, bend: number): string {
  const f = (v: number) => (Math.round(v * 10) / 10).toString();
  const dx = end[0] - PIN[0], dy = end[1] - PIN[1];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  const c1: [number, number] = [PIN[0] + dx * 0.32 + nx * bend, PIN[1] + dy * 0.32 + ny * bend];
  const c2: [number, number] = [PIN[0] + dx * 0.7 + nx * bend, PIN[1] + dy * 0.7 + ny * bend];
  const p = (c: [number, number], k: number) => `${f(c[0] + nx * k)} ${f(c[1] + ny * k)}`;
  return `M${f(PIN[0])} ${f(PIN[1])} C${p(c1, width)} ${p(c2, width)} ${f(end[0])} ${f(end[1])} C${p(c2, -width)} ${p(c1, -width)} ${f(PIN[0])} ${f(PIN[1])}Z`;
}

/** Light folds (catching the light) and the soft shadows between them. */
const VELLUM_LIGHT = [
  lens([22, 690], 17, 10), lens([84, 746], 15, -8), lens([150, 760], 14, 9), lens([210, 756], 12, -6),
  lens([252, 590], 12, 8), lens([300, 440], 10, -6), lens([340, 300], 8, 5),
];
const VELLUM_SHADE = [
  lens([50, 722], 9, 4), lens([116, 756], 9, -3), lens([182, 760], 8, 4), lens([236, 668], 8, -4),
  lens([278, 510], 7, 4), lens([320, 370], 6, -3),
];

/** Centre line of the satin ribbon along the bottom edge. */
const RIBBON = 'M-1200 790 C-700 722 -300 802 60 758 C180 744 240 746 340 758 C700 802 1000 722 1600 772';

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

      {/* ENVELOPE INTRO (burgundy suede envelope, wax seal, vellum, blush card) */}
      {intro !== 'gone' && (
        <div id="intro" className={intro === 'open' ? 'open' : ''} onClick={openInvite}>
          <Sprig className="sprig o1" dark /><Sprig className="sprig o2" dark /><Sprig className="sprig o3" dark /><Sprig className="sprig o4" dark />
          {sparks.map((s, i) => (
            <i key={i} className="spark" style={{ left: `${s.left}%`, bottom: -10, width: s.size, height: s.size, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }} />
          ))}

          <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
            <filter id="card-deckle" x="-4%" y="-3%" width="108%" height="106%">
              <feTurbulence type="fractalNoise" baseFrequency=".018 .024" numOctaves="2" seed="7" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </svg>

          <div className="stage" role="button" tabIndex={0} aria-label="Open invitation" onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openInvite()}>
            <div className="screen">
              {/* envelope: suede with a large flap folded open diagonally, crisp creases, soft shadows and a satin ribbon */}
              <svg className="env-svg" viewBox="0 0 400 770" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="ev-flapA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a03a50" /><stop offset="1" stopColor="#7c2538" /></linearGradient>
                  <linearGradient id="ev-flapB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7e2337" /><stop offset="1" stopColor="#5b1829" /></linearGradient>
                  <linearGradient id="ev-pocket" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#651a2a" /><stop offset="1" stopColor="#47101e" /></linearGradient>
                  <linearGradient id="ev-pocketR" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5d1727" /><stop offset="1" stopColor="#420f1c" /></linearGradient>
                  <linearGradient id="ev-bottom" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4c1220" /><stop offset="1" stopColor="#32090f" /></linearGradient>
                  <linearGradient id="ev-foldshade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity=".5" /><stop offset="1" stopColor="#000" stopOpacity="0" /></linearGradient>
                  <filter id="ev-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9" /></filter>
                  <filter id="ev-rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".012 .016" numOctaves="2" seed="3" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" /></filter>
                  <filter id="ev-fine"><feGaussianBlur stdDeviation=".7" /></filter>
                  <filter id="ev-sheen"><feGaussianBlur stdDeviation="2.6" /></filter>
                  <radialGradient id="ev-vig" gradientUnits="userSpaceOnUse" cx="200" cy="385" r="1150"><stop offset=".3" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".55" /></radialGradient>
                </defs>
                <rect x="-1600" y="-1300" width="3600" height="3200" fill="#4f1422" />
                <g filter="url(#ev-rough)">
                <path d="M1500 40 L420 250 L396 705 L1500 1000Z" fill="url(#ev-pocketR)" stroke="#561525" strokeWidth="10" strokeLinejoin="round" />
                <path d="M-1000 125 L204 222 L142 690 L-1000 1100Z" fill="url(#ev-pocket)" stroke="#5a1626" strokeWidth="10" strokeLinejoin="round" />
                <path d="M-1000 1100 L142 690 L396 705 L1500 1000 L1500 1300 L-1000 1300Z" fill="url(#ev-bottom)" stroke="#3a0b16" strokeWidth="10" strokeLinejoin="round" />
                {/* shadow the open flap casts on the envelope */}
                <path d="M-1000 125 L204 222 L204 300 L-1000 220Z" fill="url(#ev-foldshade)" opacity=".7" />
                <path d="M-1000 -420 L186 -420 L204 222 L-1000 125Z" fill="#000" opacity=".5" filter="url(#ev-blur)" transform="translate(6 16)" />
                {/* the flap: two facets meeting at a crisp crease */}
                <path d="M-1000 -420 L-420 -420 L204 222 L-1000 125Z" fill="url(#ev-flapB)" stroke="#6a1d2f" strokeWidth="8" strokeLinejoin="round" />
                <path d="M-420 -420 L186 -420 L204 222Z" fill="url(#ev-flapA)" stroke="#8a2b40" strokeWidth="8" strokeLinejoin="round" />
                <path d="M-420 -420 L204 222" stroke="#2a060d" strokeOpacity=".55" strokeWidth="1.6" fill="none" transform="translate(1.2 1.6)" />
                <path d="M-420 -420 L204 222" stroke="#ffdede" strokeOpacity=".42" strokeWidth="1" fill="none" />
                <g fill="none" filter="url(#ev-fine)">
                  <path d="M-1000 122 L200 218" stroke="#ffd9d9" strokeOpacity=".3" strokeWidth="1.6" />
                  <path d="M185 -420 L203 218" stroke="#ffd9d9" strokeOpacity=".28" strokeWidth="1.4" />
                  <path d="M204 230 L142 684" stroke="#fff" strokeOpacity=".12" strokeWidth="1.2" />
                  <path d="M146 692 L-1000 1096" stroke="#fff" strokeOpacity=".09" strokeWidth="1.2" />
                  <path d="M420 256 L396 700" stroke="#fff" strokeOpacity=".1" strokeWidth="1.2" />
                </g>
                </g>
                {/* satin ribbon along the bottom */}
                <g fill="none" strokeLinecap="butt">
                  <path d={RIBBON} stroke="#000" strokeOpacity=".4" strokeWidth="46" filter="url(#ev-blur)" transform="translate(0 10)" />
                  <path d={RIBBON} stroke="#5a1626" strokeWidth="42" />
                  <path d={RIBBON} stroke="#3a0b16" strokeOpacity=".7" strokeWidth="9" transform="translate(0 14)" filter="url(#ev-sheen)" />
                  <path d={RIBBON} stroke="#c0586c" strokeOpacity=".75" strokeWidth="8" transform="translate(0 -11)" filter="url(#ev-sheen)" />
                  <path d={RIBBON} stroke="#ffd0d6" strokeOpacity=".5" strokeWidth="2" transform="translate(0 -13)" filter="url(#ev-fine)" />
                </g>
                <rect x="-1600" y="-1300" width="3600" height="3200" fill="url(#ev-vig)" />
              </svg>
              <Sprig className="sprig d1" dark /><Sprig className="sprig d2" dark /><Sprig className="sprig d3" dark />

              <div className="card">
                <span className="ghost" aria-hidden="true"><b>15</b><b>01</b><b>27</b></span>
                <Sprig className="sprig c1" /><Sprig className="sprig c2" />
                <span className="vline" aria-hidden="true" />
                <div className="card-body">
                  {guestName && <small className="dear">Dear {guestName}</small>}
                  <small>Together<br />with their families</small>
                  <span className="names">{couple.bride.toUpperCase()}<em>and</em>{couple.groom.toUpperCase()}</span>
                  <small>Invite you to<br />their wedding</small>
                  <span className="month">January</span>
                  <span className="day">15</span>
                  <span className="year">2027</span>
                  <small className="at">Two o’clock<br />in the afternoon</small>
                  <small className="at">Sultan Palace<br />Kikambala, Mtwapa</small>
                  <span className="pill">RSVP <b>›</b></span>
                </div>
              </div>

              {/* vellum: one sheer sheet pinned at the card's top-right corner, soft folds radiating from the pin */}
              <svg className="veil-svg" viewBox="0 0 400 770" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="vl-fill" x1="1" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fff" stopOpacity=".26" />
                    <stop offset=".5" stopColor="#fff6ee" stopOpacity=".12" />
                    <stop offset="1" stopColor="#fff" stopOpacity=".14" />
                  </linearGradient>
                  <linearGradient id="vl-curl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fff" stopOpacity=".7" />
                    <stop offset="1" stopColor="#f3e2d8" stopOpacity=".18" />
                  </linearGradient>
                  <clipPath id="vl-clip"><path d={VELLUM} /></clipPath>
                  <filter id="vl-soft"><feGaussianBlur stdDeviation="1" /></filter>
                  <filter id="vl-fold" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4.5" /></filter>
                  <filter id="vl-edge" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3" /></filter>
                </defs>
                <path d={VELLUM} fill="url(#vl-fill)" />
                <g clipPath="url(#vl-clip)">
                  {VELLUM_SHADE.map((d, i) => <path key={'s' + i} d={d} fill="#4a0f1c" fillOpacity=".16" filter="url(#vl-fold)" />)}
                  {VELLUM_LIGHT.map((d, i) => <path key={'l' + i} d={d} fill="#fff" fillOpacity={i % 2 ? 0.24 : 0.3} filter="url(#vl-fold)" />)}
                  <path d={VELLUM} fill="none" stroke="#4a0f1c" strokeOpacity=".1" strokeWidth="14" filter="url(#vl-edge)" />
                </g>
                <path d={VELLUM} fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.5" filter="url(#vl-soft)" />
                <path d="M18 712 C34 738 80 756 140 760 C186 762 222 756 234 748 C208 744 176 738 138 730 C94 720 52 706 18 712Z" fill="url(#vl-curl)" />
                <path d="M366 66 C380 82 392 108 396 140 C382 122 372 100 366 66Z" fill="url(#vl-curl)" />
              </svg>
              <div className="seal"><WaxSeal /></div>
              <p className="tap">Tap the seal to open</p>
            </div>
          </div>
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
