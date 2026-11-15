import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdminApi } from '@/lib/admin-auth';
import { csvCell } from '@/lib/invitations/guests';

export const dynamic = 'force-dynamic';

/** CSV of every guest with their RSVP (opens in Excel / Google Sheets). */
export async function GET(req: Request) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;

  const { data, error } = await getAdminClient()
    .from('wedding_guests')
    .select(
      'full_name,email,guest_limit,invitation_status,email_sent_at,wedding_rsvps(attending,attending_count,dietary_requirements,message,submitted_at,updated_at,wedding_rsvp_attendees(full_name))',
    )
    .order('full_name');
  if (error) return Response.json({ error: 'Export failed.' }, { status: 500 });

  const head = ['Name', 'Email', 'Guest limit', 'Invitation status', 'Email sent', 'Attending', 'Attending count', 'Attendees', 'Dietary', 'Message', 'Replied at'];
  const lines = [head.map(csvCell).join(',')];
  for (const g of data ?? []) {
    const raw = g.wedding_rsvps as unknown;
    const r = (Array.isArray(raw) ? raw[0] : raw) as
      | { attending: boolean; attending_count: number; dietary_requirements: string | null; message: string | null; updated_at: string; wedding_rsvp_attendees: { full_name: string }[] }
      | null
      | undefined;
    lines.push(
      [
        g.full_name,
        g.email,
        g.guest_limit,
        g.invitation_status,
        g.email_sent_at ?? '',
        r ? (r.attending ? 'Yes' : 'No') : '',
        r?.attending_count ?? '',
        (r?.wedding_rsvp_attendees ?? []).map((a) => a.full_name).join('; '),
        r?.dietary_requirements ?? '',
        r?.message ?? '',
        r?.updated_at ?? '',
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return new Response('﻿' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="wedding-guest-list.csv"',
    },
  });
}
