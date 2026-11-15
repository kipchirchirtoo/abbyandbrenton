import { requireAdminPage } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase/admin';
import type { BookingRow } from '@/lib/bookings';
import BookingsTable from './BookingsTable';

export const dynamic = 'force-dynamic';

export default async function BookingsPage() {
  await requireAdminPage();
  const { data, error } = await getAdminClient()
    .from('wedding_bookings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw new Error('Could not load bookings.');
  const bookings = (data ?? []) as BookingRow[];

  const paid = bookings.filter((b) => b.status === 'paid');
  const revenue = paid.reduce((n, b) => n + b.total, 0);
  const roomNights = paid.reduce((n, b) => n + b.nights * b.rooms, 0);
  const review = bookings.filter((b) => b.status === 'review').length;
  const pending = bookings.filter((b) => b.status === 'pending').length;

  return (
    <>
      <h1>Room bookings</h1>
      <div className="stats">
        <div><b>KES {revenue.toLocaleString('en-KE')}</b><span>Paid (settles to your bank via Paystack)</span></div>
        <div><b>{paid.length}</b><span>Paid bookings · {roomNights} room-nights</span></div>
        <div><b>{pending}</b><span>Awaiting payment</span></div>
        <div><b>{review}</b><span>Need review</span></div>
      </div>
      <BookingsTable bookings={bookings} />
    </>
  );
}
