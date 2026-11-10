import { requireAdminPage } from '@/lib/admin-auth';
import { getAdminGuests } from '@/lib/admin-data';
import GuestsManager from './GuestsManager';

export const dynamic = 'force-dynamic';

export default async function GuestsPage() {
  await requireAdminPage();
  const guests = await getAdminGuests();

  const invited = guests.filter((g) => g.invitation_status !== 'revoked');
  const confirmed = guests.filter((g) => g.rsvp?.attending);
  const declined = guests.filter((g) => g.rsvp && !g.rsvp.attending);
  const awaiting = invited.length - confirmed.length - declined.length;
  const headcount = confirmed.reduce((n, g) => n + (g.rsvp?.attending_count ?? 0), 0);

  return (
    <>
      <h1>Guests</h1>
      <div className="stats">
        <div><b>{invited.length}</b><span>Invited</span></div>
        <div><b>{confirmed.length}</b><span>Confirmed ({headcount} people)</span></div>
        <div><b>{declined.length}</b><span>Declined</span></div>
        <div><b>{awaiting}</b><span>Awaiting response</span></div>
      </div>
      <GuestsManager guests={guests} />
    </>
  );
}
