import { cookies } from 'next/headers';
import { ADMIN_COOKIE, createSessionValue, passwordMatches } from '@/lib/admin-auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!rateLimit(`admin-login:${clientIp(req)}`, 5, 15 * 60_000)) {
    return Response.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
  }
  let password = '';
  try {
    const body = (await req.json()) as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!passwordMatches(password)) {
    return Response.json({ error: 'Incorrect password.' }, { status: 401 });
  }
  const { value, maxAge } = createSessionValue();
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge,
  });
  return Response.json({ ok: true });
}
