import { requireAdminApi } from '@/lib/admin-auth';
import { getAllResponses, getResponseByQr, matchesQuery } from '@/lib/rsvp/store';
import { isWellFormedQr } from '@/lib/rsvp/qr';

export const dynamic = 'force-dynamic';

/** Pulls the verification id out of a scanned QR (a /v/<id> URL) or a pasted id. */
function extractCode(raw: string): string | null {
  const s = raw.trim();
  const m = s.match(/\/v\/([A-Za-z0-9_-]{22})(?:[/?#]|$)/);
  const code = m ? m[1] : s;
  return isWellFormedQr(code) ? code : null;
}

/**
 * Admin only. Either { code } (a scanned QR) to fetch one invitation, or { query } to search by
 * name, phone, email or reference when a guest has lost their card.
 */
export async function POST(req: Request) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  const b = (await req.json().catch(() => ({}))) as { code?: unknown; query?: unknown };
  try {
    if (typeof b.code === 'string') {
      const code = extractCode(b.code);
      if (!code) return Response.json({ error: 'That is not one of our invitation QR codes.' }, { status: 400 });
      const record = await getResponseByQr(code);
      if (!record) return Response.json({ error: 'No invitation matches this QR code.' }, { status: 404 });
      return Response.json({ record });
    }
    if (typeof b.query === 'string') {
      const q = b.query.trim();
      if (q.length < 2) return Response.json({ error: 'Type at least 2 characters.' }, { status: 400 });
      const all = await getAllResponses();
      const records = all.filter((r) => r.attending && matchesQuery(r, q)).slice(0, 25);
      return Response.json({ records });
    }
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  } catch {
    return Response.json({ error: 'Lookup failed. Please try again.' }, { status: 500 });
  }
}
