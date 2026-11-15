import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdminApi } from '@/lib/admin-auth';
import { generateInvitationToken } from '@/lib/invitations/tokens';
import { parseCsv, validateGuest } from '@/lib/invitations/guests';

export const dynamic = 'force-dynamic';

/** CSV import. Header row required: full_name,email,guest_limit (guest_limit optional, default 1). */
export async function POST(req: Request) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;

  let csv = '';
  try {
    csv = String(((await req.json()) as { csv?: unknown }).csv ?? '');
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (csv.length > 500_000) return Response.json({ error: 'File too large.' }, { status: 413 });

  const rows = parseCsv(csv);
  if (rows.length < 2) return Response.json({ error: 'The CSV needs a header row and at least one guest.' }, { status: 400 });

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const col = (...names: string[]) => header.findIndex((h) => names.includes(h));
  const iName = col('full_name', 'name');
  const iEmail = col('email', 'email_address');
  const iLimit = col('guest_limit', 'guests', 'limit', 'seats');
  if (iName < 0 || iEmail < 0) {
    return Response.json({ error: 'Header must include name (or full_name) and email columns.' }, { status: 400 });
  }

  const valid: { full_name: string; email: string; guest_limit: number; token_hash: string }[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  rows.slice(1).forEach((r, i) => {
    const v = validateGuest({
      full_name: r[iName],
      email: r[iEmail],
      guest_limit: iLimit >= 0 && r[iLimit]?.trim() ? r[iLimit] : 1,
    });
    if ('error' in v) return errors.push(`Row ${i + 2}: ${v.error}`);
    if (seen.has(v.value.email)) return errors.push(`Row ${i + 2}: duplicate email in file (${v.value.email})`);
    seen.add(v.value.email);
    valid.push({ ...v.value, token_hash: generateInvitationToken().tokenHash });
  });
  if (valid.length > 500) return Response.json({ error: 'Import at most 500 guests at a time.' }, { status: 400 });

  let inserted = 0;
  if (valid.length) {
    // ignoreDuplicates: guests whose email already exists are skipped, never overwritten.
    const { data, error } = await getAdminClient()
      .from('wedding_guests')
      .upsert(valid, { onConflict: 'email', ignoreDuplicates: true })
      .select('id');
    if (error) return Response.json({ error: 'Import failed.' }, { status: 500 });
    inserted = data?.length ?? 0;
  }
  return Response.json({ inserted, skippedExisting: valid.length - inserted, errors });
}
