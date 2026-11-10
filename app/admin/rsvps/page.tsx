import { requireAdminPage } from '@/lib/admin-auth';
import { getAdminGuests } from '@/lib/admin-data';

export const dynamic = 'force-dynamic';

export default async function RsvpsPage() {
  await requireAdminPage();
  const replied = (await getAdminGuests()).filter((g) => g.rsvp);
  const attending = replied.filter((g) => g.rsvp!.attending);

  return (
    <>
      <h1>Responses</h1>
      <div className="admin-card table-wrap">
        <div className="table-head">
          <h2>{replied.length} repl{replied.length === 1 ? 'y' : 'ies'} · {attending.reduce((n, g) => n + g.rsvp!.attending_count, 0)} attending</h2>
          <a className="btn" href="/api/admin/export">Export CSV</a>
        </div>
        <table>
          <thead><tr><th>Guest</th><th>Reply</th><th>Attendees</th><th>Dietary</th><th>Message</th><th>When</th></tr></thead>
          <tbody>
            {replied.length === 0 && <tr><td colSpan={6} className="hint">No responses yet.</td></tr>}
            {replied.map((g) => (
              <tr key={g.id}>
                <td>{g.full_name}</td>
                <td><span className={`pill ${g.rsvp!.attending ? 'accepted' : 'declined'}`}>{g.rsvp!.attending ? `Attending (${g.rsvp!.attending_count})` : 'Declined'}</span></td>
                <td>{g.rsvp!.attendees.join(', ') || '—'}</td>
                <td>{g.rsvp!.dietary_requirements || '—'}</td>
                <td>{g.rsvp!.message || '—'}</td>
                <td>{new Date(g.rsvp!.updated_at).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
