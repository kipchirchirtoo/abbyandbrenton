const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NewGuest = { full_name: string; email: string; guest_limit: number };

export function validateGuest(g: unknown): { error: string } | { value: NewGuest } {
  if (!g || typeof g !== 'object') return { error: 'Invalid guest.' };
  const o = g as Record<string, unknown>;
  const full_name = typeof o.full_name === 'string' ? o.full_name.trim().slice(0, 120) : '';
  const email = typeof o.email === 'string' ? o.email.trim().toLowerCase().slice(0, 254) : '';
  const guest_limit = Number(o.guest_limit ?? 1);
  if (!full_name) return { error: 'Name is required.' };
  if (!EMAIL_RE.test(email)) return { error: `Invalid email: ${email || '(empty)'}` };
  if (!Number.isInteger(guest_limit) || guest_limit < 1 || guest_limit > 10) {
    return { error: 'Guest limit must be between 1 and 10.' };
  }
  return { value: { full_name, email, guest_limit } };
}

/** Minimal RFC-4180-style CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

/** Neutralises spreadsheet formula injection and quotes a value for CSV output. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
