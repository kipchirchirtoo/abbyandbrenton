/** Fine line-art icons for the programme timeline. The icon is chosen from the event title. */
function pick(title: string) {
  const t = title.toLowerCase();
  if (t.includes('arriv')) return 'glasses';
  if (t.includes('ceremony') || t.includes('vow')) return 'rings';
  if (t.includes('photo') || t.includes('cocktail')) return 'camera';
  if (t.includes('reception') || t.includes('dinner')) return 'dinner';
  if (t.includes('danc') || t.includes('party')) return 'music';
  return 'rings';
}

export default function EventIcon({ title }: { title: string }) {
  const kind = pick(title);
  return (
    <span className="ev-icon" aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'glasses' && (
          <>
            <path d="M8 7h9l-1 9a3.5 3.5 0 0 1-7 0z" /><path d="M12.5 19.5V30M9 30h7" />
            <path d="M23 7h9l-1 9a3.5 3.5 0 0 1-7 0z" /><path d="M27.5 19.5V30M24 30h7" />
            <path d="M20 4v3M17.5 5.5 19 7M22.5 5.5 21 7" />
          </>
        )}
        {kind === 'rings' && (
          <>
            <circle cx="15" cy="25" r="8" /><circle cx="25" cy="25" r="8" />
            <path d="M12 12l3-5 3 5-3 3z" />
          </>
        )}
        {kind === 'camera' && (
          <>
            <rect x="5" y="12" width="30" height="21" rx="3" /><circle cx="20" cy="22.5" r="6" />
            <path d="M14 12l2-4h8l2 4M29 17h3" />
          </>
        )}
        {kind === 'dinner' && (
          <>
            <path d="M6 29h28M9.5 29a10.5 10.5 0 0 1 21 0" /><path d="M20 18.5V15" /><circle cx="20" cy="13.6" r="1.4" />
            <path d="M5 33h30" />
          </>
        )}
        {kind === 'music' && (
          <>
            <path d="M16 29V10l15-3v19" /><circle cx="12.5" cy="29" r="3.6" /><circle cx="27.5" cy="26" r="3.6" />
          </>
        )}
      </svg>
    </span>
  );
}
