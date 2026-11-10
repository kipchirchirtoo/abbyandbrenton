import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdminApi } from '@/lib/admin-auth';
import { generateInvitationToken } from '@/lib/invitations/tokens';
import { validateGuest } from '@/lib/invitations/guests';

export const dynamic = 'force-dynamic';

/** Add one guest. A placeholder token hash is stored; the real link is created when sending. */
export async function POST(req: Request) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const v = validateGuest(body);
  if ('error' in v) return Response.json({ error: v.error }, { status: 400 });

  const { error } = await getAdminClient()
    .from('wedding_guests')
    .insert({ ...v.value, token_hash: generateInvitationToken().tokenHash });
  if (error) {
    const dup = error.code === '23505';
    return Response.json({ error: dup ? 'A guest with that email already exists.' : 'Could not add guest.' }, { status: dup ? 409 : 500 });
  }
  return Response.json({ ok: true });
}

/** Edit name / email / limit, or revoke / restore. */
export async function PATCH(req: Request) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return Response.json({ error: 'Missing id.' }, { status: 400 });
  const db = getAdminClient();
  const now = new Date().toISOString();

  if (body.action === 'revoke') {
    // Also rotate the hash so the leaked link can never match again, even if restored.
    const { error } = await db
      .from('wedding_guests')
      .update({ invitation_status: 'revoked', token_hash: generateInvitationToken().tokenHash, updated_at: now })
      .eq('id', id);
    return error ? Response.json({ error: 'Could not revoke.' }, { status: 500 }) : Response.json({ ok: true });
  }
  if (body.action === 'restore') {
    const { error } = await db.from('wedding_guests').update({ invitation_status: 'pending', updated_at: now }).eq('id', id);
    return error ? Response.json({ error: 'Could not restore.' }, { status: 500 }) : Response.json({ ok: true });
  }

  const v = validateGuest(body);
  if ('error' in v) return Response.json({ error: v.error }, { status: 400 });
  const { error } = await db.from('wedding_guests').update({ ...v.value, updated_at: now }).eq('id', id);
  if (error) return Response.json({ error: error.code === '23505' ? 'That email is already used.' : 'Could not update.' }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'Missing id.' }, { status: 400 });
  const { error } = await getAdminClient().from('wedding_guests').delete().eq('id', id);
  return error ? Response.json({ error: 'Could not delete.' }, { status: 500 }) : Response.json({ ok: true });
}
