import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHero from '@/components/site/PageHero';
import PrivateAccess from '@/components/PrivateAccess';
import { getSiteAccess } from '@/lib/guest-session';
import { getAdminClient } from '@/lib/supabase/admin';
import { applyPaystackResult, type BookingRow } from '@/lib/bookings';
import { paystackConfigured, verifyTransaction } from '@/lib/paystack';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your booking — Abigael & Brenton', robots: { index: false, follow: false } };

const fmt = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

async function load(reference: string) {
  const { data } = await getAdminClient().from('wedding_bookings').select('*').eq('reference', reference).maybeSingle<BookingRow>();
  return data;
}

export default async function BookingStatus({ params }: { params: Promise<{ reference: string }> }) {
  const access = await getSiteAccess();
  if (!access.allowed) return <PrivateAccess reason={access.reason} />;

  const { reference } = await params;
  if (!/^AB-[0-9A-F]{12}$/.test(reference)) notFound();

  let booking = await load(reference);
  if (!booking) notFound();

  // The browser just came back from Paystack. Don't trust the URL: ask Paystack directly (the webhook may be a moment behind).
  if ((booking.status === 'pending' || booking.status === 'failed') && paystackConfigured()) {
    const v = await verifyTransaction(reference).catch(() => null);
    if (v && v.status === 'success') {
      await applyPaystackResult(reference, { success: true, amountMinor: v.amountMinor, currency: v.currency, id: v.id });
      booking = (await load(reference)) ?? booking;
    }
  }

  const b = booking;
  const view =
    b.status === 'paid'
      ? { script: 'Booking confirmed', text: 'Thank you! Your payment was received and your room is booked.' }
      : b.status === 'review'
        ? { script: 'We’re checking your payment', text: 'We received your payment and the team is confirming your booking. You will hear from us shortly.' }
        : b.status === 'pending'
          ? { script: 'Confirming your payment', text: 'We have not received confirmation yet. If you completed the payment, please refresh this page in a minute.' }
          : { script: 'Booking not completed', text: 'This payment did not go through, so no room has been booked. You can try again.' };

  return (
    <>
      <PageHero eyebrow="Room booking" title={view.script} sub={view.text} image="/photos/gallery/venue-1.jpg" position="center" />
      <section className="reveal section">
        <div className="receipt">
          <p className="eyebrow">Reference</p>
          <p className="ref">{b.reference}</p>
          <dl>
            <div><dt>Hotel</dt><dd>{b.hotel_name}</dd></div>
            <div><dt>Room</dt><dd>{b.room_name} × {b.rooms}</dd></div>
            <div><dt>Check-in</dt><dd>{fmt(b.check_in)}</dd></div>
            <div><dt>Check-out</dt><dd>{fmt(b.check_out)}</dd></div>
            <div><dt>Guests</dt><dd>{b.guests}</dd></div>
            <div><dt>Total</dt><dd>{b.currency} {b.total.toLocaleString('en-KE')}</dd></div>
            <div><dt>Status</dt><dd><span className={`pill ${b.status === 'paid' ? 'accepted' : b.status === 'pending' || b.status === 'review' ? 'pending' : 'declined'}`}>{b.status === 'paid' ? 'Paid' : b.status === 'review' ? 'Being checked' : b.status === 'pending' ? 'Awaiting payment' : 'Not completed'}</span></dd></div>
          </dl>
          <div className="btn-row">
            {(b.status === 'failed' || b.status === 'cancelled') && <Link className="btn solid" href="/stay">Try again</Link>}
            <Link className="btn" href="/">Back to the wedding site</Link>
          </div>
        </div>
      </section>
    </>
  );
}
