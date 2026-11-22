/** A hand-drawn style map of the venue area: soft streets, the coast and a burgundy pin. Decorative; real directions are linked beside it. */
export default function SketchMap({ name }: { name: string }) {
  return (
    <svg className="sketch-map" viewBox="0 0 400 300" role="img" aria-label={`Sketch map showing ${name}`}>
      <defs>
        <linearGradient id="sm-sea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ecd2c6" /><stop offset="1" stopColor="#e0b9ae" /></linearGradient>
        <filter id="sm-shadow"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#5c1a27" floodOpacity=".35" /></filter>
      </defs>
      <rect width="400" height="300" fill="#f7e8df" />
      <path d="M250 0 C262 60 300 90 292 150 C286 200 330 240 400 250 L400 0Z" fill="url(#sm-sea)" opacity=".75" />
      <path d="M250 0 C262 60 300 90 292 150 C286 200 330 240 400 250" fill="none" stroke="#c9a08f" strokeWidth="1.2" strokeDasharray="4 4" />
      <g fill="none" stroke="#b79482" strokeWidth="1" strokeLinecap="round" opacity=".85">
        <path d="M-10 60 C80 70 140 40 250 70" /><path d="M-10 130 C60 120 120 150 230 120" /><path d="M-10 210 C90 200 150 230 250 205" />
        <path d="M40 -10 C50 60 30 120 60 200 C70 240 60 270 70 310" /><path d="M120 -10 C110 50 140 100 130 160 C122 210 150 260 140 310" />
        <path d="M190 -10 C196 70 176 120 200 180 C214 220 196 270 206 310" />
        <path d="M-10 100 L410 180" strokeWidth="1.6" stroke="#a9806c" /><path d="M20 310 L260 -10" strokeWidth="1.6" stroke="#a9806c" />
      </g>
      <g fill="#e9d2c4" stroke="#c3a08e" strokeWidth=".8" opacity=".9">
        <rect x="150" y="150" width="26" height="18" rx="2" /><rect x="84" y="86" width="22" height="16" rx="2" /><rect x="208" y="230" width="28" height="18" rx="2" /><rect x="52" y="224" width="22" height="16" rx="2" />
      </g>
      <g filter="url(#sm-shadow)" transform="translate(196 118)">
        <path d="M0 52C-18 28-26 18-26 2a26 26 0 0 1 52 0c0 16-8 26-26 50z" fill="#5c1a27" />
        <circle cx="0" cy="2" r="9" fill="#e6cb86" /><circle cx="0" cy="2" r="9" fill="none" stroke="#fff3c8" strokeOpacity=".6" />
      </g>
      <ellipse cx="196" cy="172" rx="16" ry="4" fill="#5c1a27" opacity=".18" />
    </svg>
  );
}
