import { requireAdminApi } from '@/lib/admin-auth';
import { getAllResponses } from '@/lib/rsvp/store';
import { csvCell } from '@/lib/invitations/guests';

export const dynamic = 'force-dynamic';

/** Admin: one CSV row per person (declined RSVPs get one row), with contact, party, accommodation and check-in. */
export async function GET(req: Request) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  const rows = await getAllResponses();
  const header = [
    'Reference', 'Primary guest', 'Email', 'WhatsApp', 'RSVP', 'Person', 'Category', 'Primary?', 'Dietary',
    'Checked in', 'Accommodation', 'Units', 'Check-in date', 'Check-out date', 'Occupants', 'Estimated KES', 'Accommodation status',
    'Accessibility', 'Special requests', 'Message', 'Submitted',
  ];
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) {
    const people = r.attending && r.guests.length ? r.guests : [null];
    for (const g of people) {
      lines.push(
        [
          r.reference, r.fullName, r.email, r.whatsapp, r.attending ? 'Attending' : 'Declined',
          g ? g.fullName : '', g ? g.category : '', g ? (g.isPrimary ? 'yes' : '') : '', g?.dietary ?? '',
          g?.checkedInAt ?? '',
          r.stay?.roomName ?? '', r.stay?.units ?? '', r.stay?.checkIn ?? '', r.stay?.checkOut ?? '', r.stay?.occupantNames.join('; ') ?? '',
          r.stay?.estimatedAmount ?? '', r.stay?.status ?? '',
          r.accessibility ?? '', r.specialRequests ?? '', r.message ?? '', r.submittedAt,
        ].map(csvCell).join(','),
      );
    }
  }
  return new Response('﻿' + lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="rsvp-guest-list.csv"', 'Cache-Control': 'no-store' },
  });
}
