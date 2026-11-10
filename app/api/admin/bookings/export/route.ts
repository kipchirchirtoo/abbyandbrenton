import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdminApi } from '@/lib/admin-auth';
import { csvCell } from '@/lib/invitations/guests';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;

  const { data, error } = await getAdminClient().from('wedding_bookings').select('*').order('created_at', { ascending: false });
  if (error) return Response.json({ error: 'Export failed.' }, { status: 500 });

  const head = ['Reference', 'Status', 'Booked at', 'Guest', 'Email', 'Phone', 'Hotel', 'Room', 'Rooms', 'Check-in', 'Check-out', 'Nights', 'Guests', 'Currency', 'Price per night', 'Total', 'Paid at', 'Notes', 'Payment note'];
  const lines = [head.map(csvCell).join(',')];
  for (const b of data ?? []) {
    lines.push(
      [b.reference, b.status, b.created_at, b.full_name, b.email, b.phone, b.hotel_name, b.room_name, b.rooms, b.check_in, b.check_out, b.nights, b.guests, b.currency, b.price_per_night, b.total, b.paid_at ?? '', b.notes ?? '', b.payment_note ?? '']
        .map(csvCell)
        .join(','),
    );
  }
  return new Response('﻿' + lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="room-bookings.csv"' },
  });
}
