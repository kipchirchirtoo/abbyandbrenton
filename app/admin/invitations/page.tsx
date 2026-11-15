import { requireAdminPage } from '@/lib/admin-auth';
import { getAdminGuests } from '@/lib/admin-data';
import BulkSend from './BulkSend';

export const dynamic = 'force-dynamic';

export default async function InvitationsPage() {
  await requireAdminPage();
  const guests = await getAdminGuests();
  const unsent = guests.filter((g) => g.invitation_status === 'pending');
  const sent = guests.filter((g) => g.email_sent_at);

  return (
    <>
      <h1>Invitations</h1>
      <div className="admin-card">
        <h2>Send to everyone not yet invited</h2>
        <p className="hint">
          {unsent.length} guest{unsent.length === 1 ? '' : 's'} have not been emailed. Each gets a unique, personal link.
          Sending to a guest again issues a new link and disables the previous one.
        </p>
        <BulkSend ids={unsent.map((g) => g.id)} />
      </div>
      <div className="admin-card table-wrap">
        <h2>Email history</h2>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Last sent</th><th>Status</th></tr></thead>
          <tbody>
            {sent.length === 0 && <tr><td colSpan={4} className="hint">No invitations sent yet.</td></tr>}
            {sent.map((g) => (
              <tr key={g.id}>
                <td>{g.full_name}</td>
                <td>{g.email}</td>
                <td>{new Date(g.email_sent_at!).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' })}</td>
                <td><span className={`pill ${g.invitation_status}`}>{g.invitation_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">Delivery and bounce tracking requires Resend webhooks, which are not yet connected. Check the Resend dashboard for bounces.</p>
      </div>
    </>
  );
}
