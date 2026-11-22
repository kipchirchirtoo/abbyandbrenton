import { getRsvpStatus } from '@/lib/rsvp/state';

export const dynamic = 'force-dynamic';

/** Server-authoritative RSVP state + server clock, so every visitor's countdown agrees with the server. */
export async function GET() {
  const { open, mode, closesAt, serverNow } = await getRsvpStatus();
  return Response.json({ open, mode, closesAt, serverNow }, { headers: { 'Cache-Control': 'no-store' } });
}
