import { requireAdminPage } from '@/lib/admin-auth';
import { getAllResponses } from '@/lib/rsvp/store';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';

/** A printable check-in list for the wedding team: one block per invitation, a box beside every person. */
export default async function PrintList() {
  await requireAdminPage();
  let all: Awaited<ReturnType<typeof getAllResponses>>;
  try {
    all = await getAllResponses();
  } catch {
    return <p className="form-error" role="alert">The database could not be reached, so the list cannot be printed.</p>;
  }
  const groups = all.filter((r) => r.attending).sort((a, b) => a.fullName.localeCompare(b.fullName));
  const total = groups.reduce((n, g) => n + g.guests.length, 0);

  return (
    <div className="print-list">
      <div className="no-print">
        <h1>Check-in list</h1>
        <PrintButton />
      </div>
      <h1 className="print-only">Abigael &amp; Brenton · Check-in list</h1>
      <p className="hint">{groups.length} invitations · {total} guests · Friday 15 January 2027 · Sultan Palace</p>
      <table>
        <thead><tr><th style={{ width: 28 }}></th><th>Guest</th><th>Invitation</th><th>Phone</th><th>Stay</th></tr></thead>
        <tbody>
          {groups.map((g) =>
            g.guests.map((p, i) => (
              <tr key={p.id} className={i === 0 ? 'group-start' : ''}>
                <td className="box">{p.checkedInAt ? '☑' : '☐'}</td>
                <td>{p.fullName}{p.category === 'child' ? ' (child)' : ''}</td>
                <td>{i === 0 ? <><b>{g.reference}</b><br /><small>{g.guests.length} in group</small></> : ''}</td>
                <td>{i === 0 ? g.whatsapp : ''}</td>
                <td>{i === 0 && g.stay ? `${g.stay.roomName} ×${g.stay.units} (${g.stay.status})` : ''}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
