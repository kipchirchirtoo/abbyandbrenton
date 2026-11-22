import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { getAllResponses } from '@/lib/rsvp/store';
import { getRsvpStatus } from '@/lib/rsvp/state';
import { computeStats } from '@/lib/rsvp/stats';
import { stayRooms } from '@/lib/rsvp/validation';
import RsvpAdmin from './RsvpAdmin';

export const dynamic = 'force-dynamic';

export default async function RsvpDashboard() {
  await requireAdminPage();
  let records: Awaited<ReturnType<typeof getAllResponses>>;
  try {
    records = await getAllResponses();
  } catch {
    return (
      <>
        <h1>RSVP &amp; check-in</h1>
        <div className="admin-card">
          <p className="form-error" role="alert">The database could not be reached, so RSVPs cannot be shown.</p>
          <p className="hint">Check SUPABASE_URL and SUPABASE_SECRET_KEY, and that every migration in supabase/migrations has been run (the newest is 202611220001_rsvp_system.sql).</p>
        </div>
      </>
    );
  }
  const status = await getRsvpStatus();

  // Personal invitations that have not been answered yet (not revoked, no RSVP linked to them).
  let pendingInvites = 0;
  try {
    const { data } = await getAdminClient().from('wedding_guests').select('id,invitation_status');
    const answered = new Set(records.map((r) => r.guestId).filter(Boolean));
    pendingInvites = (data ?? []).filter((g) => g.invitation_status !== 'revoked' && !answered.has(g.id) && g.invitation_status !== 'accepted' && g.invitation_status !== 'declined').length;
  } catch {
    /* the older invitation tables are optional */
  }

  const stats = computeStats(records, pendingInvites);
  const rooms = stayRooms();

  return (
    <>
      <h1>RSVP &amp; check-in</h1>
      <p className="hint">
        <Link href="/admin/checkin">Open the wedding-day scanner →</Link>
      </p>

      <h2>RSVPs</h2>
      <div className="stats">
        <div><b>{stats.responses}</b><span>Total responses</span></div>
        <div><b>{stats.confirmedInvitations}</b><span>Confirmed invitations</span></div>
        <div><b>{stats.totalGuests}</b><span>Total guests</span></div>
        <div><b>{stats.adults}</b><span>Adults</span></div>
        <div><b>{stats.children}</b><span>Children</span></div>
        <div><b>{stats.declined}</b><span>Declined invitations</span></div>
        <div><b>{stats.pending}</b><span>Pending (invited, no reply)</span></div>
      </div>

      <h2>Accommodation requests</h2>
      <div className="stats">
        <div><b>{stats.stay.total}</b><span>Total requests</span></div>
        {rooms.map((r) => (
          <div key={r.id}>
            <b>{stats.stay.byType[r.id]?.units ?? 0}</b>
            <span>{r.name}s requested{stats.stay.byType[r.id] ? ` (${stats.stay.byType[r.id].requests} request${stats.stay.byType[r.id].requests === 1 ? '' : 's'})` : ''}</span>
          </div>
        ))}
        <div><b>{stats.stay.pending}</b><span>Pending</span></div>
        <div><b>{stats.stay.confirmed}</b><span>Confirmed</span></div>
        <div><b>{stats.stay.declined}</b><span>Declined</span></div>
      </div>

      <h2>Check-in</h2>
      <div className="stats">
        <div><b>{stats.checkin.expected}</b><span>Guests expected</span></div>
        <div><b>{stats.checkin.checkedIn}</b><span>Checked in</span></div>
        <div><b>{stats.checkin.notCheckedIn}</b><span>Not checked in</span></div>
        <div><b>{stats.checkin.groups}/{stats.checkin.groupsTotal}</b><span>Groups fully in</span></div>
        <div><b>{stats.checkin.individuals}</b><span>Individuals checked in</span></div>
        <div><b>{stats.checkin.percent}%</b><span>Check-in progress</span></div>
      </div>
      <div className="progress" aria-hidden="true"><i style={{ width: `${stats.checkin.percent}%` }} /></div>

      <RsvpAdmin records={records} mode={status.mode} open={status.open} closesAt={status.closesAt} />
    </>
  );
}
