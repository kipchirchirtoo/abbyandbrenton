/** A destination wedding: planes cross the sky, a train and a car travel along the coast. Pure CSS, no scripts. */
const Plane = () => (
  <svg viewBox="0 0 64 24" aria-hidden="true">
    <path d="M2 12 L18 9 L36 3 L40 3 L33 10 L55 8 C60 8 63 10 63 12 C63 14 60 16 55 16 L33 14 L40 21 L36 21 L18 15 L2 12Z" fill="currentColor" />
  </svg>
);

export default function TravelScene() {
  return (
    <div className="travel" aria-hidden="true">
      <span className="plane p1"><Plane /></span>
      <span className="plane p2"><Plane /></span>
      <div className="ground">
        <svg className="train" viewBox="0 0 200 26">
          <g fill="currentColor">
            <rect x="0" y="4" width="46" height="16" rx="4" />
            <rect x="50" y="4" width="46" height="16" rx="3" />
            <rect x="100" y="4" width="46" height="16" rx="3" />
            <path d="M150 4h30c8 0 16 6 20 16h-50z" />
          </g>
          <g fill="#000" opacity=".35">
            <rect x="6" y="8" width="8" height="6" rx="1" /><rect x="20" y="8" width="8" height="6" rx="1" /><rect x="34" y="8" width="8" height="6" rx="1" />
            <rect x="56" y="8" width="8" height="6" rx="1" /><rect x="70" y="8" width="8" height="6" rx="1" /><rect x="84" y="8" width="8" height="6" rx="1" />
            <rect x="106" y="8" width="8" height="6" rx="1" /><rect x="120" y="8" width="8" height="6" rx="1" /><rect x="134" y="8" width="8" height="6" rx="1" />
          </g>
          <g fill="currentColor"><circle cx="14" cy="22" r="3" /><circle cx="36" cy="22" r="3" /><circle cx="60" cy="22" r="3" /><circle cx="88" cy="22" r="3" /><circle cx="160" cy="22" r="3" /><circle cx="186" cy="22" r="3" /></g>
        </svg>
        <svg className="car" viewBox="0 0 64 26">
          <path d="M4 18 L8 10 C10 7 13 6 17 6 H36 C41 6 45 9 48 13 L58 15 C61 16 62 17 62 19 V21 H4Z" fill="currentColor" />
          <circle cx="16" cy="21" r="4" fill="currentColor" stroke="#000" strokeOpacity=".35" strokeWidth="1.5" />
          <circle cx="48" cy="21" r="4" fill="currentColor" stroke="#000" strokeOpacity=".35" strokeWidth="1.5" />
        </svg>
        <i className="road" />
      </div>
    </div>
  );
}
