import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Minimal admin authentication: one shared admin password (ADMIN_PASSWORD) and an
 * HMAC-signed, httpOnly, SameSite=Strict session cookie (signed with ADMIN_SESSION_SECRET).
 */
export const ADMIN_COOKIE = 'wedding_admin';
const SESSION_HOURS = 12;

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('ADMIN_SESSION_SECRET must be set (at least 32 characters).');
  return s;
}

const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url');

export function passwordMatches(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // Hash both sides so lengths match and the comparison is constant-time.
  const a = createHash('sha256').update(candidate).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export function createSessionValue(): { value: string; maxAge: number } {
  const expires = Date.now() + SESSION_HOURS * 3600_000;
  const payload = String(expires);
  return { value: `${payload}.${sign(payload)}`, maxAge: SESSION_HOURS * 3600 };
}

function verifySession(value: string | undefined): boolean {
  if (!value) return false;
  const [payload, sig] = value.split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(payload) > Date.now();
}

export async function isAdmin(): Promise<boolean> {
  try {
    const jar = await cookies();
    return verifySession(jar.get(ADMIN_COOKIE)?.value);
  } catch {
    return false;
  }
}

/** For admin pages: redirects to the login screen when not signed in. */
export async function requireAdminPage() {
  if (!(await isAdmin())) redirect('/admin/login');
}

/** For admin API routes: returns a 401 Response, or null when the caller is an admin. */
export async function requireAdminApi(req: Request): Promise<Response | null> {
  if (!(await isAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  // CSRF defence in depth (cookie is SameSite=Strict): state-changing requests must be same-origin.
  if (req.method !== 'GET') {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    if (origin && host && new URL(origin).host !== host) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  return null;
}
